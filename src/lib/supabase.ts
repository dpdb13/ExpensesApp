import { createClient } from '@supabase/supabase-js';

// Estas variables se configurarán con tus claves de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la base de datos
export interface DbUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  icon: string;
  default_currency: string;
  created_by: string;
  created_at: string;
}

export interface DbProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  participant_name: string;
  joined_at: string;
}

export interface DbExpense {
  id: string;
  project_id: string;
  title: string;
  notes?: string | null;
  amount: number;
  currency: string;
  date: string;
  paid_by: string; // participant_name del miembro que pagó
  paid_by_member_id: string;
  split_type: 'equal' | 'custom';
  expense_type: 'one-off' | 'recurring' | 'settlement';
  recurring_frequency?: 'weekly' | 'monthly' | 'yearly';
  recurring_start_date?: string;
  recurring_parent_id?: string | null; // si es una copia generada de un recurrente
  recurring_last_generated?: string | null; // hasta qué fecha se han generado copias (en la plantilla)
  created_by: string;
  created_at: string;
}

export interface DbExpenseShare {
  id: string;
  expense_id: string;
  member_id: string;
  participant_name: string;
  percentage: number;
  amount: number;
}
