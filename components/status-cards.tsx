'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { PRIORITY_CONFIG } from '@/lib/types'
import { AlertTriangle, Clock, CheckCircle, Wrench } from 'lucide-react'

export function StatusCards() {
  const { tickets } = useData()

  const highPriority = tickets.filter(t => t.priority === 'high' && t.status !== 'completed').length
  const mediumPriority = tickets.filter(t => t.priority === 'medium' && t.status !== 'completed').length
  const lowPriority = tickets.filter(t => t.priority === 'low' && t.status !== 'completed').length
  const inProgress = tickets.filter(t => t.status === 'in-progress').length

  const cards = [
    {
      title: 'Máquina Parada',
      value: highPriority,
      description: 'Prioridade Alta',
      icon: AlertTriangle,
      color: PRIORITY_CONFIG.high.color,
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      title: 'Atenção Necessária',
      value: mediumPriority,
      description: 'Prioridade Média',
      icon: Clock,
      color: PRIORITY_CONFIG.medium.color,
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Preventivas',
      value: lowPriority,
      description: 'Sem Prioridade',
      icon: CheckCircle,
      color: PRIORITY_CONFIG.low.color,
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Em Manutenção',
      value: inProgress,
      description: 'Chamados Ativos',
      icon: Wrench,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className={`${card.bgColor} ${card.borderColor} border-2`}>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs lg:text-sm font-medium ${card.textColor}`}>
                    {card.title}
                  </p>
                  <p className={`text-2xl lg:text-3xl font-bold mt-1 ${card.textColor}`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </div>
                <div className={`p-2 lg:p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
