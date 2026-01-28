import VendaForm from '@/components/vendas/venda-form'

export default function NovaVendaPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nova Venda</h1>
        <p className="text-gray-600 mt-1">
          Registe uma nova venda para calcular a sua comissão
        </p>
      </div>
      
      <VendaForm />
    </div>
  )
}
