-- Adiciona coluna password_hash na tabela profiles caso nao exista
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
