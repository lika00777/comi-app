'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, AlertCircle, Plus, Users, Box, Calendar, Hash, FileText, ChevronRight } from 'lucide-react'
import { Cliente, TipoArtigo } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface ValidacaoVendaModalProps {
  data: any
  onClose: () => void
  onConfirm: (validatedData: any) => void
}

export default function ValidacaoVendaModal({ data, onClose, onConfirm }: ValidacaoVendaModalProps) {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tiposArtigo, setTiposArtigo] = useState<TipoArtigo[]>([])
  const [loading, setLoading] = useState(true)

  // Mapeamentos
  const [selectedClienteId, setSelectedClienteId] = useState('')
  const [mappedItens, setMappedItens] = useState<any[]>([])

  useEffect(() => {
    async function loadResources() {
      const [resClientes, resTipos] = await Promise.all([
        supabase.from('clientes').select('*').order('nome'),
        supabase.from('tipos_artigo').select('*').eq('ativo', true).order('nome')
      ])

      const allClientes: Cliente[] = (resClientes.data as any) || []
      const allTipos: TipoArtigo[] = (resTipos.data as any) || []
      
      setClientes(allClientes)
      setTiposArtigo(allTipos)

      // Tentativa de Matching Automático de Cliente
      if (data.cliente_nome) {
        const match = allClientes.find((c: Cliente) => 
          c.nome.toLowerCase().includes(data.cliente_nome.toLowerCase()) ||
          data.cliente_nome.toLowerCase().includes(c.nome.toLowerCase())
        )
        if (match) setSelectedClienteId(match.id)
      }

      // Matching de Itens
      const initialMappedItens = data.itens.map((item: any) => {
        const tipoMatch = allTipos.find((t: TipoArtigo) => 
          t.nome.toLowerCase().includes(item.tipo_sugerido?.toLowerCase() || '') ||
          item.artigo.toLowerCase().includes(t.nome.toLowerCase())
        )
        return {
          ...item,
          tipo_artigo_id: tipoMatch?.id || (allTipos.length > 0 ? allTipos[0].id : ''),
          preco_custo: 0 // Incializa com 0 para o utilizador preencher
        }
      })
      setMappedItens(initialMappedItens)
      
      setLoading(false)
    }
    loadResources()
  }, [data, supabase])

  const handleConfirm = () => {
    onConfirm({
      ...data,
      cliente_id: selectedClienteId,
      itens: mappedItens
    })
  }

  if (loading) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-lg text-green-600">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Validar Informação Extraída</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Confirma se os dados abaixo estão corretos antes de avançar.</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Cabeçalho da Fatura */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Nº Fatura
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border font-mono text-sm">
                {data.numero_fatura || 'Não detetado'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Data
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                {data.data || 'Não detetada'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Cliente (Correspondência)
              </label>
              <div className="flex gap-2">
                <select 
                  className={`flex-1 p-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 transition-all ${
                    !selectedClienteId ? 'border-amber-300 bg-amber-50' : 'bg-white'
                  }`}
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(e.target.value)}
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const nome = prompt('Nome do novo cliente:', data.cliente_nome || '')
                    if (nome) {
                      // Aqui poderíamos chamar a API para criar, mas para o MVP vamos apenas 
                      // deixar o utilizador saber que terá de o fazer ou automatizar no futuro
                      alert('Funcionalidade de criação rápida em desenvolvimento. Por agora, selecione um cliente existente.')
                    }
                  }}
                  className="px-2 border-dashed"
                  title="Criar novo cliente"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {!selectedClienteId && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                  <AlertCircle className="w-3 h-3" /> IA detetou: "{data.cliente_nome}"
                </div>
              )}
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
              <Box className="w-3 h-3" /> Itens da Fatura ({mappedItens.length})
            </label>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase font-bold border-b">
                  <tr>
                    <th className="px-4 py-3">Artigo</th>
                    <th className="px-4 py-3 w-16 text-center">Qtd</th>
                    <th className="px-4 py-3 w-28">Tipo de Artigo</th>
                    <th className="px-4 py-3 w-28 text-right">Custo (€)</th>
                    <th className="px-4 py-3 w-28 text-right">Venda (€)</th>
                    <th className="px-4 py-3 w-24 text-right">Margem</th>
                    <th className="px-4 py-3 w-20 text-right">% Com.</th>
                    <th className="px-4 py-3 w-28 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mappedItens.map((item, idx) => {
                    const tipo = tiposArtigo.find(t => t.id === item.tipo_artigo_id)
                    const precoVenda = Number(item.preco_unitario) || 0
                    const precoCusto = Number(item.preco_custo) || 0
                    const margem = (precoVenda - precoCusto) * item.quantidade
                    const percComissao = tipo?.percentagem_comissao || 0
                    const valorComissao = margem * (percComissao / 100)

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-700">{item.artigo}</td>
                        <td className="px-4 py-3 text-center">{item.quantidade}</td>
                        <td className="px-4 py-3">
                          <select 
                            className="w-full p-1.5 rounded border text-[12px] bg-white"
                            value={item.tipo_artigo_id}
                            onChange={(e) => {
                              const newItens = [...mappedItens]
                              newItens[idx].tipo_artigo_id = e.target.value
                              setMappedItens(newItens)
                            }}
                          >
                            {tiposArtigo.map(t => (
                              <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number"
                            step="0.01"
                            className="w-full p-1.5 rounded border text-[12px] text-right"
                            value={item.preco_custo}
                            onChange={(e) => {
                              const newItens = [...mappedItens]
                              newItens[idx].preco_custo = parseFloat(e.target.value) || 0
                              setMappedItens(newItens)
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number"
                            step="0.01"
                            className="w-full p-1.5 rounded border text-[12px] text-right font-medium"
                            value={item.preco_unitario}
                            onChange={(e) => {
                              const newItens = [...mappedItens]
                              newItens[idx].preco_unitario = parseFloat(e.target.value) || 0
                              setMappedItens(newItens)
                            }}
                          />
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-[12px] ${margem < 0 ? 'text-red-500' : 'text-gray-600'}`}>
                          {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(margem)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-[12px]">
                          {percComissao}%
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600 text-[12px]">
                          {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valorComissao)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>

        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            disabled={!selectedClienteId}
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Preencher Formulário <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
