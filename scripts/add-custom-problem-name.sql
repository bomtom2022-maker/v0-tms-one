-- Adicionar coluna custom_problem_name na tabela tickets
-- Para armazenar o nome do problema quando o usuario selecionar "Outro"

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_problem_name TEXT;
