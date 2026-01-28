'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatarValor, calcularDetalhesLinha } from '@/lib/calculos/lucro'
import { Alert } from '@/components/ui/alert'
import { Download, FileBarChart, Calendar, FileSpreadsheet } from 'lucide-react'
import { PagamentoRecebido, LinhaVenda } from '@/types/database'
import * as XLSX from 'xlsx'

// Interfaces para os dados do relatório
interface VendasReport {
  id: string
  data_venda: string
  numero_fatura: string
  cliente_nome: string
  valor_total: number
  lucro_total: number
  comissao_total: number
  estado: string
  linhas_venda: LinhaVenda[]
}

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState('este_mes')
  const [dataInicioManual, setDataInicioManual] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [dataFimManual, setDataFimManual] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [vendas, setVendas] = useState<VendasReport[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoRecebido[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [periodo])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Definir datas baseado no filtro
      const hoje = new Date()
      let dataInicio = new Date()
      let dataFim = new Date()

      switch (periodo) {
        case 'este_mes':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
          break
        case 'mes_passado':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
          break
        case 'ano_corrente':
          dataInicio = new Date(hoje.getFullYear(), 0, 1)
          dataFim = new Date(hoje.getFullYear(), 11, 31)
          break
        case 'personalizado':
          dataInicio = new Date(dataInicioManual)
          dataFim = new Date(dataFimManual)
          // Garantir que o fim do dia é considerado
          dataFim.setHours(23, 59, 59, 999)
          break
      }

      // Buscar Vendas com Linhas
      const { data: vendasData } = await supabase
        .from('vendas')
        .select(`
          id, data_venda, numero_fatura, valor_total, lucro_total, comissao_total, estado,
          clientes (nome),
          linhas_venda (*)
        `)
        .gte('data_venda', dataInicio.toISOString())
        .lte('data_venda', dataFim.toISOString())
        .order('data_venda', { ascending: false })

      // Buscar Pagamentos
      const { data: pagamentosData } = await supabase
        .from('pagamentos_recebidos')
        .select('*')
        .gte('data_pagamento', dataInicio.toISOString())
        .lte('data_pagamento', dataFim.toISOString())

      // Transformar dados
      const vendasFormatadas = (vendasData || []).map((v: any) => ({
        id: v.id,
        data_venda: v.data_venda,
        numero_fatura: v.numero_fatura,
        cliente_nome: v.clientes?.nome || 'Cliente Removido',
        valor_total: v.valor_total,
        lucro_total: v.lucro_total,
        comissao_total: v.comissao_total,
        estado: v.estado,
        linhas_venda: v.linhas_venda || []
      }))

      setVendas(vendasFormatadas)
      setPagamentos(pagamentosData || [])
      
    } catch (err) {
      console.error('Erro ao carregar relatório:', err)
    } finally {
      setLoading(false)
    }
  }

  // Totais do Período
  const totalVendido = vendas.reduce((acc, v) => acc + v.valor_total, 0)
  const totalLucro = vendas.reduce((acc, v) => acc + v.lucro_total, 0)
  const totalComissao = vendas.reduce((acc, v) => acc + v.comissao_total, 0)
  const totalRecebido = pagamentos.reduce((acc, p) => acc + p.valor, 0)

  // Exportar para Excel detalhado
  const downloadExcel = () => {
    const data: any[] = []
    
    // Cabeçalhos baseados na imagem do utilizador
    const headers = [
      'DATA', 
      'Cliente', 
      'FATURA', 
      'CUSTO', 
      'NEGÓCIO FECHADO', 
      'VALOR', 
      'Valor/Comiss', 
      'COMISSÃO (%)', 
      'COMISSÃO TOTAL', 
      'PAGO CO'
    ]

    vendas.forEach(venda => {
      // Verificação de segurança para evitar erro de undefined
      if (!venda.linhas_venda || !Array.isArray(venda.linhas_venda)) return

      venda.linhas_venda.forEach(linha => {
        const detalhes = calcularDetalhesLinha(linha)
        
        data.push({
          'DATA': new Date(venda.data_venda).toLocaleDateString('pt-PT'),
          'Cliente': venda.cliente_nome,
          'FATURA': venda.numero_fatura,
          'CUSTO': detalhes.totalCusto ? `${detalhes.totalCusto.toFixed(2)} €` : '0.00 €',
          'NEGÓCIO FECHADO': linha.artigo,
          'VALOR': `${detalhes.totalVenda.toFixed(2)} €`,
          'Valor/Comiss': `${detalhes.lucro.toFixed(2)} €`,
          'COMISSÃO (%)': `${linha.percentagem_comissao_snapshot.toFixed(1)}%`,
          'COMISSÃO TOTAL': `${detalhes.comissao.toFixed(2)} €`,
          'PAGO CO': venda.estado.charAt(0).toUpperCase() + venda.estado.slice(1)
        })
      })
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório")
    
    // Ajustar largura das colunas
    const wscols = [
      {wch: 12}, // Data
      {wch: 30}, // Cliente
      {wch: 10}, // Fatura
      {wch: 12}, // Custo
      {wch: 40}, // Negócio
      {wch: 12}, // Valor
      {wch: 12}, // Lucro
      {wch: 15}, // %
      {wch: 15}, // Comissão
      {wch: 10}  // Estado
    ]
    worksheet['!cols'] = wscols

    XLSX.writeFile(workbook, `relatorio_comissoes_${periodo}_${new Date().getTime()}.xlsx`)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">
            Análise de desempenho financeiro
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
          {periodo === 'personalizado' && (
            <div className="flex gap-2 items-center slide-in-right bg-blue-50/50 p-2 rounded-lg border border-blue-100">
              <Input 
                type="date" 
                label="Início" 
                value={dataInicioManual} 
                onChange={(e) => setDataInicioManual(e.target.value)} 
                className="w-36 h-9"
              />
              <Input 
                type="date" 
                label="Fim" 
                value={dataFimManual} 
                onChange={(e) => setDataFimManual(e.target.value)} 
                className="w-36 h-9"
              />
              <Button size="sm" variant="outline" onClick={fetchData} title="Aplicar Filtro" className="h-9 mt-6 border-blue-200 text-blue-600 hover:bg-blue-50">
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Select 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-48"
              options={[
                { value: 'este_mes', label: 'Este Mês' },
                { value: 'mes_passado', label: 'Mês Passado' },
                { value: 'ano_corrente', label: 'Este Ano' },
                { value: 'personalizado', label: '📅 Personalizado' }
              ]}
            />
            <Button variant="outline" onClick={downloadExcel} className="border-green-200 text-green-700 hover:bg-green-50">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-white/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Total Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">{formatarValor(totalVendido)}</div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> no período selecionado
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-white/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Lucro Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">{formatarValor(totalLucro)}</div>
            <div className="mt-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 ring-1 ring-green-100">
                margem média: {totalVendido > 0 ? ((totalLucro / totalVendido) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-white/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Comissão Gerada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 tracking-tight">{formatarValor(totalComissao)}</div>
            <p className="text-xs text-gray-500 mt-2">{vendas.length} vendas registadas</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-green-50/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-green-700 uppercase tracking-wider">
              Pagamentos Recebidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 tracking-tight">{formatarValor(totalRecebido)}</div>
            <p className="text-xs text-green-600 mt-2">{pagamentos.length} pagamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Detalhe */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-gray-500" />
            <CardTitle>Detalhe de Vendas do Período</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">A carregar dados...</div>
          ) : vendas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Sem dados para este período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Fatura</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3 text-right">Valor Venda</th>
                    <th className="px-6 py-3 text-right">Lucro</th>
                    <th className="px-6 py-3 text-right">Comissão</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((v) => (
                    <tr key={v.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{new Date(v.data_venda).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-mono">{v.numero_fatura}</td>
                      <td className="px-6 py-4 font-medium">{v.cliente_nome}</td>
                      <td className="px-6 py-4 text-right">{formatarValor(v.valor_total)}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatarValor(v.lucro_total)}</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">{formatarValor(v.comissao_total)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          v.estado === 'pago' ? 'bg-green-100 text-green-800' : 
                          v.estado === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {v.estado.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
