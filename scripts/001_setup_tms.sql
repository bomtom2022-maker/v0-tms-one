-- =============================================================
-- TMS ONE - Tool Manager System
-- Script de criacao completo: tabelas, RLS, funcoes e triggers
-- Normas TISAX: rastreabilidade, segregacao de dados, auditoria
-- =============================================================

-- ---------------------------------------------------------------
-- 1. EXTENSOES
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- 2. ENUMS
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manutentor', 'lider');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE machine_status AS ENUM ('critical', 'attention', 'ok');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in-progress', 'paused', 'completed', 'cancelled', 'unresolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_action_type AS ENUM ('start', 'pause', 'resume', 'complete', 'cancel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective', 'inspection');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'user_created', 'user_updated', 'user_deleted',
    'machine_created', 'machine_updated', 'machine_deleted',
    'part_created', 'part_updated', 'part_deleted',
    'problem_created', 'problem_updated', 'problem_deleted',
    'ticket_created', 'ticket_updated', 'ticket_accepted',
    'ticket_started', 'ticket_paused', 'ticket_resumed',
    'ticket_completed', 'ticket_cancelled',
    'scheduled_maintenance_created', 'scheduled_maintenance_updated', 'scheduled_maintenance_deleted',
    'login', 'logout'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------
-- 3. TABELA: profiles (usuarios do sistema)
-- Referencia auth.users do Supabase
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  role          user_role   NOT NULL DEFAULT 'manutentor',
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admin (Renan Bassinelo) ve tudo
CREATE POLICY "admin_full_profiles" ON public.profiles
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Manutentor ve todos os perfis (precisa ver lista de manutentores)
CREATE POLICY "manutentor_select_profiles" ON public.profiles
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor'
  );

-- Lider ve todos os perfis
CREATE POLICY "lider_select_profiles" ON public.profiles
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider'
  );

-- Qualquer usuario autenticado ve o proprio perfil
CREATE POLICY "self_select_profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Qualquer usuario atualiza o proprio perfil
CREATE POLICY "self_update_profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------
-- 4. TABELA: machines (maquinas CNC)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.machines (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT            NOT NULL,
  sector      TEXT            NOT NULL,
  status      machine_status  NOT NULL DEFAULT 'ok',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_machines" ON public.machines
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total (dono da operacao)
CREATE POLICY "manutentor_full_machines" ON public.machines
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: apenas leitura
CREATE POLICY "lider_select_machines" ON public.machines
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 5. TABELA: problems (tipos de problemas)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.problems (
  id                       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT            NOT NULL,
  default_priority         ticket_priority NOT NULL DEFAULT 'medium',
  requires_manual_priority BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_problems" ON public.problems
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total
CREATE POLICY "manutentor_full_problems" ON public.problems
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: apenas leitura
CREATE POLICY "lider_select_problems" ON public.problems
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 6. TABELA: parts (pecas/componentes)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  stock       INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_parts" ON public.parts
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total
CREATE POLICY "manutentor_full_parts" ON public.parts
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: apenas leitura
CREATE POLICY "lider_select_parts" ON public.parts
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 7. TABELA: tickets (chamados de manutencao)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tickets (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id        UUID            NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  problem_id        UUID            NOT NULL REFERENCES public.problems(id) ON DELETE RESTRICT,
  observation       TEXT,
  priority          ticket_priority NOT NULL DEFAULT 'medium',
  status            ticket_status   NOT NULL DEFAULT 'open',
  created_by        UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by_name   TEXT            NOT NULL,
  accepted_by       UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_by_name  TEXT,
  machine_stopped   BOOLEAN         NOT NULL DEFAULT FALSE,
  resolved          BOOLEAN,
  completion_notes  TEXT,
  total_cost        NUMERIC(10,2)   NOT NULL DEFAULT 0,
  downtime          INTEGER         NOT NULL DEFAULT 0,
  accumulated_time  INTEGER         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  started_at        TIMESTAMPTZ,
  paused_at         TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_tickets" ON public.tickets
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total (dono da operacao)
CREATE POLICY "manutentor_full_tickets" ON public.tickets
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: pode criar e ler todos os chamados, mas nao pode alterar status
CREATE POLICY "lider_select_tickets" ON public.tickets
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

CREATE POLICY "lider_insert_tickets" ON public.tickets
  FOR INSERT
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 8. TABELA: ticket_used_parts (pecas usadas em cada chamado)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_used_parts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  part_id     UUID        NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  quantity    INTEGER     NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_used_parts ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_ticket_parts" ON public.ticket_used_parts
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total
CREATE POLICY "manutentor_full_ticket_parts" ON public.ticket_used_parts
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: apenas leitura
CREATE POLICY "lider_select_ticket_parts" ON public.ticket_used_parts
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 9. TABELA: ticket_actions (historico de acoes por chamado)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_actions (
  id            UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID                  NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  type          ticket_action_type    NOT NULL,
  operator_id   UUID                  REFERENCES public.profiles(id) ON DELETE SET NULL,
  operator_name TEXT                  NOT NULL,
  reason        TEXT,
  timestamp     TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_actions ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_ticket_actions" ON public.ticket_actions
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total
CREATE POLICY "manutentor_full_ticket_actions" ON public.ticket_actions
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: apenas leitura
CREATE POLICY "lider_select_ticket_actions" ON public.ticket_actions
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 10. TABELA: ticket_time_segments (segmentos de tempo trabalhado)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_time_segments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  operator_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  operator_name TEXT        NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ,
  duration      INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_time_segments ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_time_segments" ON public.ticket_time_segments
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total
CREATE POLICY "manutentor_full_time_segments" ON public.ticket_time_segments
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: apenas leitura
CREATE POLICY "lider_select_time_segments" ON public.ticket_time_segments
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 11. TABELA: scheduled_maintenances (manutencoes programadas)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_maintenances (
  id             UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id     UUID                NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  title          TEXT                NOT NULL,
  description    TEXT,
  scheduled_date TIMESTAMPTZ         NOT NULL,
  type           maintenance_type    NOT NULL DEFAULT 'preventive',
  status         maintenance_status  NOT NULL DEFAULT 'pending',
  created_by     UUID                NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scheduled_maintenances ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_scheduled" ON public.scheduled_maintenances
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor: acesso total (cria, edita, exclui)
CREATE POLICY "manutentor_full_scheduled" ON public.scheduled_maintenances
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor');

-- Lider: apenas leitura
CREATE POLICY "lider_select_scheduled" ON public.scheduled_maintenances
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'lider');

-- ---------------------------------------------------------------
-- 12. TABELA: audit_logs (logs de auditoria TISAX)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  action          audit_action  NOT NULL,
  user_id         UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name       TEXT          NOT NULL,
  user_role       user_role,
  entity_type     TEXT,
  entity_id       TEXT,
  entity_name     TEXT,
  details         TEXT,
  previous_value  JSONB,
  new_value       JSONB,
  metadata        JSONB,
  ip_address      TEXT,
  timestamp       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin ve e insere logs de auditoria
CREATE POLICY "admin_full_audit" ON public.audit_logs
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Manutentor ve apenas logs das proprias acoes
CREATE POLICY "manutentor_select_own_audit" ON public.audit_logs
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manutentor'
    AND user_id = auth.uid()
  );

-- Sistema pode inserir logs (service role)
CREATE POLICY "service_insert_audit" ON public.audit_logs
  FOR INSERT
  WITH CHECK (TRUE);

-- ---------------------------------------------------------------
-- 13. TABELA: notifications (notificacoes em tempo real)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'info',
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  entity_type TEXT,
  entity_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_notifications" ON public.notifications
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Cada usuario ve apenas as proprias notificacoes
CREATE POLICY "own_notifications" ON public.notifications
  FOR ALL
  USING (user_id = auth.uid());

-- Sistema pode inserir notificacoes para qualquer usuario
CREATE POLICY "service_insert_notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (TRUE);

-- ---------------------------------------------------------------
-- 14. FUNCAO: updated_at automatico
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers de updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_machines
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_problems
  BEFORE UPDATE ON public.problems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_parts
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_tickets
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_scheduled
  BEFORE UPDATE ON public.scheduled_maintenances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- 15. FUNCAO: criar profile automaticamente ao criar usuario
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'manutentor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------
-- 16. FUNCAO: log de auditoria automatico para tickets
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_ticket_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name  TEXT;
  v_user_role  user_role;
  v_action     audit_action;
BEGIN
  SELECT name, role INTO v_user_name, v_user_role
  FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'ticket_created';
    INSERT INTO public.audit_logs (action, user_id, user_name, user_role, entity_type, entity_id, details, new_value)
    VALUES (v_action, auth.uid(), COALESCE(v_user_name, 'sistema'), v_user_role, 'ticket', NEW.id::TEXT, 
            'Chamado criado para maquina: ' || NEW.created_by_name, to_jsonb(NEW));

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detectar tipo de atualizacao pelo status
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'in-progress' THEN
          IF OLD.status = 'open' THEN v_action := 'ticket_accepted';
          ELSE v_action := 'ticket_started'; END IF;
        WHEN 'paused'      THEN v_action := 'ticket_paused';
        WHEN 'completed'   THEN v_action := 'ticket_completed';
        WHEN 'cancelled'   THEN v_action := 'ticket_cancelled';
        ELSE v_action := 'ticket_updated';
      END CASE;
    ELSE
      v_action := 'ticket_updated';
    END IF;

    INSERT INTO public.audit_logs (action, user_id, user_name, user_role, entity_type, entity_id, details, previous_value, new_value)
    VALUES (v_action, auth.uid(), COALESCE(v_user_name, 'sistema'), v_user_role, 'ticket', NEW.id::TEXT,
            'Status alterado de ' || OLD.status::TEXT || ' para ' || NEW.status::TEXT,
            to_jsonb(OLD), to_jsonb(NEW));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_ticket_changes
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_change();

-- ---------------------------------------------------------------
-- 17. FUNCAO: notificar manutentores quando novo chamado e aberto
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_name TEXT;
  v_manutentor   RECORD;
BEGIN
  SELECT name INTO v_machine_name FROM public.machines WHERE id = NEW.machine_id;

  -- Notificar todos os manutentores ativos
  FOR v_manutentor IN
    SELECT id FROM public.profiles WHERE role = 'manutentor' AND active = TRUE
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      v_manutentor.id,
      'Novo chamado aberto',
      'Chamado aberto para: ' || COALESCE(v_machine_name, 'Maquina') || ' - ' || NEW.priority::TEXT || ' prioridade',
      'warning',
      'ticket',
      NEW.id::TEXT
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_ticket();

-- ---------------------------------------------------------------
-- 18. FUNCAO: calcular custo total do chamado ao adicionar peca
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_ticket_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tickets
  SET total_cost = (
    SELECT COALESCE(SUM(tup.quantity * tup.unit_price), 0)
    FROM public.ticket_used_parts tup
    WHERE tup.ticket_id = COALESCE(NEW.ticket_id, OLD.ticket_id)
  )
  WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_cost_on_part_added
  AFTER INSERT OR UPDATE OR DELETE ON public.ticket_used_parts
  FOR EACH ROW EXECUTE FUNCTION public.update_ticket_cost();

-- ---------------------------------------------------------------
-- 19. FUNCAO: atualizar status da maquina baseado nos chamados
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_machine_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_high   INTEGER;
  v_open_any    INTEGER;
BEGIN
  -- Contar chamados abertos/em progresso de alta prioridade
  SELECT COUNT(*) INTO v_open_high
  FROM public.tickets
  WHERE machine_id = COALESCE(NEW.machine_id, OLD.machine_id)
    AND status IN ('open', 'in-progress', 'paused')
    AND priority = 'high';

  -- Contar todos os chamados abertos/em progresso
  SELECT COUNT(*) INTO v_open_any
  FROM public.tickets
  WHERE machine_id = COALESCE(NEW.machine_id, OLD.machine_id)
    AND status IN ('open', 'in-progress', 'paused');

  -- Atualizar status da maquina
  IF v_open_high > 0 THEN
    UPDATE public.machines SET status = 'critical' WHERE id = COALESCE(NEW.machine_id, OLD.machine_id);
  ELSIF v_open_any > 0 THEN
    UPDATE public.machines SET status = 'attention' WHERE id = COALESCE(NEW.machine_id, OLD.machine_id);
  ELSE
    UPDATE public.machines SET status = 'ok' WHERE id = COALESCE(NEW.machine_id, OLD.machine_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_machine_on_ticket_change
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_machine_status();

-- ---------------------------------------------------------------
-- 20. INDICES para performance
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tickets_status         ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_machine_id     ON public.tickets(machine_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by     ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at     ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_actions_ticket  ON public.ticket_actions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_parts_ticket    ON public.ticket_used_parts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_segments_ticket   ON public.ticket_time_segments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp   ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_scheduled_machine      ON public.scheduled_maintenances(machine_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_date         ON public.scheduled_maintenances(scheduled_date);

-- ---------------------------------------------------------------
-- 21. HABILITAR REALTIME para tabelas criticas
-- ---------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
