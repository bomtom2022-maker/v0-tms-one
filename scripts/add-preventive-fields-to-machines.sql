-- Adicionar campos de preventiva à tabela machines
-- preventive_interval_days: periodicidade da preventiva em dias
-- last_preventive_date: data da última preventiva realizada

ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS preventive_interval_days INTEGER DEFAULT NULL;

ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS last_preventive_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN machines.preventive_interval_days IS 'Periodicidade da manutenção preventiva em dias';
COMMENT ON COLUMN machines.last_preventive_date IS 'Data da última manutenção preventiva realizada';
