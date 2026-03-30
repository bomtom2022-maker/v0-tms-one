-- Adicionar o valor 'viewer' ao ENUM user_role
-- Este script adiciona o novo perfil de visualizador para a diretoria

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
