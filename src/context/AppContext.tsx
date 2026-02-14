import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Expense, ExpenseShare } from '../types';

// Tipos para la app
interface Project {
  id: string;
  name: string;
  icon: string;
  defaultCurrency: string;
  users: User[];
  expenses: Expense[];
  inviteCode: string | null;
  isOwner: boolean;
}

interface User {
  id: string;
  name: string;
}

interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  loading: boolean;
  lastDeletedExpense: Expense | null;
}

interface AppContextType {
  state: AppState;
  activeProject: Project | null;
  createProject: (name: string, icon?: string, currency?: string, participants?: string[]) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string | null) => void;
  addUser: (name: string) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  undoDeleteExpense: () => Promise<void>;
  lastDeletedExpense: Expense | null;
  updateProjectName: (name: string) => Promise<void>;
  updateProjectIcon: (icon: string) => Promise<void>;
  setDefaultCurrency: (currency: string) => Promise<void>;
  getUserById: (id: string) => User | undefined;
  getTotalExpenses: () => number;
  getUserBalance: (userId: string) => { paid: number; owes: number; balance: number };
  getExpensesByMonth: () => Map<string, Expense[]>;
  refreshData: () => Promise<void>;
  generateInviteLink: () => Promise<string | null>;
  joinProject: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>({
    projects: [],
    activeProjectId: null,
    loading: true,
    lastDeletedExpense: null,
  });

  const activeProject = useMemo(() =>
    state.activeProjectId
      ? state.projects.find((p) => p.id === state.activeProjectId) || null
      : null,
    [state.activeProjectId, state.projects]
  );

  // Cargar proyectos del usuario
  const loadProjects = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, projects: [], loading: false }));
      return;
    }

    try {
      // Cargar proyectos donde el usuario es creador
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id);

      if (ownedError) throw ownedError;

      // Cargar proyectos compartidos con el usuario
      const { data: sharedProjectIds } = await supabase
        .from('project_shared_users')
        .select('project_id')
        .eq('user_id', user.id);

      let sharedProjects: typeof ownedProjects = [];
      if (sharedProjectIds && sharedProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .in('id', sharedProjectIds.map(p => p.project_id));
        sharedProjects = data || [];
      }

      // Combinar proyectos propios y compartidos
      const allProjectsRaw = [
        ...(ownedProjects || []).map(p => ({ ...p, isOwner: true })),
        ...(sharedProjects || []).map(p => ({ ...p, isOwner: false })),
      ];

      const projects = allProjectsRaw;

      // Para cada proyecto, cargar miembros y gastos
      const projectsWithData: Project[] = await Promise.all(
        (projects || []).map(async (project) => {
          // Cargar miembros
          const { data: members } = await supabase
            .from('project_members')
            .select('*')
            .eq('project_id', project.id);

          // Cargar gastos
          const { data: expenses } = await supabase
            .from('expenses')
            .select('*')
            .eq('project_id', project.id);

          // Para cada gasto, cargar shares
          const expensesWithShares: Expense[] = await Promise.all(
            (expenses || []).map(async (expense) => {
              const { data: shares } = await supabase
                .from('expense_shares')
                .select('*')
                .eq('expense_id', expense.id);

              return {
                id: expense.id,
                amount: parseFloat(expense.amount),
                title: expense.title,
                currency: expense.currency,
                date: expense.date,
                paidBy: expense.paid_by_member_id,
                shares: (shares || []).map(s => ({
                  userId: s.member_id,
                  percentage: parseFloat(s.percentage),
                  amount: parseFloat(s.amount),
                })),
                splitType: expense.split_type as 'equal' | 'custom',
                expenseType: expense.expense_type as 'one-off' | 'recurring',
                recurringFrequency: expense.recurring_frequency,
                recurringStartDate: expense.recurring_start_date,
              };
            })
          );

          return {
            id: project.id,
            name: project.name,
            icon: project.icon || '✈️',
            defaultCurrency: project.default_currency || 'EUR',
            users: (members || []).map(m => ({
              id: m.id,
              name: m.participant_name,
            })),
            expenses: expensesWithShares,
            inviteCode: project.invite_code || null,
            isOwner: project.isOwner,
          };
        })
      );

      setState(prev => ({ ...prev, projects: projectsWithData, loading: false }));
    } catch (error) {
      console.error('Error loading projects:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const refreshData = async () => {
    await loadProjects();
  };

  const createProject = async (name: string, icon: string = '✈️', currency: string = 'EUR', participants: string[] = []) => {
    if (!user) return;

    try {
      // Crear proyecto
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name,
          icon,
          default_currency: currency,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Añadir participantes
      if (participants.length > 0) {
        const membersToInsert = participants.map(p => ({
          project_id: project.id,
          participant_name: p,
          user_id: null,
        }));

        await supabase.from('project_members').insert(membersToInsert);
      }

      await loadProjects();
      setState(prev => ({ ...prev, activeProjectId: project.id }));
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== id),
        activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId,
      }));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const selectProject = (id: string | null) => {
    setState(prev => ({ ...prev, activeProjectId: id }));
  };

  const addUser = async (name: string) => {
    if (!activeProject) return;

    try {
      const { data: member, error } = await supabase
        .from('project_members')
        .insert({
          project_id: activeProject.id,
          participant_name: name,
          user_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id
            ? { ...p, users: [...p.users, { id: member.id, name: member.participant_name }] }
            : p
        ),
      }));
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const removeUser = async (id: string) => {
    if (!activeProject) return;

    try {
      const { error } = await supabase.from('project_members').delete().eq('id', id);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id
            ? {
                ...p,
                users: p.users.filter(u => u.id !== id),
                expenses: p.expenses.filter(e => e.paidBy !== id),
              }
            : p
        ),
      }));
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    if (!activeProject || !user) return;

    try {
      // Crear gasto
      const { data: newExpense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          project_id: activeProject.id,
          title: expense.title,
          amount: expense.amount,
          currency: expense.currency,
          date: expense.date,
          paid_by_member_id: expense.paidBy,
          split_type: expense.splitType,
          expense_type: expense.expenseType || 'one-off',
          recurring_frequency: expense.recurringFrequency,
          recurring_start_date: expense.recurringStartDate,
          created_by: user.id,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Crear shares
      const sharesToInsert = expense.shares.map(share => ({
        expense_id: newExpense.id,
        member_id: share.userId,
        percentage: share.percentage,
        amount: share.amount,
      }));

      await supabase.from('expense_shares').insert(sharesToInsert);

      // Actualizar estado local
      const fullExpense: Expense = {
        ...expense,
        id: newExpense.id,
      };

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id
            ? { ...p, expenses: [...p.expenses, fullExpense] }
            : p
        ),
      }));
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const removeExpense = async (id: string) => {
    if (!activeProject) return;

    // Guardar para undo
    const expense = activeProject.expenses.find(e => e.id === id);
    if (expense) {
      setState(prev => ({ ...prev, lastDeletedExpense: expense }));
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id
            ? { ...p, expenses: p.expenses.filter(e => e.id !== id) }
            : p
        ),
      }));
    } catch (error) {
      console.error('Error removing expense:', error);
    }
  };

  const undoDeleteExpense = async () => {
    if (!state.lastDeletedExpense) return;

    const { id, ...expenseData } = state.lastDeletedExpense;
    await addExpense(expenseData);
    setState(prev => ({ ...prev, lastDeletedExpense: null }));
  };

  const updateProjectName = async (name: string) => {
    if (!activeProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ name })
        .eq('id', activeProject.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id ? { ...p, name } : p
        ),
      }));
    } catch (error) {
      console.error('Error updating project name:', error);
    }
  };

  const updateProjectIcon = async (icon: string) => {
    if (!activeProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ icon })
        .eq('id', activeProject.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id ? { ...p, icon } : p
        ),
      }));
    } catch (error) {
      console.error('Error updating project icon:', error);
    }
  };

  const setDefaultCurrency = async (currency: string) => {
    if (!activeProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ default_currency: currency })
        .eq('id', activeProject.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id ? { ...p, defaultCurrency: currency } : p
        ),
      }));
    } catch (error) {
      console.error('Error updating currency:', error);
    }
  };

  const getUserById = (id: string) => {
    return activeProject?.users.find(u => u.id === id);
  };

  const getTotalExpenses = () => {
    if (!activeProject) return 0;
    return activeProject.expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  const getUserBalance = (userId: string) => {
    if (!activeProject) return { paid: 0, owes: 0, balance: 0 };

    const paid = activeProject.expenses
      .filter(e => e.paidBy === userId)
      .reduce((sum, e) => sum + e.amount, 0);

    const owes = activeProject.expenses.reduce((sum, e) => {
      const share = e.shares.find((s: ExpenseShare) => s.userId === userId);
      return sum + (share?.amount || 0);
    }, 0);

    return { paid, owes, balance: paid - owes };
  };

  const getExpensesByMonth = () => {
    const byMonth = new Map<string, Expense[]>();
    if (!activeProject) return byMonth;

    activeProject.expenses.forEach(expense => {
      const date = new Date(expense.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(expense);
    });

    return new Map([...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  };

  const generateInviteLink = async (): Promise<string | null> => {
    if (!activeProject) return null;

    try {
      // Si ya tiene código, devolverlo
      if (activeProject.inviteCode) {
        return `${window.location.origin}/ExpensesApp/?join=${activeProject.inviteCode}`;
      }

      // Generar código único de 8 caracteres
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error } = await supabase
        .from('projects')
        .update({ invite_code: code })
        .eq('id', activeProject.id);

      if (error) throw error;

      // Actualizar estado local
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id ? { ...p, inviteCode: code } : p
        ),
      }));

      return `${window.location.origin}/ExpensesApp/?join=${code}`;
    } catch (error) {
      console.error('Error generating invite link:', error);
      return null;
    }
  };

  const joinProject = async (inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Debes iniciar sesión' };

    try {
      // Usar función RPC que salta las restricciones RLS
      const { data, error } = await supabase
        .rpc('join_project_by_invite_code', { invite_code_input: inviteCode });

      if (error) {
        console.error('RPC error:', error);
        return { success: false, error: 'Error al procesar la invitación' };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Recargar proyectos
      await loadProjects();

      // Seleccionar el proyecto
      setState(prev => ({ ...prev, activeProjectId: data.project_id }));

      return { success: true };
    } catch (error) {
      console.error('Error joining project:', error);
      return { success: false, error: 'Error al unirse al proyecto' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        activeProject,
        createProject,
        deleteProject,
        selectProject,
        addUser,
        removeUser,
        addExpense,
        removeExpense,
        undoDeleteExpense,
        lastDeletedExpense: state.lastDeletedExpense,
        updateProjectName,
        updateProjectIcon,
        setDefaultCurrency,
        getUserById,
        getTotalExpenses,
        getUserBalance,
        getExpensesByMonth,
        refreshData,
        generateInviteLink,
        joinProject,
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
