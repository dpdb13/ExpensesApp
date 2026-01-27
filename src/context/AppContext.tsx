import { createContext, useContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';
import type { Project, User, Expense, ExpenseShare } from '../types';

interface AppState {
  project: Project;
}

type Action =
  | { type: 'SET_PROJECT'; payload: Project }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'REMOVE_EXPENSE'; payload: string }
  | { type: 'UPDATE_PROJECT_NAME'; payload: string }
  | { type: 'SET_DEFAULT_CURRENCY'; payload: string };

const initialProject: Project = {
  id: '1',
  name: 'Nuevo Proyecto',
  users: [],
  expenses: [],
  defaultCurrency: 'EUR',
};

const initialState: AppState = {
  project: initialProject,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.payload };
    case 'ADD_USER':
      return {
        ...state,
        project: {
          ...state.project,
          users: [...state.project.users, action.payload],
        },
      };
    case 'REMOVE_USER':
      return {
        ...state,
        project: {
          ...state.project,
          users: state.project.users.filter((u) => u.id !== action.payload),
          expenses: state.project.expenses.filter((e) => e.paidBy !== action.payload),
        },
      };
    case 'ADD_EXPENSE':
      return {
        ...state,
        project: {
          ...state.project,
          expenses: [...state.project.expenses, action.payload],
        },
      };
    case 'REMOVE_EXPENSE':
      return {
        ...state,
        project: {
          ...state.project,
          expenses: state.project.expenses.filter((e) => e.id !== action.payload),
        },
      };
    case 'UPDATE_PROJECT_NAME':
      return {
        ...state,
        project: {
          ...state.project,
          name: action.payload,
        },
      };
    case 'SET_DEFAULT_CURRENCY':
      return {
        ...state,
        project: {
          ...state.project,
          defaultCurrency: action.payload,
        },
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<Action>;
  addUser: (name: string) => void;
  removeUser: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  updateProjectName: (name: string) => void;
  setDefaultCurrency: (currency: string) => void;
  getUserById: (id: string) => User | undefined;
  getTotalExpenses: () => number;
  getUserBalance: (userId: string) => { paid: number; owes: number; balance: number };
  getExpensesByMonth: () => Map<string, Expense[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'expenses-app-data';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, (initial) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { project: parsed };
      } catch {
        return initial;
      }
    }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
  }, [state.project]);

  const addUser = (name: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
    };
    dispatch({ type: 'ADD_USER', payload: newUser });
  };

  const removeUser = (id: string) => {
    dispatch({ type: 'REMOVE_USER', payload: id });
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
    };
    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
  };

  const removeExpense = (id: string) => {
    dispatch({ type: 'REMOVE_EXPENSE', payload: id });
  };

  const updateProjectName = (name: string) => {
    dispatch({ type: 'UPDATE_PROJECT_NAME', payload: name });
  };

  const setDefaultCurrency = (currency: string) => {
    dispatch({ type: 'SET_DEFAULT_CURRENCY', payload: currency });
  };

  const getUserById = (id: string) => {
    return state.project.users.find((u: User) => u.id === id);
  };

  const getTotalExpenses = () => {
    return state.project.expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  };

  const getUserBalance = (userId: string) => {
    const paid = state.project.expenses
      .filter((e: Expense) => e.paidBy === userId)
      .reduce((sum: number, e: Expense) => sum + e.amount, 0);

    const owes = state.project.expenses.reduce((sum: number, e: Expense) => {
      const share = e.shares.find((s: ExpenseShare) => s.userId === userId);
      return sum + (share?.amount || 0);
    }, 0);

    return {
      paid,
      owes,
      balance: paid - owes,
    };
  };

  const getExpensesByMonth = () => {
    const byMonth = new Map<string, Expense[]>();

    state.project.expenses.forEach((expense: Expense) => {
      const date = new Date(expense.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!byMonth.has(key)) {
        byMonth.set(key, []);
      }
      byMonth.get(key)!.push(expense);
    });

    return new Map([...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addUser,
        removeUser,
        addExpense,
        removeExpense,
        updateProjectName,
        setDefaultCurrency,
        getUserById,
        getTotalExpenses,
        getUserBalance,
        getExpensesByMonth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
