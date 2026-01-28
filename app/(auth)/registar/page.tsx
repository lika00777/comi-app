'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export default function RegisterPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validações
    if (password !== confirmPassword) {
      setError('As passwords não coincidem')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // Criar utilizador
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome,
          }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (authData.user) {
        // Criar perfil de utilizador
        const { error: profileError } = await supabase
          .from('utilizadores')
          .insert({
            id: authData.user.id,
            nome: nome,
            email: email,
          })

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError)
          // Continuar mesmo com erro no perfil
        }
      }

      // Redirecionar para dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Ocorreu um erro ao criar a conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados para criar a sua conta
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="danger" dismissible onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <Input
              label="Nome"
              type="text"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={loading}
            />
            
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.pt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            
            <Input
              label="Confirmar Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'A criar conta...' : 'Criar Conta'}
            </Button>
            
            <p className="text-sm text-center text-gray-600">
              Já tem conta?{' '}
              <Link href="/entrar" className="text-blue-600 hover:underline">
                Iniciar sessão
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
