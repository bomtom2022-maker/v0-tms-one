'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useData } from '@/lib/data-context'
import { PRIORITY_CONFIG } from '@/lib/types'
import { Clock, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TicketListProps {
  onSelectTicket?: (ticketId: string) => void
}

export function TicketList({ onSelectTicket }: TicketListProps) {
  const { tickets, getMachineById, getProblemById } = useData()

  const activeTickets = tickets.filter(t => t.status !== 'completed')

  if (activeTickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chamados Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum chamado ativo no momento.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Chamados Ativos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activeTickets.map((ticket) => {
            const machine = getMachineById(ticket.machineId)
            const problem = getProblemById(ticket.problemId)
            const priorityConfig = PRIORITY_CONFIG[ticket.priority]

            return (
              <div
                key={ticket.id}
                className={`p-4 hover:bg-muted/50 transition-colors border-l-4 ${priorityConfig.borderColor}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {machine?.name || 'Máquina Desconhecida'}
                      </h3>
                      <Badge 
                        variant="secondary"
                        className={`${priorityConfig.bgLight} ${priorityConfig.textColor} text-xs`}
                      >
                        {priorityConfig.label}
                      </Badge>
                      {ticket.status === 'in-progress' && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                          Em Manutenção
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {problem?.name || 'Problema não especificado'}
                    </p>
                    <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                      {ticket.observation}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(ticket.createdAt, { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                  {onSelectTicket && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onSelectTicket(ticket.id)}
                      className="shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
