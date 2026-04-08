-- Adiciona coluna is_active para soft delete de máquinas
-- Executa este script no Supabase Dashboard > SQL Editor

-- Adicionar coluna is_active (default true para máquinas existentes)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Atualizar todas as máquinas existentes para ativo
UPDATE machines SET is_active = true WHERE is_active IS NULL;

-- Criar índice para filtrar máquinas ativas rapidamente
CREATE INDEX IF NOT EXISTS idx_machines_is_active ON machines(is_active);
