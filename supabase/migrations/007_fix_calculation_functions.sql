-- Migração: Corrigir funções de cálculo para considerar o campo percentagem_desconto

-- 1. Atualizar função de cálculo de lucro da linha
CREATE OR REPLACE FUNCTION calcular_lucro_linha(linha linhas_venda)
RETURNS DECIMAL AS $$
DECLARE
  lucro_base DECIMAL(10,2);
  preco_venda_base_unitario DECIMAL(10,2);
  valor_desconto_total DECIMAL(10,2);
BEGIN
  -- Prioridade 1: Lucro Manual
  IF linha.lucro_manual IS NOT NULL THEN
    lucro_base := linha.lucro_manual * linha.quantidade;
    
    IF COALESCE(linha.percentagem_desconto, 0) > 0 THEN
      -- PV base = PC + Lucro Manual. Se PC for NULL, PV base = Lucro Manual.
      preco_venda_base_unitario := COALESCE(linha.preco_custo, 0) + linha.lucro_manual;
      valor_desconto_total := (preco_venda_base_unitario * linha.quantidade) * (linha.percentagem_desconto / 100);
      RETURN lucro_base - valor_desconto_total;
    END IF;
    
    RETURN lucro_base;
  END IF;
  
  -- Prioridade 2: Margem sobre Custo
  IF linha.preco_custo IS NOT NULL AND linha.percentagem_custo IS NOT NULL THEN
    lucro_base := (linha.preco_custo * (linha.percentagem_custo / 100)) * linha.quantidade;
    
    IF COALESCE(linha.percentagem_desconto, 0) > 0 THEN
      preco_venda_base_unitario := linha.preco_custo + (linha.preco_custo * (linha.percentagem_custo / 100));
      valor_desconto_total := (preco_venda_base_unitario * linha.quantidade) * (linha.percentagem_desconto / 100);
      RETURN lucro_base - valor_desconto_total;
    END IF;
    
    RETURN lucro_base;
  END IF;
  
  -- Prioridade 3: Margem sobre Venda
  IF linha.preco_venda IS NOT NULL AND linha.percentagem_venda IS NOT NULL THEN
    lucro_base := (linha.preco_venda * (linha.percentagem_venda / 100)) * linha.quantidade;
    
    IF COALESCE(linha.percentagem_desconto, 0) > 0 THEN
      valor_desconto_total := (linha.preco_venda * linha.quantidade) * (linha.percentagem_desconto / 100);
      RETURN lucro_base - valor_desconto_total;
    END IF;
    
    RETURN lucro_base;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Atualizar o trigger de totais da venda para considerar o desconto no valor_total
CREATE OR REPLACE FUNCTION trigger_atualizar_totais_venda()
RETURNS TRIGGER AS $$
DECLARE
  venda_id_alvo UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    venda_id_alvo := OLD.venda_id;
  ELSE
    venda_id_alvo := NEW.venda_id;
  END IF;
  
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
          WHEN metodo_calculo = 'margem_venda' AND preco_venda IS NOT NULL THEN 
            (preco_venda * (1 - COALESCE(percentagem_desconto, 0)/100)) * quantidade
          WHEN (metodo_calculo = 'margem_custo' OR metodo_calculo = 'manual') AND (preco_custo IS NOT NULL OR lucro_manual IS NOT NULL) THEN 
            ((COALESCE(preco_custo, 0) + COALESCE(lucro_manual, (preco_custo * percentagem_custo / 100))) * (1 - COALESCE(percentagem_desconto, 0)/100)) * quantidade
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

-- 3. Recalcular todas as linhas e totais existentes para corrigir potenciais erros
UPDATE linhas_venda SET lucro_calculado = calcular_lucro_linha(linhas_venda);
-- Os triggers de atualização de totais serão disparados pelo UPDATE acima
