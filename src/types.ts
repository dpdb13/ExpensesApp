export interface User {
  id: string;
  name: string;
}

export interface ExpenseShare {
  userId: string;
  percentage: number;
  amount: number;
}

export interface Expense {
  id: string;
  amount: number;
  title: string;
  currency: string;
  date: string;
  paidBy: string;
  shares: ExpenseShare[];
  splitType: 'equal' | 'custom';
}

export interface Project {
  id: string;
  name: string;
  users: User[];
  expenses: Expense[];
  defaultCurrency: string;
}

export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export interface AppData {
  projects: Project[];
  activeProjectId: string | null;
}

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dólar estadounidense' },
  { code: 'GBP', symbol: '£', name: 'Libra esterlina' },
  { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  { code: 'ARS', symbol: '$', name: 'Peso argentino' },
  { code: 'COP', symbol: '$', name: 'Peso colombiano' },
  { code: 'CLP', symbol: '$', name: 'Peso chileno' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
];
