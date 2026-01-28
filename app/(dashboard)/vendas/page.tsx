'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Venda, EstadoVenda, LinhaVenda } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatarValor } from '@/lib/calculos/lucro'

// Extended type with lines
interface VendaComLinhas extends Venda {
  clientes: {
    nome: string
  } | null
  linhas_venda: LinhaVenda[]
}

export default function VendasPage() {
  const [vendas, setVendas] = useState<VendaComLinhas[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    const savedSort = localStorage.getItem('vendas_sort_config')
    if (savedSort) {
      setSortConfig(JSON.parse(savedSort))
    } else {
      setSortConfig({ key: 'data_venda', direction: 'desc' })
    }
  }, [])

  useEffect(() => {
    if (sortConfig) {
      localStorage.setItem('vendas_sort_config', JSON.stringify(sortConfig))
    }
  }, [sortConfig])
  
  const supabase = createClient()

  useEffect(() => {
    fetchVendas()
  }, [])

  const fetchVendas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          *,
          clientes (
            nome
          ),
          linhas_venda (*)
        `)
        .order('data_venda', { ascending: false })

      if (error) throw error
      setVendas(data as any as VendaComLinhas[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateVendaStatus = async (id: string, novoEstado: EstadoVenda) => {
    try {
      setVendas(vendas.map(v => v.id === id ? { ...v, estado: novoEstado } : v))

      const { error } = await supabase
        .from('vendas')
        // @ts-ignore
        .update({ estado: novoEstado })
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      setError('Erro ao atualizar estado: ' + err.message)
      fetchVendas()
    }
  }

  const deleteVenda = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar esta venda? Esta ação não pode ser desfeita.')) return

    try {
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setVendas(vendas.filter(v => v.id !== id))
    } catch (err: any) {
      setError('Erro ao eliminar venda: ' + err.message)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT')
  }

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const sortedVendas = [...vendas].sort((a, b) => {
    if (!sortConfig) return 0
    
    let aValue: any
    let bValue: any

    if (sortConfig.key === 'cliente') {
      aValue = a.clientes?.nome || ''
      bValue = b.clientes?.nome || ''
    } else {
      aValue = a[sortConfig.key as keyof VendaComLinhas] || ''
      bValue = b[sortConfig.key as keyof VendaComLinhas] || ''
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const filteredVendas = sortedVendas.filter(v => 
    v.numero_fatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.clientes?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="pb-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600 mt-1">
            Gestão de vendas e comissões
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Pesquisar fatura ou cliente..."
              className="h-10 rounded-md border border-gray-300 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link href="/vendas/nova">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onDismiss={() => setError(null)} className="mb-6">
          {error}
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            A carregar vendas...
          </CardContent>
        </Card>
      ) : filteredVendas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Nenhuma venda encontrada.' : 'Ainda não registou nenhuma venda.'}
            </p>
            {!searchTerm && (
              <Link href="/vendas/nova">
                <Button>Registar Primeira Venda</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredVendas.map((venda) => {
            // Calcular totais das linhas
            const totaisLinhas = venda.linhas_venda?.reduce((acc, linha) => {
              let precoVendaUnitario = 0
              if (linha.metodo_calculo === 'manual') {
                precoVendaUnitario = (linha.preco_custo || 0) + (linha.lucro_manual || 0)
              } else if (linha.metodo_calculo === 'margem_custo' && linha.preco_custo && linha.percentagem_custo) {
                const lucroUnitario = linha.preco_custo * (linha.percentagem_custo / 100)
                precoVendaUnitario = linha.preco_custo + lucroUnitario
              } else if (linha.metodo_calculo === 'margem_venda') {
                precoVendaUnitario = linha.preco_venda || 0
              }

              const precoComDesconto = precoVendaUnitario * (1 - (linha.percentagem_desconto || 0) / 100)
              const totalVenda = precoComDesconto * linha.quantidade
              const totalCusto = (linha.preco_custo || 0) * linha.quantidade

              return {
                custo: acc.custo + totalCusto,
                venda: acc.venda + totalVenda
              }
            }, { custo: 0, venda: 0 }) || { custo: 0, venda: 0 }

            return (
              <Card key={venda.id} className="overflow-hidden">
                {/* Cabeçalho da Venda */}
                <div className="bg-gray-50 border-b px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-xs text-gray-500">Data</span>
                        <p className="font-medium">{formatDate(venda.data_venda)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Fatura</span>
                        <p className="font-mono font-medium">{venda.numero_fatura}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Cliente</span>
                        <p className="font-medium">{venda.clientes?.nome || 'Desconhecido'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Estado</span>
                        <select
                          className={`mt-1 h-7 rounded-md border text-xs font-medium px-2 focus:outline-none focus:ring-2 ${
                            venda.estado === 'pago' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : venda.estado === 'parcial'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                          value={venda.estado}
                          onChange={(e) => updateVendaStatus(venda.id, e.target.value as any)}
                        >
                          <option value="pendente">Pendente</option>
                          <option value="parcial">Parcial</option>
                          <option value="pago">Pago</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Lucro Total</span>
                        <p className="text-lg font-semibold text-green-700">{formatarValor(venda.lucro_total)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Comissão</span>
                        <p className="text-xl font-bold text-blue-600">{formatarValor(venda.comissao_total)}</p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Link href={`/vendas/${venda.id}`}>
                          <Button variant="ghost" size="sm" title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteVenda(venda.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linhas de Artigos */}
                <CardContent className="p-0">
                  {venda.linhas_venda && venda.linhas_venda.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                          <tr>
                            <th className="px-6 py-3 text-left font-semibold">Artigo</th>
                            <th className="px-4 py-3 text-center font-semibold w-16">Qtd</th>
                            <th className="px-4 py-3 text-left font-semibold w-32">Tipo</th>
                            <th className="px-4 py-3 text-right font-semibold w-28">Custo</th>
                            <th className="px-4 py-3 text-right font-semibold w-28">Venda</th>
                            <th className="px-4 py-3 text-right font-semibold w-28">Margem</th>
                            <th className="px-4 py-3 text-right font-semibold w-20">% Com.</th>
                            <th className="px-4 py-3 text-right font-semibold w-28">Comissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {venda.linhas_venda.map((linha, idx) => {
                            let precoVendaUnitario = 0
                            if (linha.metodo_calculo === 'manual') {
                              precoVendaUnitario = (linha.preco_custo || 0) + (linha.lucro_manual || 0)
                            } else if (linha.metodo_calculo === 'margem_custo' && linha.preco_custo && linha.percentagem_custo) {
                              const lucroUnitario = linha.preco_custo * (linha.percentagem_custo / 100)
                              precoVendaUnitario = linha.preco_custo + lucroUnitario
                            } else if (linha.metodo_calculo === 'margem_venda') {
                              precoVendaUnitario = linha.preco_venda || 0
                            }

                            const precoComDesconto = precoVendaUnitario * (1 - (linha.percentagem_desconto || 0) / 100)
                            const totalVenda = precoComDesconto * linha.quantidade
                            const totalCusto = (linha.preco_custo || 0) * linha.quantidade

                            return (
                              <tr key={linha.id || idx} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-900">{linha.artigo}</td>
                                <td className="px-4 py-3 text-center text-gray-600">{linha.quantidade}</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                  {linha.tipo_artigo_id ? 'configurado' : '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-gray-700">
                                  {formatarValor(totalCusto)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                                  {formatarValor(totalVenda)}
                                  {linha.percentagem_desconto ? (
                                    <span className="text-xs text-orange-600 ml-1">(-{linha.percentagem_desconto}%)</span>
                                  ) : null}
                                </td>
                                <td className={`px-4 py-3 text-right font-mono ${linha.lucro_calculado < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                  {formatarValor(linha.lucro_calculado)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {linha.percentagem_comissao_snapshot}%
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                                  {formatarValor(linha.comissao_calculada)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50 font-semibold">
                          <tr>
                            <td colSpan={3} className="px-6 py-3 text-right text-gray-700">Totais:</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">{formatarValor(totaisLinhas.custo)}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">{formatarValor(totaisLinhas.venda)}</td>
                            <td className="px-4 py-3 text-right font-mono text-green-700">{formatarValor(venda.lucro_total)}</td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{formatarValor(venda.comissao_total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500 text-sm italic">
                      Esta venda não tem linhas de artigos
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
