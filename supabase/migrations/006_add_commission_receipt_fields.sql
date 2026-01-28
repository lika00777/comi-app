-- Migração para adicionar campos de reconciliação de comissões
ALTER TABLE vendas 
ADD COLUMN periodo_comissao_recebida TEXT,
ADD COLUMN comissao_recebida_paga BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN vendas.periodo_comissao_recebida IS 'Mês e ano em que a comissão foi recebida (ex: Janeiro 2026)';
COMMENT ON COLUMN vendas.comissao_recebida_paga IS 'Indica se a comissão desta venda já foi liquidada pelo empregador';

-- Índice para acelerar a procura de faturas pendentes de liquidação
CREATE INDEX idx_vendas_reconciliacao ON vendas(utilizador_id, comissao_recebida_paga, estado);
