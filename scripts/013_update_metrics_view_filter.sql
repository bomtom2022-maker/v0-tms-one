-- =====================================================
-- SCRIPT: Atualizar View v_metricas_reais
-- Filtro: Apenas tickets completed + resolved = true
-- Execute no Supabase Dashboard > SQL Editor
-- =====================================================

-- Atualizar a View para considerar apenas chamados válidos
-- Chamados cancelados/rejeitados NÃO devem afetar MTBF, MTTR e Disponibilidade

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
    -- Contar apenas tickets completados E resolvidos
    COUNT(t.id) AS total_falhas,
    -- Somar downtime apenas de tickets completados E resolvidos
    COALESCE(SUM(t.downtime), 0) / 3600.0 AS downtime_horas
  FROM machines m
  LEFT JOIN tickets t ON t.machine_id = m.id 
    -- FILTRO CRÍTICO: apenas completed + resolved = true
    AND t.status = 'completed'
    AND t.resolved = true
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

-- Atualizar índice para novo filtro
DROP INDEX IF EXISTS idx_tickets_metrics;
CREATE INDEX idx_tickets_metrics 
ON tickets (machine_id, status, resolved, created_at) 
WHERE status = 'completed' AND resolved = true;

-- =====================================================
-- VERIFICAÇÃO: 
-- SELECT * FROM v_metricas_reais;
-- =====================================================
