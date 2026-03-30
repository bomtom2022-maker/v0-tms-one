-- Adicionar o valor 'viewer' ao ENUM user_role
-- Este script adiciona o novo perfil de visualizador para a diretoria

DO $$
BEGIN
  -- Verificar se o valor 'viewer' já existe no enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'viewer' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Adicionar o valor 'viewer' ao enum
    ALTER TYPE user_role ADD VALUE 'viewer';
  END IF;
END $$;
