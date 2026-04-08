-- Adicionar campos de conclusão à tabela scheduled_maintenance
-- Para rastrear quem criou, quem concluiu e observações

ALTER TABLE scheduled_maintenance ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE scheduled_maintenance ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE scheduled_maintenance ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE scheduled_maintenance ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE scheduled_maintenance ADD COLUMN IF NOT EXISTS completed_by_name TEXT;
ALTER TABLE scheduled_maintenance ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Índice para busca por data de conclusão
CREATE INDEX IF NOT EXISTS idx_scheduled_maintenance_completed_at ON scheduled_maintenance(completed_at);
