'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export default function NovoPagamentoPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])
  const [valor, setValor] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const valorNum = parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('O valor deve ser um número positivo')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilizador não autenticado')

      const { error: insertError } = await supabase
        .from('pagamentos_recebidos')
        .insert({
          utilizador_id: user.id,
          data_pagamento: dataPagamento,
          valor: valorNum,
          periodo_referencia: periodo,
          observacoes: observacoes || null
        })

      if (insertError) throw insertError

      router.push('/pagamentos')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Sugerir mês anterior como padrão
  const handleSugerirPeriodo = () => {
    const data = new Date()
    data.setMonth(data.getMonth() - 1)
    const mes = data.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
    // Capitalizar primeira letra
    setPeriodo(mes.charAt(0).toUpperCase() + mes.slice(1))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Novo Pagamento</h1>
        <p className="text-gray-600 mt-1">
          Registe um pagamento de comissão recebido
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Data do Recebimento"
                type="date"
                value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)}
                required
              />

              <Input
                label="Valor Recebido (€)"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ex: 1500.00"
                value={valor}
                onChange={e => setValor(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Período de Referência *</label>
                <button 
                  type="button" 
                  onClick={handleSugerirPeriodo}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Sugerir Mês Passado
                </button>
              </div>
              <Input
                placeholder="Ex: Janeiro 2026"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Observações</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Notas adicionais sobre este pagamento..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} className="w-full">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'A registar...' : 'Registar Pagamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
