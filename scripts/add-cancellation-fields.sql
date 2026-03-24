-- Adicionar campos de cancelamento na tabela tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancelled_by_name TEXT;
