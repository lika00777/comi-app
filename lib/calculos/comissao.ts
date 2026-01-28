/**
 * Módulo de Cálculo de Comissão
 * 
 * Implementa o cálculo de comissões baseado no lucro e percentagem do tipo de artigo
 */

import { LinhaVenda, Venda, PagamentoRecebido } from '@/types/database'
import { calcularLucro, calcularLucroLinha } from './lucro'

// =====================================================
// CÁLCULO DE COMISSÃO
// =====================================================

/**
 * Calcula a comissão baseada no lucro e percentagem
 * Fórmula: Comissão = Lucro × (Percentagem ÷ 100)
 * 
 * @param lucro - Lucro em euros
 * @param percentagem_comissao - Percentagem de comissão (0-100)
 * @returns Comissão em euros
 */
export function calcularComissao(
  lucro: number,
  percentagem_comissao: number
): number {
  if (lucro < 0) {
    throw new Error('Lucro não pode ser negativo')
  }
  
  if (percentagem_comissao < 0 || percentagem_comissao > 100) {
    throw new Error('Percentagem de comissão deve estar entre 0 e 100')
  }
  
  return lucro * (percentagem_comissao / 100)
}

/**
 * Calcula a comissão de uma linha de venda
 */
export function calcularComissaoLinha(linha: LinhaVenda): number {
  const lucro = calcularLucroLinha(linha)
  return calcularComissao(lucro, linha.percentagem_comissao_snapshot)
}

/**
 * Calcula a comissão total de uma venda
 */
export function calcularComissaoVenda(linhas: LinhaVenda[]): number {
  return linhas.reduce((total, linha) => {
    return total + calcularComissaoLinha(linha)
  }, 0)
}

// =====================================================
// BOA COBRANÇA
// =====================================================

/**
 * Verifica se uma venda está em "boa cobrança" (validada para comissão)
 */
export function estaEmBoaCobranca(venda: Venda): boolean {
  return venda.estado === 'pago'
}

/**
 * Calcula comissão validada (apenas vendas em boa cobrança)
 */
export function calcularComissaoValidada(vendas: Venda[]): number {
  return vendas
    .filter(venda => estaEmBoaCobranca(venda))
    .reduce((total, venda) => total + venda.comissao_total, 0)
}

/**
 * Calcula comissão pendente (vendas não pagas)
 */
export function calcularComissaoPendente(vendas: Venda[]): number {
  return vendas
    .filter(venda => !estaEmBoaCobranca(venda))
    .reduce((total, venda) => total + venda.comissao_total, 0)
}

// =====================================================
// PAGAMENTOS E DIVERGÊNCIAS
// =====================================================

/**
 * Calcula total de pagamentos recebidos
 */
export function calcularTotalRecebido(pagamentos: PagamentoRecebido[]): number {
  return pagamentos.reduce((total, pagamento) => total + pagamento.valor, 0)
}

/**
 * Calcula divergência entre comissão esperada e recebida
 */
export function calcularDivergencia(
  comissao_esperada: number,
  valor_recebido: number
): {
  divergencia: number
  percentagem: number
  tem_divergencia: boolean
} {
  const divergencia = valor_recebido - comissao_esperada
  const percentagem = comissao_esperada > 0 
    ? (divergencia / comissao_esperada) * 100 
    : 0
  
  // Considera divergência se diferença > 5% ou > €5
  const tem_divergencia = Math.abs(percentagem) > 5 || Math.abs(divergencia) > 5
  
  return {
    divergencia,
    percentagem,
    tem_divergencia
  }
}

/**
 * Verifica se deve criar alerta de divergência
 */
export function deveAlertarDivergencia(
  comissao_esperada: number,
  valor_recebido: number
): boolean {
  const { tem_divergencia } = calcularDivergencia(comissao_esperada, valor_recebido)
  return tem_divergencia
}

// =====================================================
// RESUMO DE COMISSÕES
// =====================================================

export interface ResumoComissoes {
  pendente: number
  validada: number
  recebida: number
  diferenca: number
}

/**
 * Calcula resumo completo de comissões
 */
export function calcularResumoComissoes(
  vendas: Venda[],
  pagamentos: PagamentoRecebido[]
): ResumoComissoes {
  const pendente = calcularComissaoPendente(vendas)
  const validada = calcularComissaoValidada(vendas)
  const recebida = calcularTotalRecebido(pagamentos)
  const diferenca = validada - recebida
  
  return {
    pendente,
    validada,
    recebida,
    diferenca
  }
}

// =====================================================
// PREVISÕES
// =====================================================

/**
 * Calcula previsão mensal baseada na média dos últimos N meses
 */
export function calcularPrevisaoMensal(
  vendas_historico: Venda[],
  meses: number = 3
): number {
  if (vendas_historico.length === 0) return 0
  
  // Agrupar por mês
  const vendas_por_mes = new Map<string, number>()
  
  vendas_historico.forEach(venda => {
    if (estaEmBoaCobranca(venda)) {
      const mes_chave = venda.data_venda.substring(0, 7) // YYYY-MM
      const total_atual = vendas_por_mes.get(mes_chave) || 0
      vendas_por_mes.set(mes_chave, total_atual + venda.comissao_total)
    }
  })
  
  // Ordenar por mês (mais recente primeiro)
  const meses_ordenados = Array.from(vendas_por_mes.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, meses)
  
  if (meses_ordenados.length === 0) return 0
  
  // Calcular média
  const total = meses_ordenados.reduce((sum, [, valor]) => sum + valor, 0)
  return total / meses_ordenados.length
}

/**
 * Calcula taxa de conversão (vendas pagas vs total)
 */
export function calcularTaxaConversao(vendas: Venda[]): number {
  if (vendas.length === 0) return 0
  
  const vendas_pagas = vendas.filter(v => estaEmBoaCobranca(v)).length
  return (vendas_pagas / vendas.length) * 100
}

// =====================================================
// COMISSÕES POR TIPO DE ARTIGO
// =====================================================

export interface ComissaoPorTipo {
  tipo_artigo_id: string
  tipo_artigo_nome: string
  total_vendas: number
  total_lucro: number
  total_comissao: number
  percentagem_media: number
}

/**
 * Agrupa comissões por tipo de artigo
 */
export function agruparComissoesPorTipo(
  linhas: LinhaVenda[],
  tipos_map: Map<string, { nome: string }>
): ComissaoPorTipo[] {
  const agregacao = new Map<string, {
    total_vendas: number
    total_lucro: number
    total_comissao: number
    soma_percentagens: number
    count: number
  }>()
  
  linhas.forEach(linha => {
    const dados_atuais = agregacao.get(linha.tipo_artigo_id) || {
      total_vendas: 0,
      total_lucro: 0,
      total_comissao: 0,
      soma_percentagens: 0,
      count: 0
    }
    
    dados_atuais.total_vendas += linha.quantidade
    dados_atuais.total_lucro += linha.lucro_calculado
    dados_atuais.total_comissao += linha.comissao_calculada
    dados_atuais.soma_percentagens += linha.percentagem_comissao_snapshot
    dados_atuais.count += 1
    
    agregacao.set(linha.tipo_artigo_id, dados_atuais)
  })
  
  return Array.from(agregacao.entries()).map(([tipo_id, dados]) => ({
    tipo_artigo_id: tipo_id,
    tipo_artigo_nome: tipos_map.get(tipo_id)?.nome || 'Desconhecido',
    total_vendas: dados.total_vendas,
    total_lucro: dados.total_lucro,
    total_comissao: dados.total_comissao,
    percentagem_media: dados.soma_percentagens / dados.count
  }))
}

// =====================================================
// SIMULADOR
// =====================================================

/**
 * Simula comissão baseada em lucro estimado e tipo de artigo
 */
export function simularComissao(
  lucro_estimado: number,
  percentagem_comissao: number
): {
  lucro: number
  percentagem: number
  comissao: number
  comissao_formatada: string
} {
  const comissao = calcularComissao(lucro_estimado, percentagem_comissao)
  
  return {
    lucro: lucro_estimado,
    percentagem: percentagem_comissao,
    comissao,
    comissao_formatada: new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(comissao)
  }
}
