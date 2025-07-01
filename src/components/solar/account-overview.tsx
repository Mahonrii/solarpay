
import type { ClientData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addYears, isEqual, parseISO } from 'date-fns';
import { Edit3, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface AccountOverviewProps {
  clientData: ClientData;
  currentPrincipalRemaining?: number; // Changed from initialLoanAmount
  isAdmin: boolean;
  onStartDateChange?: (newDate: Date) => Promise<void> | void;
}

export function AccountOverview({ clientData, currentPrincipalRemaining, isAdmin, onStartDateChange }: AccountOverviewProps) {
  const {
    name,
    address,
    solarType,
    totalAmount,
    downPayment,
    paymentTermMonths,
    monthlyPayment,
    penaltyRate,
  } = clientData;

  const getStartDateAsDate = (dateInput: string | Date | undefined): Date | undefined => {
    if (!dateInput) return undefined;
    if (dateInput instanceof Date) return dateInput;
    try {
      return parseISO(dateInput);
    } catch {
      return new Date(dateInput);
    }
  };
  
  const [pickerStartDate, setPickerStartDate] = useState<Date | undefined>(getStartDateAsDate(clientData.startDate));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  useEffect(() => {
    const currentStartDateAsDate = getStartDateAsDate(clientData.startDate);
    if (!pickerStartDate || (currentStartDateAsDate && !isEqual(currentStartDateAsDate, pickerStartDate))) {
        setPickerStartDate(currentStartDateAsDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientData.startDate]);


  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const handleUpdateStartDate = async () => {
    const currentStartDateAsDate = getStartDateAsDate(clientData.startDate);
    if (pickerStartDate && onStartDateChange && (!currentStartDateAsDate || !isEqual(pickerStartDate, currentStartDateAsDate))) {
      setIsUpdatingDate(true);
      try {
        await onStartDateChange(pickerStartDate);
        setIsDatePickerOpen(false);
      } catch (error) {
        console.error("Error updating start date from AccountOverview:", error);
      } finally {
        setIsUpdatingDate(false);
      }
    } else if (pickerStartDate && currentStartDateAsDate && isEqual(pickerStartDate, currentStartDateAsDate)) {
        setIsDatePickerOpen(false);
    }
  };

  const displayStartDate = getStartDateAsDate(clientData.startDate);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary">Account Overview {isAdmin && clientData.id ? '(ID: ' + clientData.id + ')' : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Client Name</h3>
            <p className="text-lg">{name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
            <p className="text-lg">{address}</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Solar System Type</h3>
            <p className="text-lg">{solarType}</p>
          </div>
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Start Date</h3>
                <p className="text-lg">{displayStartDate ? format(displayStartDate, 'MMMM dd, yyyy') : 'N/A'}</p>
              </div>
              {isAdmin && onStartDateChange && (
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto" disabled={isUpdatingDate}>
                      {isUpdatingDate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                      Edit Date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <UICalendar
                      mode="single"
                      selected={pickerStartDate}
                      onSelect={setPickerStartDate}
                      initialFocus
                      disabled={(date) => date < new Date("1900-01-01") || date > addYears(new Date(), 10) || isUpdatingDate}
                    />
                    <div className="p-2 border-t border-border">
                       <Button
                        onClick={handleUpdateStartDate}
                        disabled={!pickerStartDate || (displayStartDate && isEqual(pickerStartDate, displayStartDate)) || isUpdatingDate}
                        className="w-full"
                        size="sm"
                       >
                         {isUpdatingDate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Start Date"}
                       </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
             {isAdmin && onStartDateChange && pickerStartDate === undefined && (
                <p className="text-xs text-destructive mt-1">Please select a valid date.</p>
            )}
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Amount</h3>
            <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Downpayment</h3>
            <p className="text-lg font-semibold">{formatCurrency(downPayment)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Remaining Loan Balance</h3>
            <p className="text-lg font-semibold">
              {typeof currentPrincipalRemaining === 'number' ? formatCurrency(currentPrincipalRemaining) : 'N/A'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Payment Term</h3>
            <p className="text-lg">{paymentTermMonths} months</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Base Monthly Payment</h3>
            <p className="text-lg">{formatCurrency(monthlyPayment)}</p>
          </div>
           <div>
            <h3 className="text-sm font-medium text-muted-foreground">Penalty Rate</h3>
            <p className="text-lg">{(penaltyRate * 100).toFixed(0)}% per overdue installment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
