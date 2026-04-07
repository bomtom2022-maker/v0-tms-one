-- =====================================================
-- SCRIPT: Criar tabela company_config e View v_metricas_reais
-- Execute este script no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Criar tabela de configuração da empresa (se não existir)
CREATE TABLE IF NOT EXISTS company_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir valor padrão de horas mensais (se não existir)
INSERT INTO company_config (config_key, config_value, description)
VALUES ('monthly_operation_hours', '0', 'Total de horas de operação da empresa no mês - configurar pelo admin')
ON CONFLICT (config_key) DO NOTHING;

-- 3. Criar ou substituir a View v_metricas_reais
-- Esta view calcula MTBF, MTTR e Disponibilidade para cada máquina
-- usando os valores de monthly_operation_hours da tabela company_config

CREATE OR REPLACE VIEW v_metricas_reais AS
WITH config AS (
  SELECT COALESCE(
    (SELECT config_value::NUMERIC FROM company_config WHERE config_key = 'monthly_operation_hours'),
    0
  ) AS monthly_hours
),
machine_stats AS (
  SELECT 
    m.id AS machine_id,
    m.name AS machine_name,
    COUNT(t.id) AS total_falhas,
    COALESCE(SUM(t.downtime), 0) / 3600.0 AS downtime_horas
  FROM machines m
  LEFT JOIN tickets t ON t.machine_id = m.id 
    AND t.status IN ('completed', 'unresolved')
    AND t.created_at >= date_trunc('month', CURRENT_DATE)
    AND t.created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY m.id, m.name
)
SELECT 
  ms.machine_id,
  ms.machine_name,
  ms.total_falhas::INTEGER,
  ROUND(ms.downtime_horas::NUMERIC, 2) AS downtime_horas,
  -- Uptime = monthly_hours - downtime (não pode ser negativo)
  ROUND(GREATEST(c.monthly_hours - ms.downtime_horas, 0)::NUMERIC, 2) AS uptime_horas,
  -- MTBF: Se zero falhas, MTBF = monthly_hours. Senão, Uptime / Falhas
  CASE 
    WHEN ms.total_falhas = 0 THEN c.monthly_hours
    ELSE ROUND((GREATEST(c.monthly_hours - ms.downtime_horas, 0) / ms.total_falhas)::NUMERIC, 2)
  END AS mtbf,
  -- MTTR: Se zero falhas, MTTR = 0. Senão, Downtime / Falhas
  CASE 
    WHEN ms.total_falhas = 0 THEN 0
    ELSE ROUND((ms.downtime_horas / ms.total_falhas)::NUMERIC, 2)
  END AS mttr,
  -- Disponibilidade: Se monthly_hours = 0, retorna 100 (não configurado). Senão, (Uptime / monthly_hours) * 100
  CASE 
    WHEN c.monthly_hours = 0 THEN 100
    WHEN ms.total_falhas = 0 THEN 100
    ELSE ROUND((GREATEST(c.monthly_hours - ms.downtime_horas, 0) / c.monthly_hours * 100)::NUMERIC, 1)
  END AS disponibilidade
FROM machine_stats ms
CROSS JOIN config c
ORDER BY ms.total_falhas DESC, ms.machine_name;

-- 4. Criar índice para melhorar performance da view
CREATE INDEX IF NOT EXISTS idx_tickets_metrics 
ON tickets (machine_id, status, created_at) 
WHERE status IN ('completed', 'unresolved');

-- =====================================================
-- VERIFICAÇÃO: Execute após criar a view
-- =====================================================
-- SELECT * FROM v_metricas_reais;
-- SELECT * FROM company_config;
