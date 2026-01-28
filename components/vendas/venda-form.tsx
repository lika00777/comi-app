'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Cliente, TipoArtigo, Venda, LinhaVenda, MetodoCalculo, EstadoVenda } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert } from '@/components/ui/alert'
import { Trash2, Plus, Calculator } from 'lucide-react'
import { calcularLucro, formatarValor, calcularLucroMargemCusto, calcularDetalhesLinha } from '@/lib/calculos/lucro'
import { calcularComissao } from '@/lib/calculos/comissao'
import ExtrairVendaModal from './extrair-venda-modal'
import ValidacaoVendaModal from './validacao-venda-modal'
import { Sparkles } from 'lucide-react'

interface VendaFormProps {
  vendaInicial?: Venda & { linhas: LinhaVenda[], cliente: Cliente }
  modoEdicao?: boolean
}

interface LinhaTemp {
  id: string // temp id
  artigo: string
  tipo_artigo_id: string
  quantidade: number
  metodo_calculo: MetodoCalculo
  lucro_manual?: number
  preco_custo?: number
  percentagem_custo?: number
  preco_venda?: number
  percentagem_venda?: number
  percentagem_desconto?: number
  
  // Calculados UI
  lucro_calculado: number
  comissao_calculada: number
  preco_venda_calculado: number
  total_linha: number
  percentagem_comissao_snapshot: number // Preservar histórico
}

export default function VendaForm({ vendaInicial, modoEdicao = false }: VendaFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // Data sources
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tiposArtigo, setTiposArtigo] = useState<TipoArtigo[]>([])
  
  // Form State
  const [clienteId, setClienteId] = useState(vendaInicial?.cliente_id || '')
  const [numeroFatura, setNumeroFatura] = useState(vendaInicial?.numero_fatura || '')
  const [dataVenda, setDataVenda] = useState(vendaInicial?.data_venda || new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState(vendaInicial?.observacoes || '')
  const [estado, setEstado] = useState<EstadoVenda>(vendaInicial?.estado || 'pendente')
  
  // Lines State
  const [linhas, setLinhas] = useState<LinhaTemp[]>([])
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // IA State
  const [showExtrairModal, setShowExtrairModal] = useState(false)
  const [showValidacaoModal, setShowValidacaoModal] = useState(false)
  const [dadosIA, setDadosIA] = useState<any>(null)

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true)
      try {
        const [resClientes, resTipos] = await Promise.all([
          supabase.from('clientes').select('*').order('nome'),
          supabase.from('tipos_artigo').select('*').eq('ativo', true).order('nome')
        ])
        
        if (resClientes.error) throw resClientes.error
        if (resTipos.error) throw resTipos.error
        
        setClientes((resClientes.data as any) || [])
        setTiposArtigo((resTipos.data as any) || [])
        
        // Se modo edição, carregar linhas e recalcular campos de UI
        if (modoEdicao && vendaInicial && vendaInicial.linhas) {
          const linhasFormatadas: LinhaTemp[] = vendaInicial.linhas.map(l => {
            // Recalcular totais de UI para garantir consistência
            let precoUnitario = 0
            if (l.metodo_calculo === 'manual') {
              precoUnitario = (l.preco_custo || 0) + (l.lucro_manual || 0)
            } else if (l.metodo_calculo === 'margem_custo' && l.preco_custo && l.percentagem_custo) {
              const res = calcularLucroMargemCusto(l.preco_custo, l.percentagem_custo, 1)
              precoUnitario = res.preco_venda
            } else if (l.metodo_calculo === 'margem_venda') {
              precoUnitario = l.preco_venda || 0
            }

            return {
              id: l.id,
              artigo: l.artigo,
              tipo_artigo_id: l.tipo_artigo_id,
              quantidade: l.quantidade,
              metodo_calculo: l.metodo_calculo,
              lucro_manual: l.lucro_manual || undefined,
              preco_custo: l.preco_custo || undefined,
              percentagem_custo: l.percentagem_custo || undefined,
              preco_venda: l.preco_venda || undefined,
              percentagem_venda: l.percentagem_venda || undefined,
              percentagem_desconto: l.percentagem_desconto || 0,
              
               // Campos calculados (usar os da BD ou recalcular se necessário)
              lucro_calculado: l.lucro_calculado,
              comissao_calculada: l.comissao_calculada,
              preco_venda_calculado: precoUnitario,
              total_linha: (precoUnitario * (1 - (l.percentagem_desconto || 0) / 100)) * l.quantidade,
              percentagem_comissao_snapshot: l.percentagem_comissao_snapshot
            }
          })
          setLinhas(linhasFormatadas)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [modoEdicao, vendaInicial])

  const adicionarLinha = () => {
    if (tiposArtigo.length === 0) {
      setError('Crie primeiro tipos de artigo antes de adicionar linhas.')
      return
    }

    const novaLinha: LinhaTemp = {
      id: Math.random().toString(36).substr(2, 9),
      artigo: '',
      tipo_artigo_id: tiposArtigo[0].id,
      quantidade: 1,
      metodo_calculo: 'manual',
      lucro_manual: 0,
      percentagem_desconto: 0,
      lucro_calculado: 0,
      comissao_calculada: 0,
      preco_venda_calculado: 0,
      total_linha: 0,
      percentagem_comissao_snapshot: tiposArtigo[0].percentagem_comissao
    }
    setLinhas([...linhas, novaLinha])
  }

  const removerLinha = (id: string) => {
    setLinhas(linhas.filter(l => l.id !== id))
  }

  const atualizarLinha = (id: string, campo: keyof LinhaTemp, valor: any) => {
    setLinhas(linhas.map(l => {
      if (l.id !== id) return l
      
      // Converter NaN ou campos vazios para 0 em campos numéricos
      let valorFinal = valor
      if (typeof valor === 'number' && isNaN(valor)) {
        valorFinal = 0
      }

      const linhaAtualizada = { ...l, [campo]: valorFinal }
      
      // Recalcular
      try {
        const quantidade = Number(linhaAtualizada.quantidade)
        if (quantidade > 0) {
          const lucro = calcularLucro({
            quantidade: quantidade,
            metodo_calculo: linhaAtualizada.metodo_calculo,
            lucro_manual: Number(linhaAtualizada.lucro_manual),
            preco_custo: Number(linhaAtualizada.preco_custo),
            percentagem_custo: Number(linhaAtualizada.percentagem_custo),
            preco_venda: Number(linhaAtualizada.preco_venda),
            percentagem_venda: Number(linhaAtualizada.percentagem_venda),
            percentagem_desconto: Number(linhaAtualizada.percentagem_desconto)
          })
          
          const detalhes = calcularDetalhesLinha(linhaAtualizada)
          
          linhaAtualizada.lucro_calculado = detalhes.lucro
          linhaAtualizada.preco_venda_calculado = detalhes.precoVendaUnitarioFinal
          linhaAtualizada.total_linha = detalhes.totalVenda

          const tipo = tiposArtigo.find(t => t.id === linhaAtualizada.tipo_artigo_id)
          if (tipo) {
            // Se o tipo mudou, atualiza o snapshot para a percentagem atual do novo tipo
            if (campo === 'tipo_artigo_id') {
              linhaAtualizada.percentagem_comissao_snapshot = tipo.percentagem_comissao
            }
            linhaAtualizada.comissao_calculada = calcularComissao(detalhes.lucro, linhaAtualizada.percentagem_comissao_snapshot)
          }
        } else {
          linhaAtualizada.lucro_calculado = 0
          linhaAtualizada.comissao_calculada = 0
          linhaAtualizada.preco_venda_calculado = 0
          linhaAtualizada.total_linha = 0
        }

      } catch (e) {
        // Erro de cálculo silencioso durante edição
      }
      
      return linhaAtualizada
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (linhas.length === 0) {
      setError('Adicione pelo menos uma linha de venda.')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilizador não autenticado')

      // 1. Criar/Atualizar Venda
      const vendaData = {
        utilizador_id: user.id,
        cliente_id: clienteId,
        numero_fatura: numeroFatura,
        data_venda: dataVenda,
        observacoes,
        estado,
        // Totais calculados automaticamente por triggers, mas podemos enviar para display imediato se fosse o caso
      }

      let vendaId_final = ''

      if (modoEdicao && vendaInicial) {
        // Update
        // @ts-ignore - Erro de inferência complexa do Supabase
        const { error: updateError } = await supabase
          .from('vendas')
          // @ts-ignore
          .update(vendaData)
          .eq('id', vendaInicial.id)
        
        if (updateError) throw updateError
        vendaId_final = vendaInicial.id
        
        // Deletar linhas antigas e inserir novas (mais simples para MVP)
        // @ts-ignore
        await supabase.from('linhas_venda').delete().eq('venda_id', vendaId_final)
      } else {
        // Insert
        // @ts-ignore
        const { data: novaVenda, error: insertError } = await supabase
          .from('vendas')
          // @ts-ignore
          .insert(vendaData)
          .select()
          .single()
        
        if (insertError) throw insertError
        // @ts-ignore
        vendaId_final = novaVenda.id
      }

      // 2. Inserir Linhas
      const linhasParaInserir = linhas.map(l => {
        const tipo = tiposArtigo.find(t => t.id === l.tipo_artigo_id)
        return {
          venda_id: vendaId_final,
          artigo: l.artigo,
          tipo_artigo_id: l.tipo_artigo_id,
          quantidade: l.quantidade,
          metodo_calculo: l.metodo_calculo,
          lucro_manual: l.lucro_manual || null,
          preco_custo: l.preco_custo || null,
          percentagem_custo: l.percentagem_custo || null,
          preco_venda: l.preco_venda || null,
          percentagem_venda: l.percentagem_venda || null,
          percentagem_desconto: l.percentagem_desconto || 0,
          percentagem_comissao_snapshot: l.percentagem_comissao_snapshot
        }
      })

      // @ts-ignore
      const { error: linhasError } = await supabase
        .from('linhas_venda')
        // @ts-ignore
        .insert(linhasParaInserir)

      if (linhasError) throw linhasError

      router.push('/vendas')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Totais (UI apenas)
  const totalComissao = linhas.reduce((acc, l) => acc + l.comissao_calculada, 0)
  const totalLucro = linhas.reduce((acc, l) => acc + l.lucro_calculado, 0)
  const totalFatura = linhas.reduce((acc, l) => acc + l.total_linha, 0)

  // IA Handlers
  const handleExtractionComplete = (data: any) => {
    setDadosIA(data)
    setShowExtrairModal(false)
    setShowValidacaoModal(true)
  }

  const handleValidationConfirm = (validatedData: any) => {
    setClienteId(validatedData.cliente_id)
    if (validatedData.numero_fatura) setNumeroFatura(validatedData.numero_fatura)
    if (validatedData.data) setDataVenda(validatedData.data)

    // Converter itens da IA em linhas do formulário
    const novasLinhas: LinhaTemp[] = validatedData.itens.map((item: any) => {
      const id = Math.random().toString(36).substr(2, 9)
      const tipo = tiposArtigo.find(t => t.id === item.tipo_artigo_id)
      
      const precoCusto = item.preco_custo || 0
      const lucroManual = item.preco_unitario - precoCusto
      
      const detalhes = calcularDetalhesLinha({
        quantidade: item.quantidade,
        metodo_calculo: 'manual',
        preco_custo: precoCusto,
        lucro_manual: lucroManual,
        percentagem_desconto: 0
      })
      
      return {
        id,
        artigo: item.artigo,
        tipo_artigo_id: item.tipo_artigo_id,
        quantidade: item.quantidade,
        metodo_calculo: 'manual',
        preco_custo: precoCusto,
        lucro_manual: lucroManual,
        percentagem_desconto: 0,
        lucro_calculado: detalhes.lucro,
        comissao_calculada: calcularComissao(detalhes.lucro, tipo?.percentagem_comissao || 0),
        preco_venda_calculado: detalhes.precoVendaUnitarioFinal,
        total_linha: detalhes.totalVenda,
        percentagem_comissao_snapshot: tipo?.percentagem_comissao || 0
      }
    })

    setLinhas(novasLinhas)
    setShowValidacaoModal(false)
  }

  if (loadingData) return <div className="text-center p-8">A carregar dados...</div>

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Dados Gerais */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Dados da Fatura</CardTitle>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 font-semibold"
            onClick={() => setShowExtrairModal(true)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Extrair com IA
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente</label>
            <div className="relative">
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            {clientes.length === 0 && (
              <p className="text-xs text-red-500">Adicione clientes primeiro</p>
            )}
          </div>

          <Input 
            label="Nº Fatura" 
            value={numeroFatura} 
            onChange={e => setNumeroFatura(e.target.value)}
            required
            placeholder="Ex: FT 2024/001"
          />

          <Input 
            label="Data" 
            type="date"
            value={dataVenda} 
            onChange={e => setDataVenda(e.target.value)}
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={estado}
              onChange={e => setEstado(e.target.value as any)}
            >
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Pago (Boa Cobrança)</option>
            </select>
          </div>
        </CardContent>
      </Card>
      
      {/* Linhas de Venda */}
      <Card>
        <CardHeader>
          <CardTitle>Itens da Venda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {linhas.map((linha, index) => (
              <div key={linha.id} className="p-4 border rounded-lg bg-gray-50 relative">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  onClick={() => removerLinha(linha.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <Input 
                    label="Artigo" 
                    placeholder="Descrição do produto/serviço"
                    value={linha.artigo}
                    onChange={e => atualizarLinha(linha.id, 'artigo', e.target.value)}
                    required
                    className="md:col-span-2"
                  />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={linha.tipo_artigo_id}
                      onChange={e => atualizarLinha(linha.id, 'tipo_artigo_id', e.target.value)}
                      required
                    >
                      {tiposArtigo.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.percentagem_comissao}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input 
                    label="Quantidade" 
                    type="number"
                    min="1"
                    value={linha.quantidade}
                    onChange={e => atualizarLinha(linha.id, 'quantidade', parseFloat(e.target.value))}
                    required
                  />
                </div>

                {/* Área de Cálculo */}
                <div className="bg-white p-4 rounded border">
                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm font-medium flex items-center">
                      <Calculator className="w-4 h-4 mr-2" />
                      Método:
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input 
                          type="radio" 
                          checked={linha.metodo_calculo === 'manual'}
                          onChange={() => atualizarLinha(linha.id, 'metodo_calculo', 'manual')}
                        /> Lucro Manual
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input 
                          type="radio" 
                          checked={linha.metodo_calculo === 'margem_custo'}
                          onChange={() => atualizarLinha(linha.id, 'metodo_calculo', 'margem_custo')}
                        /> Margem s/ Custo
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input 
                          type="radio" 
                          checked={linha.metodo_calculo === 'margem_venda'}
                          onChange={() => atualizarLinha(linha.id, 'metodo_calculo', 'margem_venda')}
                        /> Margem s/ Venda
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Campos dinâmicos baseados no método */}
                    {linha.metodo_calculo === 'manual' && (
                      <>
                        <Input 
                          label="Preço Custo (€)"
                          type="number" step="0.01"
                          value={linha.preco_custo || ''}
                          onChange={e => atualizarLinha(linha.id, 'preco_custo', parseFloat(e.target.value))}
                        />
                        <Input 
                          label="Lucro Unitário (€)"
                          type="number" step="0.01"
                          value={linha.lucro_manual || ''}
                          onChange={e => atualizarLinha(linha.id, 'lucro_manual', parseFloat(e.target.value))}
                          className="border-blue-200 bg-blue-50"
                        />
                      </>
                    )}

                    {linha.metodo_calculo === 'margem_custo' && (
                      <>
                        <Input 
                          label="Preço Custo (€)"
                          type="number" step="0.01"
                          value={linha.preco_custo || ''}
                          onChange={e => atualizarLinha(linha.id, 'preco_custo', parseFloat(e.target.value))}
                        />
                        <Input 
                          label="Margem (%)"
                          type="number" step="0.01"
                          value={linha.percentagem_custo || ''}
                          onChange={e => atualizarLinha(linha.id, 'percentagem_custo', parseFloat(e.target.value))}
                        />
                      </>
                    )}

                    {linha.metodo_calculo === 'margem_venda' && (
                      <>
                        <Input 
                          label="Preço Venda (€)"
                          type="number" step="0.01"
                          value={linha.preco_venda || ''}
                          onChange={e => atualizarLinha(linha.id, 'preco_venda', parseFloat(e.target.value))}
                        />
                        <Input 
                          label="Margem (%)"
                          type="number" step="0.01"
                          value={linha.percentagem_venda || ''}
                          onChange={e => atualizarLinha(linha.id, 'percentagem_venda', parseFloat(e.target.value))}
                        />
                      </>
                    )}

                    <Input 
                      label="Desconto (%)"
                      type="number" step="0.01" min="0" max="100"
                      value={isNaN(Number(linha.percentagem_desconto)) ? '' : (linha.percentagem_desconto ?? '')}
                      onChange={e => atualizarLinha(linha.id, 'percentagem_desconto', parseFloat(e.target.value))}
                    />

                    {/* Resultados da Linha */}
                    <div className="md:col-start-3 md:col-span-2 pt-4 md:pt-0">
                      <div className="flex justify-end gap-6 mb-2">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Valor Venda</p>
                          <p className="font-semibold text-gray-900">{formatarValor(linha.total_linha)}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-6 border-t pt-2 border-gray-100">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Lucro Estimado</p>
                          <p className="font-semibold text-gray-700">{formatarValor(linha.lucro_calculado)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Comissão Prevista</p>
                          <p className="font-bold text-blue-600 text-lg">{formatarValor(linha.comissao_calculada)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {linhas.length === 0 && (
              <p className="text-center text-gray-500 py-8 italic">
                Nenhum item adicionado. Clique em "Adicionar Item" para começar.
              </p>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button type="button" onClick={adicionarLinha} className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Final */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:pl-72 shadow-lg z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-gray-500">Total Fatura</p>
              <p className="text-xl font-bold text-gray-900">{formatarValor(totalFatura)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Lucro</p>
              <p className="text-lg font-semibold">{formatarValor(totalLucro)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Comissão</p>
              <p className="text-2xl font-bold text-blue-600">{formatarValor(totalComissao)}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'A guardar...' : (modoEdicao ? 'Atualizar Venda' : 'Salvar Venda')}
            </Button>
          </div>
        </div>
      </div>
      <div className="h-24"></div> {/* Espaçador para o footer fixo */}

      {/* IA Modals */}
      {showExtrairModal && (
        <ExtrairVendaModal 
          onClose={() => setShowExtrairModal(false)} 
          onExtractionComplete={handleExtractionComplete}
        />
      )}

      {showValidacaoModal && dadosIA && (
        <ValidacaoVendaModal 
          data={dadosIA}
          onClose={() => setShowValidacaoModal(false)}
          onConfirm={handleValidationConfirm}
        />
      )}
    </form>
  )
}
