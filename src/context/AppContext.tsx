import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Expense, ExpenseShare } from '../types';

// Longitud del código de invitación. La columna projects.invite_code en Supabase
// es TEXT (sin límite). Si cambias este número, sigue funcionando sin migración.
const INVITE_CODE_LENGTH = 12;

// Tipos para la app
type ProjectRole = 'owner' | 'admin' | 'participant';

interface Project {
  id: string;
  name: string;
  icon: string;
  defaultCurrency: string;
  users: User[];
  expenses: Expense[];
  inviteCode: string | null;
  inviteRole: 'admin' | 'participant';
  role: ProjectRole;
  closedAt: string | null;
}

interface User {
  id: string;
  name: string;
  userId: string | null; // cuenta vinculada a este participante (null si nadie lo ha reclamado)
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
  leaveProject: (id: string) => Promise<void>;
  selectProject: (id: string | null) => void;
  addUser: (name: string) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<boolean>;
  updateExpense: (id: string, expense: Omit<Expense, 'id'>) => Promise<boolean>;
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
  settleDebt: (fromId: string, toId: string, amount: number) => Promise<boolean>;
  closeProject: () => Promise<void>;
  reopenProject: () => Promise<void>;
  updateInviteRole: (role: 'admin' | 'participant') => Promise<void>;
  claimMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  unclaimMember: () => Promise<{ success: boolean; error?: string }>;
  myMemberId: string | null;
  canEdit: boolean;
  canDelete: boolean;
  isClosed: boolean;
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

  // Helpers de permisos
  const canEdit = activeProject?.role === 'owner' || activeProject?.role === 'admin';
  const canDelete = activeProject?.role === 'owner';
  const isClosed = activeProject?.closedAt != null;

  // Qué participante del proyecto activo es la cuenta logueada (null si aún no se ha vinculado)
  const myMemberId = useMemo(() => {
    if (!user || !activeProject) return null;
    return activeProject.users.find(u => u.userId === user.id)?.id ?? null;
  }, [user, activeProject]);

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

      // Cargar proyectos compartidos con el usuario (incluye el rol)
      const { data: sharedProjectData } = await supabase
        .from('project_shared_users')
        .select('project_id, role')
        .eq('user_id', user.id);

      // Mapa de project_id → role para asignar el rol correcto
      const roleMap = new Map<string, string>();
      (sharedProjectData || []).forEach(sp => {
        roleMap.set(sp.project_id, sp.role || 'participant');
      });

      let sharedProjects: typeof ownedProjects = [];
      if (sharedProjectData && sharedProjectData.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .in('id', sharedProjectData.map(p => p.project_id));
        sharedProjects = data || [];
      }

      // Combinar proyectos propios y compartidos
      const allProjectsRaw = [
        ...(ownedProjects || []).map(p => ({ ...p, _role: 'owner' as ProjectRole })),
        ...(sharedProjects || []).map(p => ({
          ...p,
          _role: (roleMap.get(p.id) || 'participant') as ProjectRole,
        })),
      ];

      // Para cada proyecto, cargar miembros y gastos
      const projectsWithData: Project[] = await Promise.all(
        allProjectsRaw.map(async (project) => {
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
                expenseType: expense.expense_type as Expense['expenseType'],
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
              userId: m.user_id,
            })),
            expenses: expensesWithShares,
            inviteCode: project.invite_code || null,
            inviteRole: project.invite_role || 'participant',
            role: project._role,
            closedAt: project.closed_at || null,
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

  // Vincular la cuenta logueada a un participante del proyecto activo ("yo soy X")
  const claimMember = async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Debes iniciar sesión' };
    try {
      const { data, error } = await supabase.rpc('claim_member', { member_id_input: memberId });
      if (error) {
        console.error('claim_member RPC error:', error);
        return { success: false, error: 'Error al vincular tu nombre' };
      }
      if (!data.success) {
        return { success: false, error: data.error };
      }
      await loadProjects();
      return { success: true };
    } catch (error) {
      console.error('Error claiming member:', error);
      return { success: false, error: 'Error al vincular tu nombre' };
    }
  };

  // Soltar la vinculación de la cuenta logueada en el proyecto activo
  const unclaimMember = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !activeProject) return { success: false, error: 'No hay grupo activo' };
    try {
      const { error } = await supabase.rpc('unclaim_member', { p_project_id: activeProject.id });
      if (error) {
        console.error('unclaim_member RPC error:', error);
        return { success: false, error: 'Error al desvincular' };
      }
      await loadProjects();
      return { success: true };
    } catch (error) {
      console.error('Error unclaiming member:', error);
      return { success: false, error: 'Error al desvincular' };
    }
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
    if (activeProject?.role !== 'owner') return;
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

  const leaveProject = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('project_shared_users')
        .delete()
        .eq('project_id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== id),
        activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId,
      }));
    } catch (error) {
      console.error('Error leaving project:', error);
    }
  };

  const selectProject = (id: string | null) => {
    setState(prev => ({ ...prev, activeProjectId: id }));
  };

  const addUser = async (name: string) => {
    if (!activeProject || activeProject.closedAt) return;
    if (activeProject.role === 'participant') return;

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
            ? { ...p, users: [...p.users, { id: member.id, name: member.participant_name, userId: member.user_id }] }
            : p
        ),
      }));
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const removeUser = async (id: string) => {
    if (!activeProject || activeProject.closedAt) return;
    if (activeProject.role === 'participant') return;

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

  const addExpense = async (expense: Omit<Expense, 'id'>): Promise<boolean> => {
    if (!activeProject || !user || activeProject.closedAt) return false;

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
      return true;
    } catch (error) {
      console.error('Error adding expense:', error);
      return false;
    }
  };

  const updateExpense = async (id: string, expenseData: Omit<Expense, 'id'>): Promise<boolean> => {
    if (!activeProject || !user || activeProject.closedAt) return false;

    try {
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          title: expenseData.title,
          amount: expenseData.amount,
          currency: expenseData.currency,
          date: expenseData.date,
          paid_by_member_id: expenseData.paidBy,
          split_type: expenseData.splitType,
          expense_type: expenseData.expenseType || 'one-off',
          recurring_frequency: expenseData.recurringFrequency,
          recurring_start_date: expenseData.recurringStartDate,
        })
        .eq('id', id);

      if (expenseError) throw expenseError;

      // Reemplazar shares: borrar antiguas e insertar nuevas
      await supabase.from('expense_shares').delete().eq('expense_id', id);

      const sharesToInsert = expenseData.shares.map(share => ({
        expense_id: id,
        member_id: share.userId,
        percentage: share.percentage,
        amount: share.amount,
      }));

      await supabase.from('expense_shares').insert(sharesToInsert);

      // Actualizar estado local
      const fullExpense: Expense = { ...expenseData, id };

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id
            ? { ...p, expenses: p.expenses.map(e => e.id === id ? fullExpense : e) }
            : p
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error updating expense:', error);
      return false;
    }
  };

  const removeExpense = async (id: string) => {
    if (!activeProject || activeProject.closedAt) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      // Guardar para undo DESPUES de confirmar que el delete funciono
      const expense = activeProject.expenses.find(e => e.id === id);
      if (expense) {
        setState(prev => ({ ...prev, lastDeletedExpense: expense }));
      }

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
    if (!activeProject || activeProject.closedAt) return;
    if (activeProject.role === 'participant') return;

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
    if (!activeProject || activeProject.closedAt) return;
    if (activeProject.role === 'participant') return;

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
    if (!activeProject || activeProject.closedAt) return;
    if (activeProject.role === 'participant') return;

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

  const closeProject = async () => {
    if (!activeProject) return;
    if (activeProject.role === 'participant') return;

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('projects')
        .update({ closed_at: now })
        .eq('id', activeProject.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id ? { ...p, closedAt: now } : p
        ),
      }));
    } catch (error) {
      console.error('Error closing project:', error);
    }
  };

  const reopenProject = async () => {
    if (!activeProject) return;
    if (activeProject.role === 'participant') return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ closed_at: null })
        .eq('id', activeProject.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id ? { ...p, closedAt: null } : p
        ),
      }));
    } catch (error) {
      console.error('Error reopening project:', error);
    }
  };

  const updateInviteRole = async (role: 'admin' | 'participant') => {
    if (!activeProject || activeProject.closedAt) return;
    if (activeProject.role === 'participant') return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ invite_role: role })
        .eq('id', activeProject.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === activeProject.id ? { ...p, inviteRole: role } : p
        ),
      }));
    } catch (error) {
      console.error('Error updating invite role:', error);
    }
  };

  const settleDebt = async (fromId: string, toId: string, amount: number): Promise<boolean> => {
    if (!activeProject || !user || activeProject.closedAt) return false;

    const fromUser = activeProject.users.find(u => u.id === fromId);
    const toUser = activeProject.users.find(u => u.id === toId);
    if (!fromUser || !toUser) return false;

    const settlementExpense: Omit<Expense, 'id'> = {
      amount,
      title: `Pago: ${fromUser.name} → ${toUser.name}`,
      currency: activeProject.defaultCurrency,
      date: new Date().toISOString().split('T')[0],
      paidBy: fromId,
      shares: [{ userId: toId, percentage: 100, amount }],
      splitType: 'custom',
      expenseType: 'settlement',
    };

    return addExpense(settlementExpense);
  };

  const getUserById = (id: string) => {
    return activeProject?.users.find(u => u.id === id);
  };

  const getTotalExpenses = () => {
    if (!activeProject) return 0;
    return activeProject.expenses
      .filter(e => e.expenseType !== 'settlement')
      .reduce((sum, e) => sum + e.amount, 0);
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
    if (!activeProject || activeProject.closedAt) return null;
    if (activeProject.role === 'participant') return null;

    try {
      if (activeProject.inviteCode) {
        return `${window.location.origin}/ExpensesApp/?join=${activeProject.inviteCode}`;
      }

      // Sin I/1/O/0 para evitar confusión visual
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const array = new Uint8Array(INVITE_CODE_LENGTH);
      crypto.getRandomValues(array);
      const code = Array.from(array, b => chars[b % chars.length]).join('');

      const { error } = await supabase
        .from('projects')
        .update({ invite_code: code })
        .eq('id', activeProject.id);

      if (error) throw error;

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
        leaveProject,
        selectProject,
        addUser,
        removeUser,
        addExpense,
        updateExpense,
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
        settleDebt,
        closeProject,
        reopenProject,
        updateInviteRole,
        claimMember,
        unclaimMember,
        myMemberId,
        canEdit,
        canDelete,
        isClosed,
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
