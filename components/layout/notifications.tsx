'use client'

import { useState, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

interface Alerta {
  id: string
  mensagem: string
  tipo: 'divergencia' | 'cobranca' | 'previsao'
  lido: boolean
  criado_em: string
}

export function Notifications() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  const fetchAlertas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('alertas')
      .select('*')
      .eq('lido', false)
      .order('criado_em', { ascending: false })
      .limit(10)

    if (data) {
      setAlertas(data as any)
      setUnreadCount(data.length)
    }
  }

  useEffect(() => {
    fetchAlertas()
    // Polling simples a cada 60s
    const interval = setInterval(fetchAlertas, 60000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id: string) => {
    await supabase
      .from('alertas')
      .update({ lido: true })
      .eq('id', id)
    
    // Atualizar estado local
    setAlertas(prev => prev.filter(a => a.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('alertas')
      .update({ lido: true })
      .eq('utilizador_id', user.id)
      .eq('lido', false)
    
    setAlertas([])
    setUnreadCount(0)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative p-2 h-10 w-10 rounded-full">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Marcar lidas
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {alertas.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Sem novas notificações
            </div>
          ) : (
            <div className="divide-y">
              {alertas.map((alerta) => (
                <div key={alerta.id} className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                  alerta.tipo === 'cobranca' ? 'border-red-500' :
                  alerta.tipo === 'divergencia' ? 'border-yellow-500' :
                  'border-blue-500'
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm text-gray-800 leading-snug">
                      {alerta.mensagem}
                    </p>
                    <button 
                      onClick={() => markAsRead(alerta.id)}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                      title="Marcar como lido"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400 mt-2 block">
                    {new Date(alerta.criado_em).toLocaleDateString('pt-PT')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
