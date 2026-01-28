-- Corrigir política RLS para permitir registo de novos utilizadores

DROP POLICY IF EXISTS politica_utilizadores ON utilizadores;

-- Política de Leitura (SELECT)
CREATE POLICY "Utilizadores podem ver o seu próprio perfil"
  ON utilizadores FOR SELECT
  USING (id = auth.uid());

-- Política de Atualização (UPDATE)
CREATE POLICY "Utilizadores podem atualizar o seu próprio perfil"
  ON utilizadores FOR UPDATE
  USING (id = auth.uid());

-- Política de Inserção (INSERT) - Crítica para o registo
CREATE POLICY "Utilizadores podem inserir o seu próprio perfil"
  ON utilizadores FOR INSERT
  WITH CHECK (id = auth.uid());
