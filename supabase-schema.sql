-- =============================================
-- ESQUEMA DE BASE DE DATOS PARA EXPENSES APP
-- Copia y pega esto en Supabase > SQL Editor > New Query
-- =============================================

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proyectos (grupos de gastos)
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '✈️',
  default_currency TEXT DEFAULT 'EUR',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de miembros del proyecto (participantes)
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id), -- NULL si es un participante sin cuenta
  participant_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, participant_name)
);

-- Tabla de gastos
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  date DATE NOT NULL,
  paid_by_member_id UUID REFERENCES project_members(id) NOT NULL,
  split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
  expense_type TEXT DEFAULT 'one-off' CHECK (expense_type IN ('one-off', 'recurring')),
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'yearly')),
  recurring_start_date DATE,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de reparto de gastos
CREATE TABLE expense_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES project_members(id) ON DELETE CASCADE NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  UNIQUE(expense_id, member_id)
);

-- =============================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuarios pueden ver su propio perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su propio perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para projects (los miembros pueden ver/editar)
CREATE POLICY "Miembros pueden ver proyectos" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Usuarios pueden crear proyectos" ON projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creador puede actualizar proyecto" ON projects
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creador puede eliminar proyecto" ON projects
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas para project_members
CREATE POLICY "Miembros pueden ver otros miembros del proyecto" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm2
      WHERE pm2.project_id = project_members.project_id
      AND pm2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Creador del proyecto puede añadir miembros" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Creador del proyecto puede eliminar miembros" ON project_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Políticas para expenses
CREATE POLICY "Miembros pueden ver gastos del proyecto" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = expenses.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden crear gastos" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creador del gasto puede actualizarlo" ON expenses
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Creador del gasto puede eliminarlo" ON expenses
  FOR DELETE USING (created_by = auth.uid());

-- Políticas para expense_shares
CREATE POLICY "Miembros pueden ver repartos" ON expense_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN project_members ON project_members.project_id = expenses.project_id
      WHERE expenses.id = expense_shares.expense_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden crear repartos" ON expense_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN project_members ON project_members.project_id = expenses.project_id
      WHERE expenses.id = expense_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden eliminar repartos" ON expense_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_id
      AND expenses.created_by = auth.uid()
    )
  );

-- =============================================
-- FUNCIÓN PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se registra un usuario
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- HABILITAR REALTIME (para sincronización en vivo)
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_shares;
