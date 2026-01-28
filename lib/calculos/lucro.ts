/**
 * Módulo de Cálculo de Lucro
 * 
 * Implementa os 3 métodos de cálculo de lucro conforme especificação:
 * 1. Lucro Manual (prioridade máxima)
 * 2. Margem sobre Preço de Custo
 * 3. Margem sobre Preço de Venda
 */

import { LinhaVenda, MetodoCalculo } from '@/types/database'

// =====================================================
// TIPOS DE ENTRADA PARA CÁLCULO
// =====================================================

export interface DadosCalculoLucro {
  quantidade: number
  metodo_calculo: MetodoCalculo
  
  // Lucro Manual
  lucro_manual?: number | null
  
  // Margem sobre Custo
  preco_custo?: number | null
  percentagem_custo?: number | null
  
  // Margem sobre Venda
  preco_venda?: number | null
  percentagem_venda?: number | null
  
  // Desconto
  percentagem_desconto?: number | null
}

// =====================================================
// FUNÇÕES DE CÁLCULO
// =====================================================

/**
 * Calcula o lucro pelo método manual
 * Fórmula: Lucro Total = Lucro Manual × Quantidade
 */
export function calcularLucroManual(
  lucro_manual: number,
  quantidade: number
): number {
  return lucro_manual * quantidade
}

/**
 * Calcula o lucro pela margem sobre preço de custo
 * Fórmula: 
 *   Lucro Unitário = PC × (Percentagem ÷ 100)
 *   Lucro Total = Lucro Unitário × Quantidade
 *   PV = PC + Lucro Unitário
 */
export function calcularLucroMargemCusto(
  preco_custo: number,
  percentagem_custo: number,
  quantidade: number
): { lucro: number; preco_venda: number } {
  const lucro_unitario = preco_custo * (percentagem_custo / 100)
  const lucro_total = lucro_unitario * quantidade
  const preco_venda = preco_custo + lucro_unitario
  
  return {
    lucro: lucro_total,
    preco_venda: preco_venda
  }
}

/**
 * Calcula o lucro pela margem sobre preço de venda
 * Fórmula:
 *   Lucro Unitário = PV × (Percentagem ÷ 100)
 *   Lucro Total = Lucro Unitário × Quantidade
 *   PC = PV - Lucro Unitário
 */
export function calcularLucroMargemVenda(
  preco_venda: number,
  percentagem_venda: number,
  quantidade: number
): { lucro: number; preco_custo: number } {
  const lucro_unitario = preco_venda * (percentagem_venda / 100)
  const lucro_total = lucro_unitario * quantidade
  const preco_custo = preco_venda - lucro_unitario
  
  return {
    lucro: lucro_total,
    preco_custo: preco_custo
  }
}

/**
 * Calcula o lucro seguindo a prioridade automática:
 * 1️⃣ Lucro Manual
 * 2️⃣ Margem sobre Custo
 * 3️⃣ Margem sobre Venda
 * 
 * @param dados - Dados da linha de venda
 * @returns Lucro calculado em euros
 */
export function calcularLucro(dados: DadosCalculoLucro): number {
  const { quantidade, metodo_calculo } = dados
  
  // Validação de quantidade
  if (quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero')
  }

  // Se o método for especificado, usar estritamente esse método
  switch (metodo_calculo) {
    case 'manual':
      if (dados.lucro_manual !== null && dados.lucro_manual !== undefined) {
        let lucroTotal = calcularLucroManual(dados.lucro_manual, quantidade)
        
        if (dados.percentagem_desconto) {
          // Preço Venda Base = PC + Lucro Unitário. Se PC não existe, assume Lucro Unitário.
          const precoVendaBaseUnitario = (Number(dados.preco_custo) || 0) + dados.lucro_manual
          const valorDescontoTotal = (precoVendaBaseUnitario * quantidade) * (dados.percentagem_desconto / 100)
          lucroTotal -= valorDescontoTotal
        }
        
        return lucroTotal
      }
      break

    case 'margem_custo':
      if (
        dados.preco_custo !== null && 
        dados.preco_custo !== undefined &&
        dados.percentagem_custo !== null && 
        dados.percentagem_custo !== undefined
      ) {
        const resultado = calcularLucroMargemCusto(
          dados.preco_custo,
          dados.percentagem_custo,
          quantidade
        )
        
        let lucroTotal = resultado.lucro
        if (dados.percentagem_desconto) {
          // PV_base já vem no resultado
          const valorDescontoTotal = (resultado.preco_venda * quantidade) * (dados.percentagem_desconto / 100)
          lucroTotal -= valorDescontoTotal
        }
        
        return lucroTotal
      }
      break

    case 'margem_venda':
      if (
        dados.preco_venda !== null && 
        dados.preco_venda !== undefined &&
        dados.percentagem_venda !== null && 
        dados.percentagem_venda !== undefined
      ) {
        const resultado = calcularLucroMargemVenda(
          dados.preco_venda,
          dados.percentagem_venda,
          quantidade
        )
        // O desconto já deve ter sido considerado no lucro_total se aplicado corretamente.
        // Mas a especificação diz: "O desconto deve incidir sobre o valor Venda".
        // Isso significa que o PV final = PV_base * (1 - desconto).
        // E o Lucro final = PV_final - PC.
        
        let lucroTotal = resultado.lucro
        if (dados.percentagem_desconto) {
          const valorDescontoTotal = (dados.preco_venda * quantidade) * (dados.percentagem_desconto / 100)
          lucroTotal -= valorDescontoTotal
        }
        
        return lucroTotal
      }
      break
  }
  
  // Fallback: Retorna 0 se os dados para o método selecionado não estiverem completos
  return 0
}

/**
 * Calcula o lucro de uma linha de venda completa
 * (versão que aceita objeto LinhaVenda)
 */
export function calcularLucroLinha(linha: LinhaVenda): number {
  return calcularLucro({
    quantidade: linha.quantidade,
    metodo_calculo: linha.metodo_calculo,
    lucro_manual: linha.lucro_manual,
    preco_custo: linha.preco_custo,
    percentagem_custo: linha.percentagem_custo,
    preco_venda: linha.preco_venda,
    percentagem_venda: linha.percentagem_venda,
    percentagem_desconto: linha.percentagem_desconto
  })
}

/**
 * Calcula os detalhes completos de uma linha de venda (totais unitários e totais de linha)
 */
export function calcularDetalhesLinha(linha: any) {
  const quantidade = Number(linha.quantidade) || 0
  
  // 1. Calcular Preço de Venda Unitário Base (depende do método)
  let precoVendaUnitarioBase = 0
  
  switch (linha.metodo_calculo) {
    case 'manual':
      precoVendaUnitarioBase = (Number(linha.preco_custo) || 0) + (Number(linha.lucro_manual) || 0)
      break
    case 'margem_custo':
      if (linha.preco_custo && linha.percentagem_custo) {
        precoVendaUnitarioBase = (Number(linha.preco_custo) || 0) * (1 + (Number(linha.percentagem_custo) || 0) / 100)
      }
      break
    case 'margem_venda':
      precoVendaUnitarioBase = Number(linha.preco_venda) || 0
      break
  }

  // 2. Aplicar Desconto se existir
  const percentagemDesconto = Number(linha.percentagem_desconto) || 0
  const precoVendaUnitarioFinal = precoVendaUnitarioBase * (1 - percentagemDesconto / 100)
  
  // 3. Totais
  const totalVendaLine = precoVendaUnitarioFinal * quantidade
  const totalCustoLine = (Number(linha.preco_custo) || 0) * quantidade
  const lucroLine = totalVendaLine - totalCustoLine
  
  return {
    precoVendaUnitarioBase,
    precoVendaUnitarioFinal,
    totalVenda: totalVendaLine,
    totalCusto: totalCustoLine,
    lucro: lucroLine,
    comissao: (linha.comissao_calculada !== undefined) ? linha.comissao_calculada : 0
  }
}

// =====================================================
// VALIDAÇÕES
// =====================================================

/**
 * Valida se os dados fornecidos são suficientes para o método escolhido
 */
export function validarDadosCalculo(dados: DadosCalculoLucro): {
  valido: boolean
  erro?: string
} {
  const { metodo_calculo } = dados
  
  switch (metodo_calculo) {
    case 'manual':
      if (dados.lucro_manual === null || dados.lucro_manual === undefined) {
        return {
          valido: false,
          erro: 'Lucro manual é obrigatório para este método'
        }
      }
      if (dados.lucro_manual < 0) {
        return {
          valido: false,
          erro: 'Lucro manual não pode ser negativo'
        }
      }
      break
      
    case 'margem_custo':
      if (dados.preco_custo === null || dados.preco_custo === undefined) {
        return {
          valido: false,
          erro: 'Preço de custo é obrigatório para este método'
        }
      }
      if (dados.percentagem_custo === null || dados.percentagem_custo === undefined) {
        return {
          valido: false,
          erro: 'Percentagem sobre custo é obrigatória para este método'
        }
      }
      if (dados.preco_custo < 0) {
        return {
          valido: false,
          erro: 'Preço de custo não pode ser negativo'
        }
      }
      if (dados.percentagem_custo < 0 || dados.percentagem_custo > 100) {
        return {
          valido: false,
          erro: 'Percentagem sobre custo deve estar entre 0 e 100'
        }
      }
      break
      
    case 'margem_venda':
      if (dados.preco_venda === null || dados.preco_venda === undefined) {
        return {
          valido: false,
          erro: 'Preço de venda é obrigatório para este método'
        }
      }
      if (dados.percentagem_venda === null || dados.percentagem_venda === undefined) {
        return {
          valido: false,
          erro: 'Percentagem sobre venda é obrigatória para este método'
        }
      }
      if (dados.preco_venda < 0) {
        return {
          valido: false,
          erro: 'Preço de venda não pode ser negativo'
        }
      }
      if (dados.percentagem_venda < 0 || dados.percentagem_venda > 100) {
        return {
          valido: false,
          erro: 'Percentagem sobre venda deve estar entre 0 e 100'
        }
      }
      break
      
    default:
      return {
        valido: false,
        erro: 'Método de cálculo inválido'
      }
  }
  
  return { valido: true }
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Determina qual método de cálculo será usado pela prioridade automática
 */
export function determinarMetodoUtilizado(dados: DadosCalculoLucro): MetodoCalculo | null {
  if (dados.lucro_manual !== null && dados.lucro_manual !== undefined) {
    return 'manual'
  }
  
  if (
    dados.preco_custo !== null && 
    dados.preco_custo !== undefined &&
    dados.percentagem_custo !== null && 
    dados.percentagem_custo !== undefined
  ) {
    return 'margem_custo'
  }
  
  if (
    dados.preco_venda !== null && 
    dados.preco_venda !== undefined &&
    dados.percentagem_venda !== null && 
    dados.percentagem_venda !== undefined
  ) {
    return 'margem_venda'
  }
  
  return null
}

/**
 * Formata valor monetário para exibição (formato PT)
 */
export function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(valor)
}

/**
 * Formata percentagem para exibição (formato PT)
 */
export function formatarPercentagem(percentagem: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(percentagem / 100)
}
