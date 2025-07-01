
export interface ClientData {
  id: string;
  name: string;
  address: string;
  solarType: string;
  totalAmount: number;
  downPayment: number;
  paymentTermMonths: number;
  monthlyPayment: number;
  startDate: Date;
  penaltyRate: number;
  paymentOverrides: Record<number, { status: 'Paid'; paymentDate?: Date }>;
}

export interface Payment {
  id: string;
  installmentNumber: number;
  dueDate: Date;
  baseAmount: number;
  penalty: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  paymentDate?: Date;
  notes?: string;
}

export interface AccountSummary {
  initialLoanAmount: number;
  principalPaid: number;
  principalRemaining: number;
  penaltiesIncurred: number;
  penaltiesPaid: number; // This might still be simplified in calculations
  totalPaid: number;
  nextDueDate?: Date;
  nextPaymentAmount?: number;
  paymentsMade: number;
  paymentsRemaining: number;
}
