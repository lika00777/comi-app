import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  CreditCard, 
  FileText,
  LogOut,
  Users 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notifications } from '@/components/layout/notifications'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/entrar')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Tipos de Artigo', href: '/tipos-artigo', icon: Package },
    { name: 'Vendas', href: '/vendas', icon: ShoppingCart },
    { name: 'Pagamentos', href: '/pagamentos', icon: CreditCard },
    { name: 'Relatórios', href: '/relatorios', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Comissões</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user.email}
                </p>
              </div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full justify-start"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </form>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="pl-64">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 sticky top-0 z-10">
          <Notifications />
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
