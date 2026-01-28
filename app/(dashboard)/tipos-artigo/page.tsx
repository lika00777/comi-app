'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TipoArtigo } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function TiposArtigoPage() {
  const [tipos, setTipos] = useState<TipoArtigo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form state
  const [nome, setNome] = useState('')
  const [percentagem, setPercentagem] = useState('')
  const [ativo, setAtivo] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchTipos()
  }, [])

  const fetchTipos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tipos_artigo')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) throw error
      setTipos(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setPercentagem('')
    setAtivo(true)
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (tipo: TipoArtigo) => {
    setNome(tipo.nome)
    setPercentagem(tipo.percentagem_comissao.toString())
    setAtivo(tipo.ativo)
    setEditingId(tipo.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const percentagemNum = parseFloat(percentagem)
    if (isNaN(percentagemNum) || percentagemNum < 0 || percentagemNum > 100) {
      setError('Percentagem deve estar entre 0 e 100')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilizador não autenticado')

      if (editingId) {
        // Update
        const { error: updateError } = await supabase
          .from('tipos_artigo')
          .update({
            nome,
            percentagem_comissao: percentagemNum,
            ativo,
          })
          .eq('id', editingId)

        if (updateError) throw updateError
        setSuccess('Tipo de artigo atualizado com sucesso')
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('tipos_artigo')
          .insert({
            utilizador_id: user.id,
            nome,
            percentagem_comissao: percentagemNum,
            ativo,
          })

        if (insertError) throw insertError
        setSuccess('Tipo de artigo criado com sucesso')
      }

      resetForm()
      fetchTipos()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este tipo de artigo?')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('tipos_artigo')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      setSuccess('Tipo de artigo eliminado com sucesso')
      fetchTipos()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tipos de Artigo</h1>
          <p className="text-gray-600 mt-1">
            Gerir tipos de artigo e percentagens de comissão
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tipo
        </Button>
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
              {editingId ? 'Editar Tipo de Artigo' : 'Novo Tipo de Artigo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome"
                  placeholder="Ex: Hardware, Software, Serviços"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
                
                <Input
                  label="Percentagem de Comissão (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Ex: 10"
                  value={percentagem}
                  onChange={(e) => setPercentagem(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Ativo
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
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
          ) : tipos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Nenhum tipo de artigo encontrado. Crie o primeiro!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Percentagem</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                    <TableCell>{tipo.percentagem_comissao}%</TableCell>
                    <TableCell>
                      <Badge variant={tipo.ativo ? 'success' : 'default'}>
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tipo.criado_em).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tipo)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tipo.id)}
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
