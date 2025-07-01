
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { ClientData, Payment } from '@/lib/types';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';

interface AcknowledgementReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  client?: ClientData;
  payment?: Payment;
}

const currencyFormatter = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

export function AcknowledgementReceipt({ isOpen, onClose, client, payment }: AcknowledgementReceiptProps) {
  if (!isOpen || !client || !payment) {
    return null;
  }

  const handlePrint = () => {
    // We use a little trick to print just the receipt content
    const printContents = document.getElementById('receipt-content')?.innerHTML;
    const originalContents = document.body.innerHTML;
    if (printContents) {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      // We need to re-attach our app to the DOM, a simple reload is easiest
      window.location.reload(); 
    }
  };

  const amountPaid = payment.baseAmount;
  const penaltyPaid = payment.penalty > 0 ? payment.penalty : 0;
  const totalAmountPaid = amountPaid + penaltyPaid;
  const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div id="receipt-content">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-center text-2xl font-bold tracking-widest text-primary">SOLAR MASTER</DialogTitle>
            <p className="text-center text-sm text-muted-foreground">ACKNOWLEDGEMENT RECEIPT</p>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date Paid:</span>
                <span className="font-medium">{format(paymentDate, 'MMMM dd, yyyy - hh:mm a')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client Name:</span>
                <span className="font-medium">{client.name}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium text-right max-w-[70%]">{client.address}</span>
              </div>
            </div>
            
            <div className="border-t border-dashed my-2"></div>

            <div className="space-y-1 text-sm">
              <p className="font-medium text-center mb-2">Payment for Installment #{payment.installmentNumber}</p>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-mono">{currencyFormatter(amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span>Penalty:</span>
                <span className="font-mono">{currencyFormatter(penaltyPaid)}</span>
              </div>
            </div>

            <div className="border-t-2 border-primary pt-2 mt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL PAID:</span>
                <span className="font-mono">{currencyFormatter(totalAmountPaid)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-4">
              Note: This is a computer-generated receipt and does not require a signature. Thank you for your payment!
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button type="button" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
