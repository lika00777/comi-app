'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { X, Package } from 'lucide-react'
import { LinhaVenda, TipoArtigo } from '@/types/database'
import { formatarValor } from '@/lib/calculos/lucro'

interface DetalhesVendaModalProps {
  venda: {
    numero_fatura: string
    data_venda: string
    clientes?: { nome: string } | null
    linhas_venda: LinhaVenda[]
  }
  onClose: () => void
}

export default function DetalhesVendaModal({ venda, onClose }: DetalhesVendaModalProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT')
  }

  // Calcular totais
  const totais = venda.linhas_venda.reduce((acc, linha) => {
    // Calcular preço de venda unitário
    let precoVendaUnitario = 0
    if (linha.metodo_calculo === 'manual') {
      precoVendaUnitario = (linha.preco_custo || 0) + (linha.lucro_manual || 0)
    } else if (linha.metodo_calculo === 'margem_custo' && linha.preco_custo && linha.percentagem_custo) {
      const lucroUnitario = linha.preco_custo * (linha.percentagem_custo / 100)
      precoVendaUnitario = linha.preco_custo + lucroUnitario
    } else if (linha.metodo_calculo === 'margem_venda') {
      precoVendaUnitario = linha.preco_venda || 0
    }

    // Aplicar desconto
    const precoComDesconto = precoVendaUnitario * (1 - (linha.percentagem_desconto || 0) / 100)
    const totalVenda = precoComDesconto * linha.quantidade
    const totalCusto = (linha.preco_custo || 0) * linha.quantidade

    return {
      custo: acc.custo + totalCusto,
      venda: acc.venda + totalVenda,
      lucro: acc.lucro + linha.lucro_calculado,
      comissao: acc.comissao + linha.comissao_calculada
    }
  }, { custo: 0, venda: 0, lucro: 0, comissao: 0 })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Detalhes da Venda</CardTitle>
                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                  <span className="font-mono font-medium">{venda.numero_fatura}</span>
                  <span>•</span>
                  <span>{formatDate(venda.data_venda)}</span>
                  <span>•</span>
                  <span className="font-medium">{venda.clientes?.nome || 'Cliente desconhecido'}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
              <TableRow>
                <TableHead>Artigo</TableHead>
                <TableHead className="w-16 text-center">Qtd</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead className="w-24 text-right">Custo</TableHead>
                <TableHead className="w-24 text-right">Venda</TableHead>
                <TableHead className="w-24 text-right">Margem</TableHead>
                <TableHead className="w-20 text-right">% Com.</TableHead>
                <TableHead className="w-28 text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venda.linhas_venda.map((linha, idx) => {
                // Calcular preço de venda unitário baseado no método
                let precoVendaUnitario = 0
                if (linha.metodo_calculo === 'manual') {
                  precoVendaUnitario = (linha.preco_custo || 0) + (linha.lucro_manual || 0)
                } else if (linha.metodo_calculo === 'margem_custo' && linha.preco_custo && linha.percentagem_custo) {
                  const lucroUnitario = linha.preco_custo * (linha.percentagem_custo / 100)
                  precoVendaUnitario = linha.preco_custo + lucroUnitario
                } else if (linha.metodo_calculo === 'margem_venda') {
                  precoVendaUnitario = linha.preco_venda || 0
                }

                // Aplicar desconto
                const precoComDesconto = precoVendaUnitario * (1 - (linha.percentagem_desconto || 0) / 100)
                const totalVenda = precoComDesconto * linha.quantidade
                const totalCusto = (linha.preco_custo || 0) * linha.quantidade

                return (
                  <TableRow key={linha.id || idx} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium">{linha.artigo}</TableCell>
                    <TableCell className="text-center">{linha.quantidade}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {linha.tipo_artigo_id ? 'Tipo configurado' : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatarValor(totalCusto)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {formatarValor(totalVenda)}
                      {linha.percentagem_desconto ? (
                        <span className="text-xs text-orange-600 ml-1">(-{linha.percentagem_desconto}%)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${linha.lucro_calculado < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatarValor(linha.lucro_calculado)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600">
                      {linha.percentagem_comissao_snapshot}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-blue-600">
                      {formatarValor(linha.comissao_calculada)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>

        <div className="border-t bg-gray-50 p-4">
          <div className="grid grid-cols-4 gap-4 max-w-3xl ml-auto">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Total Custo</p>
              <p className="text-lg font-semibold text-gray-700">{formatarValor(totais.custo)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Total Venda</p>
              <p className="text-lg font-semibold text-gray-900">{formatarValor(totais.venda)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Total Lucro</p>
              <p className="text-lg font-semibold text-green-700">{formatarValor(totais.lucro)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Total Comissão</p>
              <p className="text-xl font-bold text-blue-600">{formatarValor(totais.comissao)}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
