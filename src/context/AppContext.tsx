import { createContext, useContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';
import type { Project, User, Expense, ExpenseShare, AppData } from '../types';

interface AppState {
  projects: Project[];
  activeProjectId: string | null;
}

type Action =
  | { type: 'SET_DATA'; payload: AppData }
  | { type: 'CREATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SELECT_PROJECT'; payload: string | null }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'REMOVE_EXPENSE'; payload: string }
  | { type: 'UPDATE_PROJECT_NAME'; payload: string }
  | { type: 'SET_DEFAULT_CURRENCY'; payload: string };

const initialState: AppState = {
  projects: [],
  activeProjectId: null,
};

function updateActiveProject(state: AppState, updater: (project: Project) => Project): AppState {
  if (!state.activeProjectId) return state;

  return {
    ...state,
    projects: state.projects.map((p) =>
      p.id === state.activeProjectId ? updater(p) : p
    ),
  };
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DATA':
      return {
        projects: action.payload.projects,
        activeProjectId: action.payload.activeProjectId,
      };

    case 'CREATE_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.payload],
        activeProjectId: action.payload.id,
      };

    case 'DELETE_PROJECT': {
      const newProjects = state.projects.filter((p) => p.id !== action.payload);
      return {
        ...state,
        projects: newProjects,
        activeProjectId: state.activeProjectId === action.payload ? null : state.activeProjectId,
      };
    }

    case 'SELECT_PROJECT':
      return {
        ...state,
        activeProjectId: action.payload,
      };

    case 'ADD_USER':
      return updateActiveProject(state, (project) => ({
        ...project,
        users: [...project.users, action.payload],
      }));

    case 'REMOVE_USER':
      return updateActiveProject(state, (project) => ({
        ...project,
        users: project.users.filter((u) => u.id !== action.payload),
        expenses: project.expenses.filter((e) => e.paidBy !== action.payload),
      }));

    case 'ADD_EXPENSE':
      return updateActiveProject(state, (project) => ({
        ...project,
        expenses: [...project.expenses, action.payload],
      }));

    case 'REMOVE_EXPENSE':
      return updateActiveProject(state, (project) => ({
        ...project,
        expenses: project.expenses.filter((e) => e.id !== action.payload),
      }));

    case 'UPDATE_PROJECT_NAME':
      return updateActiveProject(state, (project) => ({
        ...project,
        name: action.payload,
      }));

    case 'SET_DEFAULT_CURRENCY':
      return updateActiveProject(state, (project) => ({
        ...project,
        defaultCurrency: action.payload,
      }));

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<Action>;
  activeProject: Project | null;
  createProject: (name: string) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;
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

function migrateOldData(): AppState | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);

    if (parsed.projects && Array.isArray(parsed.projects)) {
      return {
        projects: parsed.projects,
        activeProjectId: parsed.activeProjectId || null,
      };
    }

    if (parsed.id && parsed.name && parsed.users) {
      const migratedProject: Project = {
        id: parsed.id,
        name: parsed.name,
        users: parsed.users || [],
        expenses: parsed.expenses || [],
        defaultCurrency: parsed.defaultCurrency || 'EUR',
      };
      return {
        projects: [migratedProject],
        activeProjectId: null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, () => {
    const migrated = migrateOldData();
    return migrated || initialState;
  });

  useEffect(() => {
    const dataToSave: AppData = {
      projects: state.projects,
      activeProjectId: state.activeProjectId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [state]);

  const activeProject = state.activeProjectId
    ? state.projects.find((p) => p.id === state.activeProjectId) || null
    : null;

  const createProject = (name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      users: [],
      expenses: [],
      defaultCurrency: 'EUR',
    };
    dispatch({ type: 'CREATE_PROJECT', payload: newProject });
  };

  const deleteProject = (id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  };

  const selectProject = (id: string | null) => {
    dispatch({ type: 'SELECT_PROJECT', payload: id });
  };

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
    return activeProject?.users.find((u: User) => u.id === id);
  };

  const getTotalExpenses = () => {
    if (!activeProject) return 0;
    return activeProject.expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  };

  const getUserBalance = (userId: string) => {
    if (!activeProject) return { paid: 0, owes: 0, balance: 0 };

    const paid = activeProject.expenses
      .filter((e: Expense) => e.paidBy === userId)
      .reduce((sum: number, e: Expense) => sum + e.amount, 0);

    const owes = activeProject.expenses.reduce((sum: number, e: Expense) => {
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

    if (!activeProject) return byMonth;

    activeProject.expenses.forEach((expense: Expense) => {
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
        activeProject,
        createProject,
        deleteProject,
        selectProject,
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
