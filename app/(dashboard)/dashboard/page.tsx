import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Euro, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import { EvolucaoMensalChart } from '@/components/dashboard/evolucao-mensal-chart'
import { ComissoesTipoChart } from '@/components/dashboard/comissoes-tipo-chart'
import { Database } from '@/types/database'
import { verificarAlertasCobranca } from '@/lib/alertas'

type Venda = Database['public']['Tables']['vendas']['Row']
type Pagamento = Database['public']['Tables']['pagamentos_recebidos']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null
  
  // Verificar e gerar alertas se necessário
  await verificarAlertasCobranca(user.id)
  
  // Buscar Vendas
  const { data: vendasResult } = await supabase
    .from('vendas')
    .select('*')
    .order('data_venda', { ascending: true })
  
  const vendas: Venda[] = vendasResult || []
  
  // Buscar Pagamentos
  const { data: pagamentosResult } = await supabase
    .from('pagamentos_recebidos')
    .select('*')

  const pagamentos: Pagamento[] = pagamentosResult || []

  // Buscar Linhas de Venda para gráfico de Tipos
  const { data: linhasResult } = await supabase
    .from('linhas_venda')
    .select(`
      comissao_calculada,
      lucro_calculado,
      tipos_artigo (nome)
    `)
  
  const linhas = linhasResult || []
  
  // --- Cálculos de KPIs ---
  const vendasData = vendas
  const pagamentosData = pagamentos
  const linhasData = linhas

  const comissaoPendente = vendasData
    .filter(v => v.estado !== 'pago')
    .reduce((sum, v) => sum + v.comissao_total, 0)
  
  const comissaoValidada = vendasData
    .filter(v => v.estado === 'pago')
    .reduce((sum, v) => sum + v.comissao_total, 0)
  
  const comissaoRecebida = pagamentosData
    .reduce((sum, p) => sum + p.valor, 0)
  
  const diferenca = comissaoValidada - comissaoRecebida
  
  // --- Processamento para Gráficos ---

  // 1. Evolução Mensal
  const dadosMensaisMap = new Map<string, { comissao: number, lucro: number }>()
  
  // Inicializar com últimos 6 meses (para não ficar vazio)
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = d.toLocaleString('pt-PT', { month: 'short', year: '2-digit' })
    dadosMensaisMap.set(key, { comissao: 0, lucro: 0 })
  }

  // Preencher com dados reais
  vendasData.forEach(venda => {
    const data = new Date(venda.data_venda)
    const key = data.toLocaleString('pt-PT', { month: 'short', year: '2-digit' })
    
    // Se a chave não existir (fora dos últimos 6 meses iniciais), cria
    if (!dadosMensaisMap.has(key)) {
      dadosMensaisMap.set(key, { comissao: 0, lucro: 0 })
    }

    const atual = dadosMensaisMap.get(key)!
    atual.comissao += venda.comissao_total
    atual.lucro += venda.lucro_total
  })

  // Converter para array e ordenar (simplificado, assume ordem de inserção ou requer sort melhor)
  // Como estamos a usar LocalString, a ordenação alfabética não serve.
  // Vamos confiar na ordem de inserção do Map para os últimos meses pré-populados,
  // ou simplesmente enviar como está se for aceitável.
  
  const graficoMensalData = Array.from(dadosMensaisMap.entries()).map(([mes, valores]) => ({
    mes,
    comissao: Number(valores.comissao.toFixed(2)),
    lucro: Number(valores.lucro.toFixed(2))
  }))

  // 2. Comissões por Tipo
  const dadosPorTipoMap = new Map<string, number>()

  linhasData.forEach((linha: any) => {
    const nomeTipo = linha.tipos_artigo?.nome || 'Outros'
    const valor = dadosPorTipoMap.get(nomeTipo) || 0
    dadosPorTipoMap.set(nomeTipo, valor + linha.comissao_calculada)
  })

  const graficoTipoData = Array.from(dadosPorTipoMap.entries())
    .map(([tipo, valor]) => ({
      tipo,
      valor: Number(valor.toFixed(2)),
      percentagem: 0 // Calculado pelo Recharts
    }))
    .filter(item => item.valor > 0)
    .sort((a, b) => b.valor - a.valor) // Ordenar por valor decrescente

  // --- Stats Config ---
  const stats = [
    {
      title: 'Comissão Pendente',
      value: comissaoPendente,
      icon: TrendingUp,
      variant: 'warning' as const,
      description: 'Vendas não pagas'
    },
    {
      title: 'Comissão Validada',
      value: comissaoValidada,
      icon: CheckCircle,
      variant: 'success' as const,
      description: 'Vendas pagas (boa cobrança)'
    },
    {
      title: 'Comissão Recebida',
      value: comissaoRecebida,
      icon: Euro,
      variant: 'info' as const,
      description: 'Pagamentos registados'
    },
    {
      title: 'Diferença',
      value: Math.abs(diferenca),
      icon: AlertCircle,
      variant: diferenca > 0 ? ('danger' as const) : ('default' as const),
      description: diferenca > 0 ? 'A regularizar' : 'Equilibrado'
    },
  ]
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Visão geral das suas comissões comerciais
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-white/50 backdrop-blur-sm shadow-sm ring-1 ring-gray-200">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 pointer-events-none transition-transform group-hover:scale-110 ${
              stat.variant === 'success' ? 'bg-green-500' : 
              stat.variant === 'warning' ? 'bg-amber-500' : 
              stat.variant === 'danger' ? 'bg-red-500' : 
              'bg-blue-500'
            }`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-xl ${
                stat.variant === 'success' ? 'bg-green-50 text-green-600' : 
                stat.variant === 'warning' ? 'bg-amber-50 text-amber-600' : 
                stat.variant === 'danger' ? 'bg-red-50 text-red-600' : 
                'bg-blue-50 text-blue-600'
              }`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(stat.value)}
              </div>
              <div className="flex items-center mt-3">
                <Badge variant={stat.variant} className="rounded-lg px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide">
                  {stat.description}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="h-[400px]">
          <EvolucaoMensalChart data={graficoMensalData} />
        </div>
        
        <div className="h-[400px]">
          <ComissoesTipoChart data={graficoTipoData} />
        </div>
      </div>
    </div>
  )
}
