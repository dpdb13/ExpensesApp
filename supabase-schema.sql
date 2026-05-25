-- =============================================
-- ESQUEMA DE BASE DE DATOS PARA EXPENSES APP
-- Copia y pega esto en Supabase > SQL Editor > New Query
-- =============================================

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
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
  invite_code TEXT UNIQUE,
  invite_role TEXT DEFAULT 'participant' CHECK (invite_role IN ('admin', 'participant')),
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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

-- Tabla de usuarios compartidos (invitados a proyectos)
CREATE TABLE project_shared_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'participant' CHECK (role IN ('admin', 'participant')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
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
ALTER TABLE project_shared_users ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuarios pueden ver su propio perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su propio perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- FUNCIÓN HELPER: Comprobar si usuario es admin
-- =============================================
CREATE OR REPLACE FUNCTION is_project_admin(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_shared_users
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Políticas para projects
CREATE POLICY "Miembros pueden ver proyectos" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_shared_users
      WHERE project_shared_users.project_id = projects.id
      AND project_shared_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden crear proyectos" ON projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner o admin puede actualizar proyecto" ON projects
  FOR UPDATE USING (
    auth.uid() = created_by
    OR is_project_admin(id)
  );

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
    OR EXISTS (
      SELECT 1 FROM project_shared_users
      WHERE project_shared_users.project_id = project_members.project_id
      AND project_shared_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner o admin puede añadir miembros" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.created_by = auth.uid())
    OR is_project_admin(project_id)
  );

CREATE POLICY "Owner o admin puede eliminar miembros" ON project_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.created_by = auth.uid())
    OR is_project_admin(project_id)
  );

-- Políticas para expenses
CREATE POLICY "Miembros pueden ver gastos del proyecto" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = expenses.project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = expenses.project_id
      AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_shared_users
      WHERE project_shared_users.project_id = expenses.project_id
      AND project_shared_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden crear gastos" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_shared_users
      WHERE project_shared_users.project_id = project_id
      AND project_shared_users.user_id = auth.uid()
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

-- Políticas para project_shared_users
CREATE POLICY "Usuarios pueden ver sus proyectos compartidos" ON project_shared_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden abandonar proyectos compartidos" ON project_shared_users
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- FUNCIONES RPC
-- =============================================

-- Unirse a un proyecto con código de invitación (asigna el rol definido en el proyecto)
CREATE OR REPLACE FUNCTION join_project_by_invite_code(invite_code_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record RECORD;
  existing_shared RECORD;
BEGIN
  SELECT id, created_by, invite_role INTO project_record
  FROM projects WHERE invite_code = invite_code_input;

  IF project_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código de invitación no válido');
  END IF;

  IF project_record.created_by = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Ya eres el creador de este proyecto');
  END IF;

  SELECT id INTO existing_shared
  FROM project_shared_users
  WHERE project_id = project_record.id AND user_id = auth.uid();

  IF existing_shared IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Ya formas parte de este proyecto');
  END IF;

  INSERT INTO project_shared_users (project_id, user_id, role)
  VALUES (project_record.id, auth.uid(), COALESCE(project_record.invite_role, 'participant'));

  RETURN json_build_object('success', true, 'project_id', project_record.id);
END;
$$;

-- Cambiar rol de un usuario compartido (solo owner o admin)
CREATE OR REPLACE FUNCTION update_shared_user_role(
  p_project_id UUID, p_user_id UUID, p_new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND created_by = auth.uid())
    OR is_project_admin(p_project_id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos');
  END IF;

  IF p_new_role NOT IN ('admin', 'participant') THEN
    RETURN json_build_object('success', false, 'error', 'Rol no válido');
  END IF;

  UPDATE project_shared_users SET role = p_new_role
  WHERE project_id = p_project_id AND user_id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

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

-- =============================================
-- MIGRACIONES APLICADAS (mayo 2026) — aplicadas vía MCP, reflejadas aquí
-- =============================================

-- Vincular cuenta logueada <-> participante ("¿quién eres?")
CREATE OR REPLACE FUNCTION claim_member(member_id_input UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  member_record RECORD;
  has_access BOOLEAN;
BEGIN
  SELECT id, project_id, user_id INTO member_record
  FROM project_members WHERE id = member_id_input;
  IF member_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Participante no encontrado');
  END IF;
  SELECT (
    EXISTS (SELECT 1 FROM projects WHERE id = member_record.project_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM project_shared_users WHERE project_id = member_record.project_id AND user_id = auth.uid())
  ) INTO has_access;
  IF NOT has_access THEN
    RETURN json_build_object('success', false, 'error', 'No tienes acceso a este grupo');
  END IF;
  IF member_record.user_id IS NOT NULL AND member_record.user_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Ese participante ya está vinculado a otra cuenta');
  END IF;
  UPDATE project_members SET user_id = NULL
  WHERE project_id = member_record.project_id AND user_id = auth.uid() AND id <> member_id_input;
  UPDATE project_members SET user_id = auth.uid() WHERE id = member_id_input;
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION unclaim_member(p_project_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE project_members SET user_id = NULL
  WHERE project_id = p_project_id AND user_id = auth.uid();
  RETURN json_build_object('success', true);
END;
$$;

-- Notas en gastos
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;

-- Recurrencia real (generación automática)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES expenses(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_last_generated DATE;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_recurring_occurrence ON expenses (recurring_parent_id, date);

-- Genera las repeticiones de los gastos recurrentes. La llama pg_cron a diario.
-- Ancla cada ocurrencia a recurring_start_date (anchor + n*intervalo) para evitar
-- deriva de día en meses con < 31 días.
CREATE OR REPLACE FUNCTION generate_recurring_expenses()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  tmpl RECORD; anchor DATE; last_gen DATE; step INTERVAL; n INT; occ_date DATE; max_gen DATE; new_id UUID;
BEGIN
  FOR tmpl IN SELECT * FROM expenses WHERE expense_type = 'recurring' AND recurring_parent_id IS NULL LOOP
    step := CASE tmpl.recurring_frequency
      WHEN 'weekly' THEN INTERVAL '1 week' WHEN 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END;
    anchor := COALESCE(tmpl.recurring_start_date, tmpl.date);
    last_gen := COALESCE(tmpl.recurring_last_generated, CURRENT_DATE);
    max_gen := last_gen;
    n := 1;
    LOOP
      occ_date := (anchor + (step * n))::date;
      EXIT WHEN occ_date > CURRENT_DATE;
      IF occ_date > last_gen THEN
        INSERT INTO expenses (project_id, title, notes, amount, currency, date,
          paid_by_member_id, split_type, expense_type, recurring_parent_id, created_by)
        VALUES (tmpl.project_id, tmpl.title, tmpl.notes, tmpl.amount, tmpl.currency, occ_date,
          tmpl.paid_by_member_id, tmpl.split_type, 'one-off', tmpl.id, tmpl.created_by)
        ON CONFLICT (recurring_parent_id, date) DO NOTHING
        RETURNING id INTO new_id;
        IF new_id IS NOT NULL THEN
          INSERT INTO expense_shares (expense_id, member_id, percentage, amount)
          SELECT new_id, member_id, percentage, amount FROM expense_shares WHERE expense_id = tmpl.id;
        END IF;
        new_id := NULL;
        IF occ_date > max_gen THEN max_gen := occ_date; END IF;
      END IF;
      n := n + 1;
    END LOOP;
    IF max_gen > last_gen THEN
      UPDATE expenses SET recurring_last_generated = max_gen WHERE id = tmpl.id;
    END IF;
  END LOOP;
END;
$fn$;

-- Robot diario (pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('generate-recurring-expenses', '0 3 * * *', 'SELECT generate_recurring_expenses();');
