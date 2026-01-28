'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PagamentoRecebido, Venda } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { Plus, Search, Trash2, CheckCircle2, History, CreditCard, FileSpreadsheet } from 'lucide-react'
import { formatarValor } from '@/lib/calculos/lucro'
import * as XLSX from 'xlsx'
import { LinhaVenda } from '@/types/database'

// Extensão do tipo Venda para incluir o nome do cliente
interface VendaComDetalhes extends Venda {
  clientes: { nome: string } | null
  linhas_venda: LinhaVenda[]
}

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<PagamentoRecebido[]>([])
  const [faturasPendentes, setFaturasPendentes] = useState<VendaComDetalhes[]>([])
  const [faturasLiquidadas, setFaturasLiquidadas] = useState<VendaComDetalhes[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Buscar Pagamentos Registados Manuais
      const { data: pagamentosData, error: pagError } = await supabase
        .from('pagamentos_recebidos')
        .select('*')
        .order('data_pagamento', { ascending: false })

      if (pagError) throw pagError
      setPagamentos(pagamentosData || [])

      // 2. Buscar Faturas Pagas (pelos clientes) mas ainda não liquidadas
      const { data: pendentesData, error: venError } = await supabase
        .from('vendas')
        .select('*, clientes(nome), linhas_venda(*)')
        .eq('estado', 'pago')
        .eq('comissao_recebida_paga', false)
        .order('data_venda', { ascending: false })

      if (venError) throw venError
      setFaturasPendentes(pendentesData as any as VendaComDetalhes[])

      // 3. Buscar Faturas já Liquidadas (reconciliadas)
      const { data: liquidadasData, error: liqError } = await supabase
        .from('vendas')
        .select('*, clientes(nome), linhas_venda(*)')
        .eq('comissao_recebida_paga', true)
        .order('atualizado_em', { ascending: false })

      if (liqError) throw liqError
      setFaturasLiquidadas(liquidadasData as any as VendaComDetalhes[])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const liquidarComissao = async (vendaId: string, periodo: string) => {
    try {
      const { error } = await supabase
        .from('vendas')
        // @ts-ignore
        .update({
          comissao_recebida_paga: true,
          periodo_comissao_recebida: periodo
        })
        .eq('id', vendaId)

      if (error) throw error

      setSuccess(`Comissão da fatura liquidada para ${periodo}`)
      fetchData()
    } catch (err: any) {
      setError('Erro ao liquidar comissão: ' + err.message)
    }
  }

  const desfazerLiquidacao = async (vendaId: string) => {
    try {
      const { error } = await supabase
        .from('vendas')
        // @ts-ignore
        .update({
          comissao_recebida_paga: false,
          periodo_comissao_recebida: null
        })
        .eq('id', vendaId)

      if (error) throw error

      setSuccess(`Reconciliação desfeita com sucesso`)
      fetchData()
    } catch (err: any) {
      setError('Erro ao desfazer: ' + err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este pagamento?')) return

    try {
      const { error } = await supabase
        .from('pagamentos_recebidos')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccess('Pagamento eliminado com sucesso')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT')
  }

  // Exportar Pendentes para Excel
  const downloadPendentesExcel = () => {
    const data: any[] = []
    
    faturasPendentes.forEach(venda => {
      if (!venda.linhas_venda || !Array.isArray(venda.linhas_venda)) return

      venda.linhas_venda.forEach(linha => {
        let valorVendaLinha = 0
        if (linha.preco_venda) {
          valorVendaLinha = linha.preco_venda * linha.quantidade
        } else {
          valorVendaLinha = ( (linha.preco_custo || 0) + (linha.lucro_calculado / linha.quantidade) ) * linha.quantidade
        }

        data.push({
          'DATA': new Date(venda.data_venda).toLocaleDateString('pt-PT'),
          'Cliente': venda.clientes?.nome || 'Desconhecido',
          'FATURA': venda.numero_fatura,
          'CUSTO': `${(valorVendaLinha - linha.lucro_calculado).toFixed(2)} €`,
          'NEGÓCIO FECHADO': linha.artigo,
          'VALOR': `${valorVendaLinha.toFixed(2)} €`,
          'Valor/Comiss': `${linha.lucro_calculado.toFixed(2)} €`,
          'COMISSÃO (%)': `${linha.percentagem_comissao_snapshot.toFixed(1)}%`,
          'COMISSÃO TOTAL': `${linha.comissao_calculada.toFixed(2)} €`,
          'PAGO CO': 'A Receber'
        })
      })
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comissões Pendentes")
    
    worksheet['!cols'] = [
      {wch: 12}, {wch: 30}, {wch: 10}, {wch: 12}, {wch: 40}, 
      {wch: 12}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 10}
    ]

    XLSX.writeFile(workbook, `comissoes_pendentes_${new Date().getTime()}.xlsx`)
  }

  // Obter lista de meses para o Select
  const getOpcoesMeses = () => {
    const opcoes = []
    const hoje = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const label = d.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
      const val = label.charAt(0).toUpperCase() + label.slice(1)
      opcoes.push({ value: val, label: val })
    }
    return opcoes
  }

  const totalManuais = pagamentos.reduce((acc, p) => acc + p.valor, 0)
  const totalReconciliado = faturasLiquidadas.reduce((acc, v) => acc + v.comissao_total, 0)
  const totalPendentes = faturasPendentes.reduce((acc, v) => acc + v.comissao_total, 0)
  const totalGeral = totalManuais + totalReconciliado

  const mesesOpcoes = getOpcoesMeses()

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-gray-600 mt-1">
            Gestão e reconciliação de comissões recebidas
          </p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <span className="text-sm text-blue-700 font-medium">Reconciliado: </span>
            <span className="text-lg font-bold text-blue-800">{formatarValor(totalReconciliado)}</span>
          </div>
          <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
            <span className="text-sm text-green-700 font-medium">Total Acumulado: </span>
            <span className="text-lg font-bold text-green-800">{formatarValor(totalGeral)}</span>
          </div>
          <Link href="/pagamentos/novo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Registo Manual
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* SECÇÃO 1: Faturas Pendentes de Liquidação */}
      <Card className="border-blue-100 bg-blue-50/20">
        <CardHeader className="border-b border-blue-100 bg-white/50 flex flex-row items-center justify-between space-y-0 py-3">
          <div className="flex items-center gap-2 text-blue-800">
            <CreditCard className="w-5 h-5" />
            <CardTitle className="text-lg">Comissões por Receber (Faturas Pagas)</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
              Total: {formatarValor(totalPendentes)}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={downloadPendentesExcel}
              className="h-8 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          {loading ? (
            <p className="text-center py-8 text-gray-500 text-sm">A carregar faturas...</p>
          ) : faturasPendentes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">Não existem faturas pagas aguardando liquidação.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-blue-50/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right text-blue-700">Comissão (€)</TableHead>
                  <TableHead className="w-64">Marcar Mês de Recebimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faturasPendentes.map((fatura) => (
                  <TableRow key={fatura.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell className="text-sm text-gray-600">
                      {new Date(fatura.data_venda).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{fatura.numero_fatura}</TableCell>
                    <TableCell className="font-medium text-sm">{fatura.clientes?.nome}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {formatarValor(fatura.comissao_total)}
                    </TableCell>
                    <TableCell>
                      <Select 
                        options={[{ value: '', label: 'Selecionar Mês...' }, ...mesesOpcoes]}
                        onChange={(e) => {
                          if (e.target.value) {
                            liquidarComissao(fatura.id, e.target.value)
                          }
                        }}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* SECÇÃO 2: Comissões Reconciliadas por Venda */}
      <Card className="border-green-100">
        <CardHeader className="border-b bg-green-50/50">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="w-5 h-5" />
            <CardTitle>Histórico de Comissões Reconciliadas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8 text-gray-500 text-sm">A carregar...</p>
          ) : faturasLiquidadas.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">Ainda não reconciliou nenhuma comissão por fatura.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Object.entries(
                faturasLiquidadas.reduce((acc, f) => {
                  const periodo = f.periodo_comissao_recebida || 'Sem Período'
                  if (!acc[periodo]) acc[periodo] = []
                  acc[periodo].push(f)
                  return acc
                }, {} as Record<string, VendaComDetalhes[]>)
              )
                .sort(([a], [b]) => {
                  if (a === 'Sem Período') return 1
                  if (b === 'Sem Período') return -1
                  
                  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
                  
                  // Formato esperado: "Janeiro de 2026"
                  const partesA = a.split(' ')
                  const partesB = b.split(' ')
                  
                  const anoA = Number(partesA[partesA.length - 1])
                  const anoB = Number(partesB[partesB.length - 1])
                  const mesA = partesA[0]
                  const mesB = partesB[0]
                  
                  if (anoA !== anoB) return anoB - anoA
                  return meses.indexOf(mesB) - meses.indexOf(mesA)
                })
                .map(([periodo, faturas]) => {
                const totalMes = faturas.reduce((sum, f) => sum + f.comissao_total, 0)
                return (
                  <div key={periodo} className="p-0">
                    <div className="bg-gray-50/80 px-4 py-2 flex justify-between items-center border-y border-gray-100">
                      <span className="font-bold text-gray-700">{periodo}</span>
                      <div className="text-sm">
                        Total Recebido: <span className="font-bold text-green-700">{formatarValor(totalMes)}</span>
                      </div>
                    </div>
                    <Table>
                      <TableBody>
                        {faturas.map((fatura) => (
                          <TableRow key={fatura.id} className="hover:bg-green-50/10">
                            <TableCell className="w-1/4 text-sm font-mono">{fatura.numero_fatura}</TableCell>
                            <TableCell className="text-sm">{fatura.clientes?.nome}</TableCell>
                            <TableCell className="text-right font-medium">{formatarValor(fatura.comissao_total)}</TableCell>
                            <TableCell className="text-right w-24">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => desfazerLiquidacao(fatura.id)}
                                className="h-7 text-[10px] text-gray-400 hover:text-red-500 uppercase tracking-tighter"
                              >
                                Desfazer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECÇÃO 3: Pagamentos Manuais */}
      <Card>
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-700">
            <History className="w-5 h-5" />
            <CardTitle>Outros Recebimentos Registados (Manuais)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8 text-gray-500 text-sm">A carregar...</p>
          ) : pagamentos.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">Não existem pagamentos manuais registados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Registo</TableHead>
                  <TableHead>Mês Referência</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((pagamento) => (
                  <TableRow key={pagamento.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(pagamento.data_pagamento)}
                    </TableCell>
                    <TableCell className="font-medium">{pagamento.periodo_referencia}</TableCell>
                    <TableCell className="text-gray-400 text-sm max-w-md truncate">
                      {pagamento.observacoes || '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {formatarValor(pagamento.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(pagamento.id)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
