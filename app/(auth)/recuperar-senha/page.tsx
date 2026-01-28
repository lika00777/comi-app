'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/alterar-senha`,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Enviámos um link de recuperação para o seu email.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ocorreu um erro ao processar o seu pedido.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2">
            <Link href="/entrar" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </Link>
          </div>
          <CardTitle>Recuperar Palavra-passe</CardTitle>
          <CardDescription>
            Introduza o seu email para receber um link de recuperação
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            {message && (
              <Alert variant={message.type === 'error' ? 'danger' : 'success'}>
                {message.text}
              </Alert>
            )}
            
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.pt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'A enviar...' : 'Enviar Link de Recuperação'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
