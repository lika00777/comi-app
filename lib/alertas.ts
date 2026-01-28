import { createClient } from '@/lib/supabase/server'

export async function verificarAlertasCobranca(userId: string) {
  const supabase = await createClient()
  
  // Data limite: 30 dias atrás
  const dataLimite = new Date()
  dataLimite.setDate(dataLimite.getDate() - 30)
  const dataLimiteStr = dataLimite.toISOString().split('T')[0]

  // Buscar vendas pendentes antigas
  const resVendasAtrasadas = await supabase
    .from('vendas')
    .select('id, numero_fatura, data_venda, clientes(nome), valor_total')
    .eq('utilizador_id', userId)
    .neq('estado', 'pago')
    .lt('data_venda', dataLimiteStr)

  if (!resVendasAtrasadas.data || resVendasAtrasadas.data.length === 0) return
  const vendasAtrasadas = resVendasAtrasadas.data as any[]

  // Para cada venda atrasada, verificar se já existe alerta
  for (const venda of vendasAtrasadas) {
    // Verificar se já existe alerta não lido para esta venda
    // Nota: Como dados_contexto é JSONB, a query seria complexa.
    // Simplificação: Buscar todos os alertas de cobrança não lidos do user e filtrar em memória
    // (OK para MVP com poucos alertas)
    
    // Melhor abordagem: Criar um ID único na mensagem ou contexto para verificação
    // Vou confiar que se já existe um alerta ativo, não recrio.
    
      const { data: resAlertas } = await supabase
        .from('alertas')
        .select('*')
        .eq('utilizador_id', userId)
        .eq('tipo', 'cobranca')
        .eq('lido', false)
        .contains('dados_contexto', { venda_id: venda.id })

      const alertasExistentes = resAlertas as any[] | null

    if (!alertasExistentes || alertasExistentes.length === 0) {
      // Criar novo alerta
      await supabase.from('alertas').insert({
        utilizador_id: userId,
        tipo: 'cobranca',
        mensagem: `Fatura ${venda.numero_fatura} (${venda.clientes?.nome}) em atraso (>30 dias).`,
        dados_contexto: { 
          venda_id: venda.id, 
          valor: venda.valor_total,
          dias_atraso: Math.floor((new Date().getTime() - new Date(venda.data_venda).getTime()) / (1000 * 3600 * 24))
        },
        lido: false
      })
    }
  }
}
