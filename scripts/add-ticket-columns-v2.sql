-- Adicionar colunas de cancelamento/rejeição e problema personalizado na tabela tickets
-- Usando IF NOT EXISTS para evitar erros se já existirem

DO $$ 
BEGIN
    -- Coluna para data/hora do cancelamento
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'cancelled_at') THEN
        ALTER TABLE tickets ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;

    -- Coluna para motivo do cancelamento/rejeição
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE tickets ADD COLUMN cancellation_reason TEXT;
    END IF;

    -- Coluna para ID de quem cancelou
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'cancelled_by') THEN
        ALTER TABLE tickets ADD COLUMN cancelled_by UUID REFERENCES users(id);
    END IF;

    -- Coluna para nome de quem cancelou
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'cancelled_by_name') THEN
        ALTER TABLE tickets ADD COLUMN cancelled_by_name TEXT;
    END IF;

    -- Coluna para nome do problema personalizado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'custom_problem_name') THEN
        ALTER TABLE tickets ADD COLUMN custom_problem_name TEXT;
    END IF;
END $$;
