'use client'

import { useState, useCallback, useEffect } from 'react'
import { DataProvider, useData } from '@/lib/data-context'
import { AuthProvider, useAuth } from '@/lib/auth-context'
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
  const { isAuthenticated, isManutentor, isLider } = useAuth()
  const { setNotificationCallback } = useData()
  const { notify } = useNotification()
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  // Integrar notificações do data-context com notification-context
  useEffect(() => {
    setNotificationCallback(notify)
    return () => setNotificationCallback(null)
  }, [setNotificationCallback, notify])

  // Redirecionar lider para views permitidas se tentar acessar algo restrito
  useEffect(() => {
    if (isLider && !['dashboard', 'new-ticket'].includes(currentView)) {
      setCurrentView('dashboard')
    }
  }, [isLider, currentView])

  const handleSelectTicket = useCallback((ticketId: string) => {
    // Apenas manutentores podem acessar a tela de manutenção
    if (isManutentor) {
      setSelectedTicketId(ticketId)
      setCurrentView('maintenance')
    }
  }, [isManutentor])

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
    // Bloquear lideres de acessar views restritas
    const liderAllowedViews: View[] = ['dashboard', 'new-ticket']
    if (isLider && !liderAllowedViews.includes(view)) {
      return
    }
    setCurrentView(view)
  }, [isLider])

  // Se nao estiver autenticado, mostrar tela de login
  if (!isAuthenticated) {
    return <LoginView />
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onSelectTicket={handleSelectTicket} />
      case 'new-ticket':
        return <NewTicketView onSuccess={handleNewTicketSuccess} />
      case 'problems':
        return isManutentor ? <ProblemsView /> : <DashboardView onSelectTicket={handleSelectTicket} />
      case 'machines':
        return isManutentor ? <MachinesView /> : <DashboardView onSelectTicket={handleSelectTicket} />
      case 'maintenance':
        return isManutentor ? (
          <MaintenanceView 
            ticketId={selectedTicketId}
            onBack={handleBackFromMaintenance}
            onComplete={handleMaintenanceComplete}
          />
        ) : <DashboardView onSelectTicket={handleSelectTicket} />
      case 'parts':
        return isManutentor ? <PartsView /> : <DashboardView onSelectTicket={handleSelectTicket} />
      case 'reports':
        return isManutentor ? <ReportsView /> : <DashboardView onSelectTicket={handleSelectTicket} />
      case 'scheduled':
        return isManutentor ? <ScheduledView /> : <DashboardView onSelectTicket={handleSelectTicket} />
      case 'users':
        return isManutentor ? <UsersView /> : <DashboardView onSelectTicket={handleSelectTicket} />
      default:
        return <DashboardView onSelectTicket={handleSelectTicket} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      
      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
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
