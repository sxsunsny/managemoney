
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
}

export interface Budget {
  category: string;
  amount_limit: number;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
}

export interface AIInsight {
  title: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}
