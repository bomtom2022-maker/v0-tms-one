'use client'

import { StatusCards } from './status-cards'
import { TicketList } from './ticket-list'
import { useData } from '@/lib/data-context'
import { numberToWords } from '@/lib/types'

interface DashboardViewProps {
  onSelectTicket: (ticketId: string) => void
}

export function DashboardView({ onSelectTicket }: DashboardViewProps) {
  const { tickets } = useData()
  
  const totalActive = tickets.filter(t => t.status !== 'completed').length
  const completedToday = tickets.filter(t => {
    if (t.status !== 'completed' || !t.completedAt) return false
    const today = new Date()
    return t.completedAt.toDateString() === today.toDateString()
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Dashboard de Gestão
        </h1>
        <p className="text-muted-foreground mt-1">
          {numberToWords(totalActive)} chamados ativos • {numberToWords(completedToday)} finalizados hoje
        </p>
      </div>

      {/* Status Cards */}
      <StatusCards />

      {/* Active Tickets */}
      <TicketList onSelectTicket={onSelectTicket} />
    </div>
  )
}
