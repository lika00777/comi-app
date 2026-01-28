-- Migração para adicionar desconto em percentagem por item de venda
ALTER TABLE linhas_venda 
ADD COLUMN percentagem_desconto DECIMAL(5,2) DEFAULT 0 CHECK (percentagem_desconto >= 0 AND percentagem_desconto <= 100);

COMMENT ON COLUMN linhas_venda.percentagem_desconto IS 'Desconto aplicado sobre o preço de venda unitário antes de impostos/margens finais';
