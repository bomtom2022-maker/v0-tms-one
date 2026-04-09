-- =============================================================
-- FIX RLS - Permitir leitura pública para todos os usuários autenticados
-- Todos os colaboradores da Vetore devem ver todos os dados
-- =============================================================

-- ---------------------------------------------------------------
-- 1. MACHINES - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_machines" ON public.machines;
CREATE POLICY "authenticated_read_machines" ON public.machines
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 2. PROBLEMS - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_problems" ON public.problems;
CREATE POLICY "authenticated_read_problems" ON public.problems
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 3. TICKETS - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_tickets" ON public.tickets;
CREATE POLICY "authenticated_read_tickets" ON public.tickets
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 4. TICKET_ACTIONS - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_ticket_actions" ON public.ticket_actions;
CREATE POLICY "authenticated_read_ticket_actions" ON public.ticket_actions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 5. TICKET_TIME_SEGMENTS - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_time_segments" ON public.ticket_time_segments;
CREATE POLICY "authenticated_read_time_segments" ON public.ticket_time_segments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 6. TICKET_USED_PARTS - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_ticket_parts" ON public.ticket_used_parts;
CREATE POLICY "authenticated_read_ticket_parts" ON public.ticket_used_parts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 7. PARTS - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_parts" ON public.parts;
CREATE POLICY "authenticated_read_parts" ON public.parts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 8. PROFILES - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_profiles" ON public.profiles;
CREATE POLICY "authenticated_read_profiles" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 9. SCHEDULED_MAINTENANCES - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_scheduled_maintenances" ON public.scheduled_maintenances;
CREATE POLICY "authenticated_read_scheduled_maintenances" ON public.scheduled_maintenances
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Também precisamos permitir INSERT e UPDATE para roles viewer
-- para que possam criar chamados
DROP POLICY IF EXISTS "viewer_insert_tickets" ON public.tickets;
CREATE POLICY "viewer_insert_tickets" ON public.tickets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 10. SHIFTS (se existir) - Adicionar política de leitura para todos autenticados
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shifts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_shifts" ON public.shifts';
    EXECUTE 'CREATE POLICY "authenticated_read_shifts" ON public.shifts FOR SELECT USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- Verificação final
-- ---------------------------------------------------------------
SELECT 'Políticas de RLS atualizadas com sucesso!' as resultado;
