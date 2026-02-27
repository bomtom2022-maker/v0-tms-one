'use client'

import { useState, useCallback } from 'react'
import { DataProvider } from '@/lib/data-context'
import { Sidebar } from '@/components/sidebar'
import { DashboardView } from '@/components/dashboard-view'
import { NewTicketView } from '@/components/new-ticket-view'
import { ProblemsView } from '@/components/problems-view'
import { MachinesView } from '@/components/machines-view'
import { MaintenanceView } from '@/components/maintenance-view'
import { PartsView } from '@/components/parts-view'
import { ReportsView } from '@/components/reports-view'
import { ScheduledView } from '@/components/scheduled-view'

type View = 'dashboard' | 'new-ticket' | 'problems' | 'machines' | 'maintenance' | 'parts' | 'reports' | 'scheduled'

function TMSApp() {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  const handleSelectTicket = useCallback((ticketId: string) => {
    setSelectedTicketId(ticketId)
    setCurrentView('maintenance')
  }, [])

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

  const renderView = () => {
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
      default:
        return <DashboardView onSelectTicket={handleSelectTicket} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <DataProvider>
      <TMSApp />
    </DataProvider>
  )
}
