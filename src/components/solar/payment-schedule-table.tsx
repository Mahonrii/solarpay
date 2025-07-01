
'use client';

import type { Payment } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, RotateCcwIcon } from 'lucide-react'; // Added RotateCcwIcon
import { format, isPast } from 'date-fns';

interface PaymentScheduleTableProps {
  payments: Payment[];
  onMarkAsPaid: (paymentId: string) => void;
  onMarkAsUnpaid: (paymentId: string) => void; // New prop
  currencyFormatter: (amount: number) => string;
  isActionable: boolean;
}

export function PaymentScheduleTable({
  payments,
  onMarkAsPaid,
  onMarkAsUnpaid, // Destructure new prop
  currencyFormatter,
  isActionable,
}: PaymentScheduleTableProps) {

  const getStatusBadge = (status: Payment['status'], dueDate: Date) => {
    const isFuture = !isPast(dueDate) && status !== 'Paid';
    switch (status) {
      case 'Paid':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="mr-1 h-4 w-4" /> Paid
          </Badge>
        );
      case 'Overdue':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
            <AlertCircle className="mr-1 h-4 w-4" /> Overdue
          </Badge>
        );
      case 'Pending':
        if (isFuture) {
           return (
            <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50">
              <Clock className="mr-1 h-4 w-4" /> Upcoming
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="border-orange-400 text-orange-700 bg-orange-50">
            <Clock className="mr-1 h-4 w-4" /> Awaiting Payment
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm mt-6">
      <div className="p-6">
         <h2 className="text-2xl font-semibold text-primary mb-4">Payment Schedule</h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] whitespace-nowrap">Installment</TableHead>
              <TableHead className="whitespace-nowrap">Due Date</TableHead>
              <TableHead className="text-right whitespace-nowrap">Monthly Payment</TableHead>
              <TableHead className="text-right whitespace-nowrap">Penalty</TableHead>
              <TableHead className="text-right whitespace-nowrap">Total Due</TableHead>
              <TableHead>Status</TableHead>
              {isActionable && <TableHead className="text-center">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} className={payment.status === 'Overdue' ? 'bg-destructive/5 dark:bg-red-900/10' : payment.status === 'Paid' ? 'bg-green-500/5 dark:bg-green-900/10' : ''}>
                <TableCell>{payment.installmentNumber}</TableCell>
                <TableCell>{format(payment.dueDate, 'MMM dd, yyyy')}</TableCell>
                <TableCell className="text-right">{currencyFormatter(payment.baseAmount)}</TableCell>
                <TableCell className={`text-right ${payment.penalty > 0 ? 'text-destructive font-semibold' : ''}`}>
                  {currencyFormatter(payment.penalty)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {currencyFormatter(payment.baseAmount + payment.penalty)}
                </TableCell>
                <TableCell>{getStatusBadge(payment.status, payment.dueDate)}</TableCell>
                {isActionable && (
                  <TableCell className="text-center">
                    {payment.status === 'Paid' ? (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground flex items-center justify-center whitespace-nowrap">
                           <CheckCircle className="mr-1 h-4 w-4 text-green-600" /> Paid {payment.paymentDate ? format(payment.paymentDate, 'MMM dd, yy') : ''}
                        </span>
                        <Button
                          onClick={() => onMarkAsUnpaid(payment.id)}
                          size="sm"
                          variant="outline"
                          className="border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                          aria-label={`Mark installment ${payment.installmentNumber} as unpaid`}
                        >
                          <RotateCcwIcon className="mr-2 h-4 w-4" /> Unpay
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => onMarkAsPaid(payment.id)}
                        size="sm"
                        variant="default"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        aria-label={`Mark installment ${payment.installmentNumber} as paid`}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
             {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={isActionable ? 7 : 6} className="text-center text-muted-foreground py-8">
                  No payment schedule available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
