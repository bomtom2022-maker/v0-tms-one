'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { AlertTriangle, Clock, PauseCircle, Wrench, CheckCircle2, AlertCircle } from 'lucide-react'
import { isSameDay } from 'date-fns'

export function StatusCards() {
  const { tickets } = useData()

  const counts = useMemo(() => {
    const today = new Date()
    return {
      // Abertos = aguardando manutentor aceitar
      open: tickets.filter(t => t.status === 'open').length,
      // Em manutenção = manutentor trabalhando agora
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      // Pausados = manutentor parou mas nao finalizou
      paused: tickets.filter(t => t.status === 'paused').length,
      // Nao resolvidos = finalizados sem resolucao do problema
      unresolved: tickets.filter(t => t.status === 'unresolved').length,
      // Finalizados hoje
      completedToday: tickets.filter(t =>
        t.status === 'completed' && t.completedAt && isSameDay(new Date(t.completedAt), today)
      ).length,
      // Total ativo (exceto completed e cancelled)
      totalActive: tickets.filter(t =>
        t.status !== 'completed' && t.status !== 'cancelled'
      ).length,
    }
  }, [tickets])

  const cards = [
    {
      title: 'Abertos',
      description: 'Aguardando manutentor',
      value: counts.open,
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-500',
      text: 'text-red-600',
    },
    {
      title: 'Em Manutenção',
      description: 'Sendo atendidos agora',
      value: counts.inProgress,
      icon: Wrench,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-500',
      text: 'text-blue-600',
    },
    {
      title: 'Pausados',
      description: 'Manutentor parou',
      value: counts.paused,
      icon: PauseCircle,
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      iconBg: 'bg-orange-500',
      text: 'text-orange-600',
    },
    {
      title: 'Não Resolvidos',
      description: 'Requer nova atenção',
      value: counts.unresolved,
      icon: AlertCircle,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      iconBg: 'bg-yellow-500',
      text: 'text-yellow-700',
    },
    {
      title: 'Finalizados Hoje',
      description: 'Concluídos no dia',
      value: counts.completedToday,
      icon: CheckCircle2,
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-500',
      text: 'text-green-600',
    },
    {
      title: 'Total Ativo',
      description: 'Chamados em aberto',
      value: counts.totalActive,
      icon: Clock,
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      iconBg: 'bg-slate-600',
      text: 'text-slate-700',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className={`${card.bg} ${card.border} border-2`}>
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-[11px] lg:text-xs font-semibold ${card.text} leading-tight truncate`}>
                    {card.title}
                  </p>
                  <p className={`text-2xl lg:text-3xl font-bold mt-1 ${card.text}`}>
                    {card.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    {card.description}
                  </p>
                </div>
                <div className={`p-1.5 lg:p-2 rounded-lg ${card.iconBg} shrink-0`}>
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
