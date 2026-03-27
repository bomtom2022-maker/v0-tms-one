-- Criar tabela de turnos para cálculo de MTBF/MTTR
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  daily_hours INTEGER NOT NULL DEFAULT 8,
  days_per_week INTEGER NOT NULL DEFAULT 5,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir turnos padrão
INSERT INTO shifts (name, daily_hours, days_per_week, description) VALUES
  ('Turno Único (8h)', 8, 5, 'Segunda a Sexta, 8 horas por dia'),
  ('Dois Turnos (16h)', 16, 5, 'Segunda a Sexta, 16 horas por dia'),
  ('Três Turnos (24h)', 24, 5, 'Segunda a Sexta, 24 horas por dia'),
  ('Operação Contínua', 24, 7, '24 horas por dia, 7 dias por semana')
ON CONFLICT DO NOTHING;

-- Adicionar coluna shift_id na tabela machines (se não existir)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);

-- Definir turno padrão para máquinas existentes (Turno Único)
UPDATE machines 
SET shift_id = (SELECT id FROM shifts WHERE name = 'Turno Único (8h)' LIMIT 1)
WHERE shift_id IS NULL;
