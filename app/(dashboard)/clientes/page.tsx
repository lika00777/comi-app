'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Cliente } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert } from '@/components/ui/alert'
import { Plus, Edit, Trash2, Search, Phone, Mail, MapPin } from 'lucide-react'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form state
  const [nome, setNome] = useState('')
  const [nif, setNif] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [morada, setMorada] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchClientes()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClientes(clientes)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredClientes(
        clientes.filter(c => 
          c.nome.toLowerCase().includes(term) || 
          (c.nif && c.nif.includes(term)) ||
          (c.email && c.email.toLowerCase().includes(term))
        )
      )
    }
  }, [searchTerm, clientes])

  const fetchClientes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) throw error
      setClientes(data || [])
      setFilteredClientes(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setNif('')
    setEmail('')
    setTelefone('')
    setMorada('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (cliente: Cliente) => {
    setNome(cliente.nome)
    setNif(cliente.nif || '')
    setEmail(cliente.email || '')
    setTelefone(cliente.telefone || '')
    setMorada(cliente.morada || '')
    setEditingId(cliente.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilizador não autenticado')

      const clienteData = {
        nome,
        nif: nif || null,
        email: email || null,
        telefone: telefone || null,
        morada: morada || null,
      }

      if (editingId) {
        // Update
        const { error: updateError } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', editingId)

        if (updateError) throw updateError
        setSuccess('Cliente atualizado com sucesso')
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('clientes')
          .insert({
            utilizador_id: user.id,
            ...clienteData
          })

        if (insertError) throw insertError
        setSuccess('Cliente criado com sucesso')
      }

      resetForm()
      fetchClientes()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este cliente? As vendas associadas também poderão ser afetadas.')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      setSuccess('Cliente eliminado com sucesso')
      fetchClientes()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">
            Gerir carteira de clientes
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="h-10 rounded-md border border-gray-300 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onDismiss={() => setError(null)} className="mb-6">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(null)} className="mb-6">
          {success}
        </Alert>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Cliente' : 'Novo Cliente'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome *"
                  placeholder="Nome da empresa ou cliente"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
                
                <Input
                  label="NIF"
                  placeholder="Número de Identificação Fiscal"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                />
                
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@cliente.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Telefone"
                  placeholder="+351 900 000 000"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>

              <Input
                label="Morada"
                placeholder="Rua, Código Postal, Cidade"
                value={morada}
                onChange={(e) => setMorada(e.target.value)}
              />

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8 text-gray-500">A carregar...</p>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Nenhum cliente encontrado para a pesquisa.' : 'Ainda não tem clientes registados.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)}>
                  Criar Primeiro Cliente
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contactos</TableHead>
                  <TableHead>NIF</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.nome}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        {cliente.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {cliente.email}
                          </div>
                        )}
                        {cliente.telefone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {cliente.telefone}
                          </div>
                        )}
                        {!cliente.email && !cliente.telefone && '-'}
                      </div>
                    </TableCell>
                    <TableCell>{cliente.nif || '-'}</TableCell>
                    <TableCell>
                      {cliente.morada ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[200px]" title={cliente.morada}>
                            {cliente.morada}
                          </span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cliente)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cliente.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
