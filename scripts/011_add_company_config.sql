-- Tabela de configuração da empresa (horas mensais de operação)
CREATE TABLE IF NOT EXISTS company_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração inicial (admin deve definir o valor correto)
INSERT INTO company_config (config_key, config_value, description)
VALUES ('monthly_operation_hours', '0', 'Total de horas de operação da empresa no mês - configurar pelo admin')
ON CONFLICT (config_key) DO NOTHING;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_company_config_key ON company_config(config_key);
