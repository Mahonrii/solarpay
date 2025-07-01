
'use client';

import type { ClientData, Payment, AccountSummary } from '@/lib/types';
import { AccountOverview } from '@/components/solar/account-overview';
import { PaymentScheduleTable } from '@/components/solar/payment-schedule-table';
import { BalanceSummary } from '@/components/solar/balance-summary';
import { AcknowledgementReceipt } from '@/components/solar/acknowledgement-receipt';
import { useToast } from "@/hooks/use-toast";
import { getPaymentAdvice } from '@/lib/payment-advisor';
import React, { useState, useEffect, useCallback } from 'react';
import { addMonths, isPast, format as formatDate, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


const currencyFormatter = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

interface SolarDashboardContentProps {
  initialClientData: ClientData | null;
  isAdmin: boolean;
  onClientDataSave?: (updatedClient: ClientData) => Promise<void> | void; 
}

export function SolarDashboardContent({ initialClientData, isAdmin, onClientDataSave }: SolarDashboardContentProps) {
  const [currentClientData, setCurrentClientData] = useState<ClientData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); 
  const [isUpdatingStartDate, setIsUpdatingStartDate] = useState(false); 
  const { toast } = useToast();

  const [paymentToConfirm, setPaymentToConfirm] = useState<Payment | null>(null);
  const [receiptData, setReceiptData] = useState<{ client: ClientData; payment: Payment } | null>(null);


  const parseClientDataForComponent = useCallback((client: ClientData | null): ClientData | null => {
    if (!client) return null;
    
    const startDateInput = client.startDate;
    let startDate: Date;
    if (startDateInput instanceof Date) {
        startDate = startDateInput;
    } else if (typeof startDateInput === 'string') {
        startDate = parseISO(startDateInput);
    } else {
        // Fallback or error handling if startDate is not a string or Date
        // For now, let's assume it will be one of these based on type
        console.error("Invalid startDate type in client data:", startDateInput);
        startDate = new Date(); // Or throw error
    }

    const paymentOverrides = client.paymentOverrides ? Object.entries(client.paymentOverrides).reduce((acc, [key, value]) => {
      let paymentDateValue: Date | undefined = undefined;
      if (value.paymentDate) {
        if (value.paymentDate instanceof Date) {
            paymentDateValue = value.paymentDate;
        } else if (typeof value.paymentDate === 'string') {
            paymentDateValue = parseISO(value.paymentDate);
        }
      }
      acc[Number(key)] = {
        ...value,
        paymentDate: paymentDateValue,
      };
      return acc;
    }, {} as Record<number, { status: 'Paid'; paymentDate?: Date }>) : {};
    
    return {
      ...client,
      startDate,
      paymentOverrides,
    };
  }, []);

  useEffect(() => {
    setIsLoadingData(true);
    const parsedData = parseClientDataForComponent(initialClientData);
    setCurrentClientData(parsedData);
    setPayments([]);
    setAccountSummary(null);
    setAiAdvice(null);
    setIsLoadingData(false); 
  }, [initialClientData, parseClientDataForComponent]);


  const initialLoanAmount = currentClientData ? currentClientData.totalAmount - currentClientData.downPayment : 0;

  const generateInitialPayments = useCallback((): Payment[] => {
    if (!currentClientData || !(currentClientData.startDate instanceof Date) || isNaN(currentClientData.startDate.getTime())) {
      return [];
    }
    const newPayments: Payment[] = [];
    const overrides = currentClientData.paymentOverrides || {};

    for (let i = 0; i < currentClientData.paymentTermMonths; i++) {
      const installmentNumber = i + 1;
      const paymentId = 'payment-' + currentClientData.id + '-' + installmentNumber + '-' + (currentClientData.startDate as Date).getTime();
      const override = overrides[installmentNumber];

      let paymentDateValue: Date | undefined = undefined;
      if (override?.status === 'Paid' && override.paymentDate) {
        if (override.paymentDate instanceof Date) {
          paymentDateValue = override.paymentDate;
        } else if (typeof override.paymentDate === 'string') {
          paymentDateValue = parseISO(override.paymentDate);
        }
      }

      newPayments.push({
        id: paymentId,
        installmentNumber: installmentNumber,
        dueDate: addMonths(currentClientData.startDate as Date, i),
        baseAmount: currentClientData.monthlyPayment,
        penalty: 0,
        status: override?.status === 'Paid' ? 'Paid' : 'Pending',
        paymentDate: paymentDateValue,
      });
    }
    return newPayments;
  }, [currentClientData]);

  const updatePaymentStatusesAndPenalties = useCallback((currentPayments: Payment[]): { updatedPayments: Payment[], collectedToasts: Array<{ title: string, description: string, variant?: "destructive" | "default" }> } => {
    if (!currentClientData || !(currentClientData.startDate instanceof Date) || isNaN(currentClientData.startDate.getTime())) return { updatedPayments: currentPayments, collectedToasts: [] };
    
    const collectedToasts: Array<{ title: string, description: string, variant?: "destructive" | "default" }> = [];

    const updatedPs = currentPayments.map(p => {
      if (p.status === 'Paid') return p;

      const override = currentClientData.paymentOverrides?.[p.installmentNumber];
      if (override?.status === 'Paid') {
        let paymentDateValue: Date | undefined = undefined;
        if (override.paymentDate) {
            if (override.paymentDate instanceof Date) {
                paymentDateValue = override.paymentDate;
            } else if (typeof override.paymentDate === 'string') {
                paymentDateValue = parseISO(override.paymentDate);
            }
        }
        return {
          ...p,
          status: 'Paid' as 'Paid',
          paymentDate: paymentDateValue || new Date(),
          penalty: 0,
        };
      }

      let newStatus = p.status;
      let newPenalty = p.penalty;
      const wasPending = p.status === 'Pending';

      if (isPast(p.dueDate)) {
        newStatus = 'Overdue';
        if (wasPending) {
            newPenalty = p.baseAmount * currentClientData.penaltyRate;
            if (isAdmin) {
                collectedToasts.push({
                    title: "Payment Overdue",
                    description: 'Installment ' + p.installmentNumber + ' for client ' + currentClientData.name + ' (ID: ' + currentClientData.id + ') due on ' + p.dueDate.toLocaleDateString() + ' is now overdue. Penalty applied.',
                    variant: "destructive",
                });
            }
        } else if (newStatus === 'Overdue' && newPenalty === 0 && currentClientData.penaltyRate > 0) {
             newPenalty = p.baseAmount * currentClientData.penaltyRate;
        }
      } else {
        newStatus = 'Pending';
        newPenalty = 0;
      }
      return { ...p, status: newStatus, penalty: newPenalty };
    });

    return { updatedPayments: updatedPs, collectedToasts };
  }, [currentClientData, isAdmin]);


  const calculateAccountSummary = useCallback((currentPayments: Payment[]): AccountSummary | null => {
    if (!currentClientData) return null;

    let principalPaid = 0;
    let penaltiesIncurred = 0;
    let paymentsMadeCount = 0;

    currentPayments.forEach(p => {
      if (p.status === 'Paid') {
        principalPaid += p.baseAmount;
        paymentsMadeCount++;
      } else if (p.status === 'Overdue') {
        penaltiesIncurred += p.penalty;
      }
    });

    const loanAmt = currentClientData.totalAmount - currentClientData.downPayment;
    const principalRemaining = Math.max(0, loanAmt - principalPaid);
    const upcomingPayments = currentPayments
        .filter(p => p.status === 'Pending' || p.status === 'Overdue')
        .sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime());
    const nextPayment = upcomingPayments[0];

    return {
      initialLoanAmount: loanAmt,
      principalPaid,
      principalRemaining,
      penaltiesIncurred,
      penaltiesPaid: 0, 
      totalPaid: principalPaid, 
      nextDueDate: nextPayment?.dueDate,
      nextPaymentAmount: nextPayment ? nextPayment.baseAmount + nextPayment.penalty : undefined,
      paymentsMade: paymentsMadeCount,
      paymentsRemaining: currentClientData.paymentTermMonths - paymentsMadeCount,
    };
  }, [currentClientData]);


  useEffect(() => {
    if (currentClientData && !isLoadingData && !(currentClientData.startDate instanceof Date && isNaN(currentClientData.startDate.getTime()))) {
      setIsLoadingData(true); 
      let newPayments = generateInitialPayments();
      const { updatedPayments, collectedToasts } = updatePaymentStatusesAndPenalties(newPayments);
      
      // Batch toast calls after state updates
      Promise.resolve().then(() => {
        collectedToasts.forEach(toastInfo => toast(toastInfo));
      });
      
      setPayments(updatedPayments);
      setIsLoadingData(false); 
    } else if (!currentClientData) {
      setPayments([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClientData, generateInitialPayments, updatePaymentStatusesAndPenalties]);


  useEffect(() => {
    if (isLoadingData || !currentClientData || (currentClientData.startDate instanceof Date && isNaN(currentClientData.startDate.getTime()))) {
      setAccountSummary(null);
      setAiAdvice(null);
      return;
    }
    if (payments.length === 0 && initialLoanAmount > 0 && currentClientData.paymentTermMonths > 0) {
        return;
    }
     if (payments.length === 0 && (initialLoanAmount <= 0 || currentClientData.paymentTermMonths === 0) ) {
         setAccountSummary({
            initialLoanAmount: 0, principalPaid: 0, principalRemaining: 0,
            penaltiesIncurred: 0, penaltiesPaid: 0, totalPaid: 0,
            paymentsMade: 0, paymentsRemaining: 0,
        });
        setAiAdvice("No payment plan active or loan is fully cleared.");
        return;
    }

    const summary = calculateAccountSummary(payments);
    setAccountSummary(summary);

    if (summary && summary.principalRemaining !== undefined) {
      const overduePayments = payments.filter(p => p.status === 'Overdue');
      getPaymentAdvice(summary.principalRemaining, overduePayments.length, summary.penaltiesIncurred)
        .then(newAdvice => setAiAdvice(newAdvice))
        .catch(err => {
            console.error("Error fetching AI advice:", err);
            setAiAdvice("Could not load payment advice at this time.");
        });
    }
  }, [payments, calculateAccountSummary, currentClientData, initialLoanAmount, isLoadingData]);

  const handleMarkAsPaidRequest = (paymentId: string) => {
    if (!isAdmin) return;
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setPaymentToConfirm(payment);
    }
  };

  const executeMarkAsPaid = async (generateReceipt: boolean) => {
    if (!isAdmin || !currentClientData || !onClientDataSave || !paymentToConfirm) {
      return;
    }

    const paymentToProcess = paymentToConfirm;
    setPaymentToConfirm(null); // Close confirmation dialog
    setIsProcessingPayment(true);

    const paymentDataForStorage = {
      status: 'Paid' as 'Paid',
      paymentDate: new Date(),
    };

    const updatedClientDataWithOverrides = {
      ...currentClientData,
      paymentOverrides: {
        ...(currentClientData.paymentOverrides || {}),
        [paymentToProcess.installmentNumber]: {
          status: paymentDataForStorage.status,
          paymentDate: paymentDataForStorage.paymentDate.toISOString(),
        },
      },
    };
    
    try {
      await onClientDataSave(updatedClientDataWithOverrides);

      const updatedLocalPayments = payments.map(p => {
        if (p.id === paymentToProcess.id) {
          return { ...p, status: 'Paid' as 'Paid', paymentDate: paymentDataForStorage.paymentDate, penalty: 0 };
        }
        return p;
      });
      setPayments(updatedLocalPayments);

      toast({
        title: "Payment Marked as Paid",
        description: `Installment ${paymentToProcess.installmentNumber} for ${currentClientData.name} marked as paid.`,
      });

      if (generateReceipt) {
        const receiptPaymentObject = {
          ...paymentToProcess, // This carries over the original penalty for receipt display
          status: 'Paid' as 'Paid',
          paymentDate: paymentDataForStorage.paymentDate,
        };
        setReceiptData({ client: currentClientData, payment: receiptPaymentObject });
      }
    } catch (error) {
      console.error("Failed to save paid status:", error);
      toast({ title: "Error", description: "Failed to save payment status.", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };


  const handleMarkAsUnpaid = useCallback(async (paymentId: string) => {
    if (!isAdmin || !currentClientData || !onClientDataSave) return;
    setIsProcessingPayment(true);

    let paymentReverted: Payment | undefined;
    let toastDetailsFromReversion: { title: string, description: string, variant?: "default" | "destructive" } | null = null;
    let finalPaymentsAfterReversion: Payment[] = [];
    let collectedToastsForUnpay: Array<{ title: string, description: string, variant?: "destructive" | "default" }> = [];


    const paymentToRevertGlobal = payments.find(p => p.id === paymentId);
    if (!paymentToRevertGlobal || paymentToRevertGlobal.status !== 'Paid') {
      setIsProcessingPayment(false); return;
    }

    let intermediatePayments = payments.map(p => {
      if (p.id === paymentId && p.status === 'Paid') {
        let newStatus: Payment['status'] = 'Pending';
        let newPenaltyValue = 0;

        if (isPast(p.dueDate)) {
          newStatus = 'Overdue';
          newPenaltyValue = p.baseAmount * currentClientData.penaltyRate;
        }
        paymentReverted = { ...p, status: newStatus, penalty: newPenaltyValue, paymentDate: undefined };
        return paymentReverted;
      }
      return p;
    });
    
    const { updatedPayments: recalculatedPayments, collectedToasts } = updatePaymentStatusesAndPenalties(intermediatePayments);
    finalPaymentsAfterReversion = recalculatedPayments;
    collectedToastsForUnpay = collectedToasts;


    if (paymentReverted) {
      const updatedClientDataWithoutOverride = { ...currentClientData };
      if (updatedClientDataWithoutOverride.paymentOverrides) {
          delete updatedClientDataWithoutOverride.paymentOverrides[paymentReverted.installmentNumber];
      }
      try {
        await onClientDataSave(updatedClientDataWithoutOverride);
        setCurrentClientData(parseClientDataForComponent(updatedClientDataWithoutOverride)); // important to re-parse
        setPayments(finalPaymentsAfterReversion); // Update local payments AFTER save
        let description = 'Installment ' + paymentReverted.installmentNumber + ' for ' + currentClientData.name + ' is now ' + paymentReverted.status + '.';
        if (paymentReverted.status === 'Overdue') {
            description += ' Penalty ' + currencyFormatter(paymentReverted.penalty) + ' applied.';
        }
         toastDetailsFromReversion = {
            title: "Payment Reverted",
            description: description,
        };
      } catch (error) {
         console.error("Failed to save unpaid status:", error);
         toastDetailsFromReversion = { title: "Error", description: "Failed to save payment status.", variant: "destructive"};
      }
    }
    setIsProcessingPayment(false);

    Promise.resolve().then(() => {
        collectedToastsForUnpay.forEach(toastInfo => toast(toastInfo));
        if (toastDetailsFromReversion) toast(toastDetailsFromReversion);
    });

  }, [isAdmin, currentClientData, onClientDataSave, payments, updatePaymentStatusesAndPenalties, parseClientDataForComponent, toast]);

  const handleStartDateChange = async (newStartDate: Date) => {
    if (!isAdmin || !currentClientData || !onClientDataSave) return;
    setIsUpdatingStartDate(true);

    const clientNameForToast = currentClientData.name; 
    let toastMessage: { title: string, description: string, variant?: "default" | "destructive" } = {
        title: "Start Date Updated",
        description: 'Payment schedule for ' + clientNameForToast + ' recalculated for start date: ' + formatDate(newStartDate, 'MMMM dd, yyyy') + '. Paid statuses reset.',
    };

    const updatedClient = {
        ...currentClientData,
        startDate: newStartDate, 
        paymentOverrides: {}, 
    };
    try {
        await onClientDataSave(updatedClient);
        // Important: Re-parse the updatedClient to ensure the startDate and overrides are correctly formatted
        // before setting it to state, which then triggers payment regeneration.
        setCurrentClientData(parseClientDataForComponent(updatedClient)); 
    } catch (error) {
        console.error("Failed to update start date:", error);
        toastMessage = { title: "Error", description: "Failed to update start date.", variant: "destructive"};
    } finally {
        setIsUpdatingStartDate(false);
        Promise.resolve().then(() => toast(toastMessage));
    }
  };


  if (!currentClientData && !isLoadingData) { 
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <main className="container mx-auto p-4 md:p-8">
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {isAdmin ? "No client selected or client data is unavailable." : "Please enter a client ID to view the statement, or the client data could not be loaded."}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoadingData || isUpdatingStartDate || (!accountSummary && currentClientData && currentClientData.paymentTermMonths > 0 && payments.length === 0 && !isProcessingPayment)) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-center">
                {isUpdatingStartDate && currentClientData ? "Updating start date for " + currentClientData.name + "..." :
                 currentClientData ? "Loading account data for " + currentClientData.name + "..." : "Loading data..."}
            </p>
        </div>
     );
  }


  return (
    <>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <main className="container mx-auto p-4 md:p-8">
          {currentClientData && (
              <AccountOverview
              clientData={currentClientData}
              currentPrincipalRemaining={accountSummary?.principalRemaining}
              isAdmin={isAdmin}
              onStartDateChange={isAdmin && onClientDataSave ? handleStartDateChange : undefined}
              />
          )}
          <PaymentScheduleTable
            payments={payments}
            onMarkAsPaid={handleMarkAsPaidRequest}
            onMarkAsUnpaid={handleMarkAsUnpaid}
            currencyFormatter={currencyFormatter}
            isActionable={isAdmin && !isProcessingPayment && !isUpdatingStartDate && !isLoadingData}
          />
          {accountSummary && currentClientData && (
              <BalanceSummary
              summary={accountSummary}
              aiAdvice={aiAdvice}
              currencyFormatter={currencyFormatter}
              totalInstallments={currentClientData.paymentTermMonths}
              />
          )}
        </main>
        <footer className="py-6 md:px-8 md:py-0 border-t">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
              &copy; {new Date().getFullYear()} SolarPay Tracker.
            </p>
          </div>
        </footer>
      </div>

      {/* Mark as Paid Confirmation Dialog */}
      <Dialog open={!!paymentToConfirm} onOpenChange={() => setPaymentToConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Mark installment #{paymentToConfirm?.installmentNumber} as paid. Do you want to generate an acknowledgement receipt?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaymentToConfirm(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => executeMarkAsPaid(false)}>Mark Paid</Button>
            <Button onClick={() => executeMarkAsPaid(true)}>Mark Paid & Generate Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Acknowledgement Receipt Dialog */}
      <AcknowledgementReceipt
        isOpen={!!receiptData}
        onClose={() => setReceiptData(null)}
        client={receiptData?.client}
        payment={receiptData?.payment}
      />
    </>
  );
}
