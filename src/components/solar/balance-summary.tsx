import type { AccountSummary } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lightbulb } from 'lucide-react';
import { format } from 'date-fns';

interface BalanceSummaryProps {
  summary: AccountSummary;
  aiAdvice: string | null;
  currencyFormatter: (amount: number) => string;
  totalInstallments: number;
}

export function BalanceSummary({ summary, aiAdvice, currencyFormatter, totalInstallments }: BalanceSummaryProps) {
  const {
    initialLoanAmount,
    principalRemaining,
    principalPaid,
    penaltiesIncurred,
    nextDueDate,
    nextPaymentAmount,
    paymentsMade,
  } = summary;

  const progressPercentage = initialLoanAmount > 0 ? (principalPaid / initialLoanAmount) * 100 : 0;

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary">Balance & Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Principal Remaining</h3>
            <p className="text-2xl font-bold text-primary">{currencyFormatter(principalRemaining)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Principal Paid</h3>
            <p className="text-xl font-semibold">{currencyFormatter(principalPaid)}</p>
          </div>
           <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Penalties Incurred</h3>
            <p className={`text-xl font-semibold ${penaltiesIncurred > 0 ? 'text-destructive' : ''}`}>{currencyFormatter(penaltiesIncurred)}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Payment Progress ({paymentsMade}/{totalInstallments} installments paid)</h3>
          <Progress value={progressPercentage} aria-label={`${progressPercentage.toFixed(0)}% of loan paid`} className="h-3" />
          <div className="flex justify-between text-xs mt-1">
            <span>{currencyFormatter(0)}</span>
            <span>{currencyFormatter(initialLoanAmount)}</span>
          </div>
        </div>
        
        {nextDueDate && nextPaymentAmount !== undefined && principalRemaining > 0 && (
           <div>
            <h3 className="text-sm font-medium text-muted-foreground">Next Payment</h3>
            <p className="text-lg">
              <span className="font-semibold">{currencyFormatter(nextPaymentAmount)}</span> due on{' '}
              <span className="font-semibold">{format(nextDueDate, 'MMMM dd, yyyy')}</span>
            </p>
          </div>
        )}

        {aiAdvice && (
          <Card className="bg-accent/10 border-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-accent-foreground">
                <Lightbulb className="mr-2 h-5 w-5 text-accent" /> Payment Flexibility Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-accent-foreground/90">{aiAdvice}</p>
            </CardContent>
          </Card>
        )}
         {principalRemaining <= 0 && (
          <div className="text-center py-4">
            <p className="text-xl font-semibold text-green-600">Congratulations! Your loan is fully paid.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
