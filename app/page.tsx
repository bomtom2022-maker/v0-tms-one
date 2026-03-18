'use client'
// build: 2026-03-16
import { useState, useCallback, useEffect } from 'react'
import { DataProvider, useData } from '@/lib/data-context'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { Wrench } from 'lucide-react'
import { NotificationProvider, useNotification } from '@/lib/notification-context'
import { Sidebar } from '@/components/sidebar'
import { DashboardView } from '@/components/dashboard-view'
import { NewTicketView } from '@/components/new-ticket-view'
import { ProblemsView } from '@/components/problems-view'
import { MachinesView } from '@/components/machines-view'
import { MaintenanceView } from '@/components/maintenance-view'
import { PartsView } from '@/components/parts-view'
import { ReportsView } from '@/components/reports-view'
import { ScheduledView } from '@/components/scheduled-view'
import { UsersView } from '@/components/users-view'
import { LoginView } from '@/components/login-view'
import { InstallPrompt } from '@/components/install-prompt'

type View = 'dashboard' | 'new-ticket' | 'problems' | 'machines' | 'maintenance' | 'parts' | 'reports' | 'scheduled' | 'users'

function TMSApp() {
  const { isAuthenticated, isManutentor, isLider, canAccessAll, canManageUsers } = useAuth()
  const { setNotificationCallback, isLoading, reloadData } = useData()
  const { notify } = useNotification()
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  // Carregar dados do Supabase assim que usuario autenticar
  useEffect(() => {
    if (isAuthenticated) {
      reloadData()
    }
  }, [isAuthenticated, reloadData])

  // Integrar notificações do data-context com notification-context
  useEffect(() => {
    setNotificationCallback(notify)
    return () => setNotificationCallback(null)
  }, [setNotificationCallback, notify])

  const handleSelectTicket = useCallback((ticketId: string) => {
    // Todos os usuarios autenticados podem acessar a tela de manutenção
    if (canAccessAll) {
      setSelectedTicketId(ticketId)
      setCurrentView('maintenance')
    }
  }, [canAccessAll])

  const handleBackFromMaintenance = useCallback(() => {
    setSelectedTicketId(null)
    setCurrentView('dashboard')
  }, [])

  const handleMaintenanceComplete = useCallback(() => {
    setSelectedTicketId(null)
    setCurrentView('dashboard')
  }, [])

  const handleNewTicketSuccess = useCallback(() => {
    setCurrentView('dashboard')
  }, [])

  const handleViewChange = useCallback((view: View) => {
    // Apenas admin pode gerenciar usuarios
    if (view === 'users' && !canManageUsers) return
    // Qualquer usuario autenticado pode acessar as demais views
    if (!canAccessAll) return
    setCurrentView(view)
  }, [canAccessAll, canManageUsers])

  // Se nao estiver autenticado, mostrar tela de login
  if (!isAuthenticated) {
    return <LoginView />
  }

  // Enquanto carrega dados do Supabase, mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 gap-4">
        <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center animate-pulse">
          <Wrench className="w-7 h-7 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Carregando dados...</p>
      </div>
    )
  }

  const renderView = () => {
    if (!canAccessAll) return <DashboardView onSelectTicket={handleSelectTicket} />

    switch (currentView) {
      case 'dashboard':
        return <DashboardView onSelectTicket={handleSelectTicket} />
      case 'new-ticket':
        return <NewTicketView onSuccess={handleNewTicketSuccess} />
      case 'problems':
        return <ProblemsView />
      case 'machines':
        return <MachinesView />
      case 'maintenance':
        return (
          <MaintenanceView 
            ticketId={selectedTicketId}
            onBack={handleBackFromMaintenance}
            onComplete={handleMaintenanceComplete}
          />
        )
      case 'parts':
        return <PartsView />
      case 'reports':
        return <ReportsView />
      case 'scheduled':
        return <ScheduledView />
      case 'users':
        return canManageUsers ? <UsersView /> : <DashboardView onSelectTicket={handleSelectTicket} />
      default:
        return <DashboardView onSelectTicket={handleSelectTicket} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      
      {/* Main Content - Otimizado para mobile */}
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-4">
        <div className="p-3 sm:p-4 lg:p-6">
          {renderView()}
        </div>
      </main>
      
      {/* Prompt para instalar o app */}
      <InstallPrompt />
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DataProvider>
          <TMSApp />
        </DataProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
