-- Adicionar colunas fabricante, modelo e comando na tabela machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller TEXT;
