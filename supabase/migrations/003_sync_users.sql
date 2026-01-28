-- Sincronizar utilizadores do Auth com a tabela pública de utilizadores
-- Este script corrige registos que falharam devido a problemas de RLS

INSERT INTO public.utilizadores (id, nome, email)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'nome', 'Utilizador Sem Nome'), 
  email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.utilizadores)
ON CONFLICT (id) DO NOTHING;

-- Garantir que o email está atualizado para utilizadores existentes
UPDATE public.utilizadores
SET email = auth.users.email
FROM auth.users
WHERE public.utilizadores.id = auth.users.id
AND public.utilizadores.email != auth.users.email;
