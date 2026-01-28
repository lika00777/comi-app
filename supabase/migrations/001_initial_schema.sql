-- =====================================================
-- APLICAÇÃO DE GESTÃO DE COMISSÕES COMERCIAIS
-- Esquema de Base de Dados - PostgreSQL/Supabase
-- Data: 2026-01-21
-- Versão: 1.0
-- =====================================================

-- Ativar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

-- Estados das vendas
CREATE TYPE estado_venda AS ENUM ('pendente', 'parcial', 'pago');

-- Métodos de cálculo de lucro
CREATE TYPE metodo_calculo AS ENUM ('manual', 'margem_custo', 'margem_venda');

-- Tipos de alerta
CREATE TYPE tipo_alerta AS ENUM ('divergencia', 'cobranca', 'previsao');

-- =====================================================
-- TABELAS
-- =====================================================

-- Utilizadores (extensão de auth.users)
CREATE TABLE IF NOT EXISTS utilizadores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE utilizadores IS 'Perfil dos utilizadores comerciais';

-- =====================================================

-- Tipos de Artigo
CREATE TABLE IF NOT EXISTS tipos_artigo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  percentagem_comissao DECIMAL(5,2) NOT NULL CHECK (percentagem_comissao >= 0 AND percentagem_comissao <= 100),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(utilizador_id, nome)
);

COMMENT ON TABLE tipos_artigo IS 'Categorias de artigos com percentagens de comissão';
COMMENT ON COLUMN tipos_artigo.percentagem_comissao IS 'Percentagem de comissão (0-100)';

-- Índices
CREATE INDEX idx_tipos_artigo_utilizador ON tipos_artigo(utilizador_id);
CREATE INDEX idx_tipos_artigo_ativo ON tipos_artigo(ativo);

-- =====================================================

-- Histórico de Regras de Comissão
CREATE TABLE IF NOT EXISTS historico_regras_comissao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_artigo_id UUID NOT NULL REFERENCES tipos_artigo(id) ON DELETE CASCADE,
  percentagem_antiga DECIMAL(5,2),
  percentagem_nova DECIMAL(5,2) NOT NULL,
  alterado_em TIMESTAMPTZ DEFAULT NOW(),
  utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE
);

COMMENT ON TABLE historico_regras_comissao IS 'Auditoria de alterações de percentagens de comissão';

-- Índices
CREATE INDEX idx_historico_tipo_artigo ON historico_regras_comissao(tipo_artigo_id);
CREATE INDEX idx_historico_data ON historico_regras_comissao(alterado_em DESC);

-- =====================================================

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nif TEXT,
  email TEXT,
  telefone TEXT,
  morada TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(utilizador_id, nif)
);

COMMENT ON TABLE clientes IS 'Clientes do comercial';

-- Índices
CREATE INDEX idx_clientes_utilizador ON clientes(utilizador_id);
CREATE INDEX idx_clientes_nome ON clientes(nome);

-- =====================================================

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  numero_fatura TEXT NOT NULL,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  estado estado_venda DEFAULT 'pendente',
  
  -- Campos calculados (atualizados por trigger)
  valor_total DECIMAL(10,2) DEFAULT 0,
  lucro_total DECIMAL(10,2) DEFAULT 0,
  comissao_total DECIMAL(10,2) DEFAULT 0,
  
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(utilizador_id, numero_fatura)
);

COMMENT ON TABLE vendas IS 'Registo de vendas comerciais';
COMMENT ON COLUMN vendas.estado IS 'pendente: não pago | parcial: pagamento parcial | pago: totalmente pago (boa cobrança)';

-- Índices
CREATE INDEX idx_vendas_utilizador ON vendas(utilizador_id);
CREATE INDEX idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX idx_vendas_estado ON vendas(estado);
CREATE INDEX idx_vendas_data ON vendas(data_venda DESC);

-- =====================================================

-- Linhas de Venda
CREATE TABLE IF NOT EXISTS linhas_venda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  artigo TEXT NOT NULL,
  tipo_artigo_id UUID NOT NULL REFERENCES tipos_artigo(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  
  -- Método de cálculo
  metodo_calculo metodo_calculo NOT NULL,
  
  -- Campos para lucro manual
  lucro_manual DECIMAL(10,2),
  
  -- Campos para margem sobre custo
  preco_custo DECIMAL(10,2),
  percentagem_custo DECIMAL(5,2) CHECK (percentagem_custo >= 0 AND percentagem_custo <= 100),
  
  -- Campos para margem sobre venda
  preco_venda DECIMAL(10,2),
  percentagem_venda DECIMAL(5,2) CHECK (percentagem_venda >= 0 AND percentagem_venda <= 100),
  
  -- Percentagem de comissão snapshot (no momento da venda)
  percentagem_comissao_snapshot DECIMAL(5,2) NOT NULL,
  
  -- Campos calculados
  lucro_calculado DECIMAL(10,2) DEFAULT 0,
  comissao_calculada DECIMAL(10,2) DEFAULT 0,
  
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE linhas_venda IS 'Detalhes de cada artigo vendido';
COMMENT ON COLUMN linhas_venda.percentagem_comissao_snapshot IS 'Percentagem vigente no momento da venda';

-- Índices
CREATE INDEX idx_linhas_venda_venda ON linhas_venda(venda_id);
CREATE INDEX idx_linhas_venda_tipo_artigo ON linhas_venda(tipo_artigo_id);

-- =====================================================

-- Pagamentos Recebidos
CREATE TABLE IF NOT EXISTS pagamentos_recebidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  periodo_referencia TEXT NOT NULL,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pagamentos_recebidos IS 'Pagamentos de comissões recebidos da entidade patronal';

-- Índices
CREATE INDEX idx_pagamentos_utilizador ON pagamentos_recebidos(utilizador_id);
CREATE INDEX idx_pagamentos_data ON pagamentos_recebidos(data_pagamento DESC);
CREATE INDEX idx_pagamentos_periodo ON pagamentos_recebidos(periodo_referencia);

-- =====================================================

-- Alertas
CREATE TABLE IF NOT EXISTS alertas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  tipo tipo_alerta NOT NULL,
  mensagem TEXT NOT NULL,
  dados_contexto JSONB,
  lido BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE alertas IS 'Sistema de notificações e alertas';

-- Índices
CREATE INDEX idx_alertas_utilizador ON alertas(utilizador_id);
CREATE INDEX idx_alertas_lido ON alertas(lido);
CREATE INDEX idx_alertas_criado ON alertas(criado_em DESC);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de atualização de timestamp
CREATE TRIGGER trigger_atualizar_utilizadores
  BEFORE UPDATE ON utilizadores
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_tipos_artigo
  BEFORE UPDATE ON tipos_artigo
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_clientes
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_vendas
  BEFORE UPDATE ON vendas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_linhas_venda
  BEFORE UPDATE ON linhas_venda
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_atualizar_pagamentos
  BEFORE UPDATE ON pagamentos_recebidos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- =====================================================

-- Função para calcular lucro de uma linha de venda
CREATE OR REPLACE FUNCTION calcular_lucro_linha(linha linhas_venda)
RETURNS DECIMAL AS $$
DECLARE
  lucro DECIMAL(10,2);
BEGIN
  -- Prioridade 1: Lucro Manual
  IF linha.lucro_manual IS NOT NULL THEN
    RETURN linha.lucro_manual * linha.quantidade;
  END IF;
  
  -- Prioridade 2: Margem sobre Custo
  IF linha.preco_custo IS NOT NULL AND linha.percentagem_custo IS NOT NULL THEN
    lucro := linha.preco_custo * (linha.percentagem_custo / 100);
    RETURN lucro * linha.quantidade;
  END IF;
  
  -- Prioridade 3: Margem sobre Venda
  IF linha.preco_venda IS NOT NULL AND linha.percentagem_venda IS NOT NULL THEN
    lucro := linha.preco_venda * (linha.percentagem_venda / 100);
    RETURN lucro * linha.quantidade;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================

-- Função para calcular comissão de uma linha
CREATE OR REPLACE FUNCTION calcular_comissao_linha(linha linhas_venda)
RETURNS DECIMAL AS $$
DECLARE
  lucro DECIMAL(10,2);
BEGIN
  lucro := calcular_lucro_linha(linha);
  RETURN lucro * (linha.percentagem_comissao_snapshot / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================

-- Trigger para calcular valores da linha de venda
CREATE OR REPLACE FUNCTION trigger_calcular_linha_venda()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lucro_calculado := calcular_lucro_linha(NEW);
  NEW.comissao_calculada := calcular_comissao_linha(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_valores_linha
  BEFORE INSERT OR UPDATE ON linhas_venda
  FOR EACH ROW EXECUTE FUNCTION trigger_calcular_linha_venda();

-- =====================================================

-- Trigger para atualizar totais da venda
CREATE OR REPLACE FUNCTION trigger_atualizar_totais_venda()
RETURNS TRIGGER AS $$
DECLARE
  venda_id_alvo UUID;
BEGIN
  -- Determinar ID da venda afetada
  IF TG_OP = 'DELETE' THEN
    venda_id_alvo := OLD.venda_id;
  ELSE
    venda_id_alvo := NEW.venda_id;
  END IF;
  
  -- Recalcular totais
  UPDATE vendas
  SET
    lucro_total = COALESCE((
      SELECT SUM(lucro_calculado)
      FROM linhas_venda
      WHERE venda_id = venda_id_alvo
    ), 0),
    comissao_total = COALESCE((
      SELECT SUM(comissao_calculada)
      FROM linhas_venda
      WHERE venda_id = venda_id_alvo
    ), 0),
    valor_total = COALESCE((
      SELECT SUM(
        CASE 
          WHEN preco_venda IS NOT NULL THEN preco_venda * quantidade
          WHEN preco_custo IS NOT NULL AND percentagem_custo IS NOT NULL THEN 
            (preco_custo + (preco_custo * percentagem_custo / 100)) * quantidade
          ELSE 0
        END
      )
      FROM linhas_venda
      WHERE venda_id = venda_id_alvo
    ), 0)
  WHERE id = venda_id_alvo;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_venda_insert_update
  AFTER INSERT OR UPDATE ON linhas_venda
  FOR EACH ROW EXECUTE FUNCTION trigger_atualizar_totais_venda();

CREATE TRIGGER trigger_atualizar_venda_delete
  AFTER DELETE ON linhas_venda
  FOR EACH ROW EXECUTE FUNCTION trigger_atualizar_totais_venda();

-- =====================================================

-- Trigger para registar histórico de alteração de percentagem
CREATE OR REPLACE FUNCTION trigger_historico_percentagem()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.percentagem_comissao != OLD.percentagem_comissao THEN
    INSERT INTO historico_regras_comissao (
      tipo_artigo_id,
      percentagem_antiga,
      percentagem_nova,
      utilizador_id
    ) VALUES (
      NEW.id,
      OLD.percentagem_comissao,
      NEW.percentagem_comissao,
      NEW.utilizador_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registar_historico_percentagem
  AFTER UPDATE ON tipos_artigo
  FOR EACH ROW EXECUTE FUNCTION trigger_historico_percentagem();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE utilizadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_artigo ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_regras_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE linhas_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_recebidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso

-- Utilizadores (cada um vê apenas o seu perfil)
CREATE POLICY politica_utilizadores_select ON utilizadores FOR SELECT USING (id = auth.uid());
CREATE POLICY politica_utilizadores_update ON utilizadores FOR UPDATE USING (id = auth.uid());
CREATE POLICY politica_utilizadores_insert ON utilizadores FOR INSERT WITH CHECK (id = auth.uid());

-- Tipos de Artigo
CREATE POLICY politica_tipos_artigo ON tipos_artigo
  FOR ALL USING (utilizador_id = auth.uid());

-- Histórico de Regras
CREATE POLICY politica_historico ON historico_regras_comissao
  FOR ALL USING (utilizador_id = auth.uid());

-- Clientes
CREATE POLICY politica_clientes ON clientes
  FOR ALL USING (utilizador_id = auth.uid());

-- Vendas
CREATE POLICY politica_vendas ON vendas
  FOR ALL USING (utilizador_id = auth.uid());

-- Linhas de Venda (acesso via venda)
CREATE POLICY politica_linhas_venda ON linhas_venda
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendas
      WHERE vendas.id = linhas_venda.venda_id
      AND vendas.utilizador_id = auth.uid()
    )
  );

-- Pagamentos Recebidos
CREATE POLICY politica_pagamentos ON pagamentos_recebidos
  FOR ALL USING (utilizador_id = auth.uid());

-- Alertas
CREATE POLICY politica_alertas ON alertas
  FOR ALL USING (utilizador_id = auth.uid());

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Nota: Os dados de exemplo serão inseridos após criação de utilizador
-- através da aplicação ou script de seed separado

-- =====================================================
-- FIM DO ESQUEMA
-- =====================================================
