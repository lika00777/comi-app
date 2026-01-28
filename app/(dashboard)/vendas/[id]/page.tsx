import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VendaForm from '@/components/vendas/venda-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarVendaPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch venda com linhas e cliente
  const { data: venda, error } = await supabase
    .from('vendas')
    .select(`
      *,
      linhas:linhas_venda(*),
      cliente:clientes(*)
    `)
    .eq('id', id)
    .single()

  if (error || !venda) {
    notFound()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Venda</h1>
        <p className="text-gray-600 mt-1">
          {venda.numero_fatura} - {new Date(venda.data_venda).toLocaleDateString('pt-PT')}
        </p>
      </div>
      
      <VendaForm 
        vendaInicial={venda as any} 
        modoEdicao={true} 
      />
    </div>
  )
}
