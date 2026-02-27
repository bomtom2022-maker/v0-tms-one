'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useData } from '@/lib/data-context'
import { PRIORITY_CONFIG, formatDuration, formatCurrency, type UsedPart } from '@/lib/types'
import { Play, Square, Clock, ArrowLeft, Package, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaintenanceViewProps {
  ticketId: string | null
  onBack: () => void
  onComplete: () => void
}

export function MaintenanceView({ ticketId, onBack, onComplete }: MaintenanceViewProps) {
  const { tickets, parts, getMachineById, getProblemById, startMaintenance, completeMaintenance } = useData()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({})
  const [showCompletionForm, setShowCompletionForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const ticket = ticketId ? tickets.find(t => t.id === ticketId) : null
  const activeTickets = tickets.filter(t => t.status !== 'completed')

  // Timer effect
  useEffect(() => {
    if (!ticket?.startedAt) return

    const interval = setInterval(() => {
      const now = new Date()
      const started = new Date(ticket.startedAt!)
      setElapsedTime(Math.floor((now.getTime() - started.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [ticket?.startedAt])

  const handleStartMaintenance = useCallback(() => {
    if (ticketId) {
      startMaintenance(ticketId)
    }
  }, [ticketId, startMaintenance])

  const handleCompleteMaintenance = useCallback(() => {
    if (!ticketId) return

    const usedParts: UsedPart[] = Object.entries(selectedParts)
      .filter(([, qty]) => qty > 0)
      .map(([partId, quantity]) => ({ partId, quantity }))

    completeMaintenance(ticketId, usedParts)
    setShowSuccess(true)
    
    setTimeout(() => {
      setShowSuccess(false)
      setShowCompletionForm(false)
      setSelectedParts({})
      onComplete()
    }, 2000)
  }, [ticketId, selectedParts, completeMaintenance, onComplete])

  const totalCost = Object.entries(selectedParts).reduce((sum, [partId, qty]) => {
    const part = parts.find(p => p.id === partId)
    return sum + (part ? part.price * qty : 0)
  }, 0)

  // Success screen
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Manutenção Finalizada!</h2>
        <p className="text-muted-foreground mt-2">Tempo total registrado: {formatDuration(elapsedTime)}</p>
      </div>
    )
  }

  // If no ticket selected, show list of active tickets
  if (!ticket) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Controle de Manutenção
          </h1>
          <p className="text-muted-foreground mt-1">
            Selecione um chamado para iniciar ou acompanhar a manutenção
          </p>
        </div>

        {activeTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum chamado ativo para manutenção.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeTickets.map((t) => {
              const machine = getMachineById(t.machineId)
              const problem = getProblemById(t.problemId)
              const priorityConfig = PRIORITY_CONFIG[t.priority]

              return (
                <Card 
                  key={t.id} 
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-shadow border-l-4",
                    priorityConfig.borderColor
                  )}
                  onClick={() => onBack()}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{machine?.name}</h3>
                          <Badge 
                            variant="secondary"
                            className={cn(priorityConfig.bgLight, priorityConfig.textColor, "text-xs")}
                          >
                            {t.status === 'in-progress' ? 'Em Manutenção' : priorityConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{problem?.name}</p>
                      </div>
                      {t.status === 'in-progress' && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="font-mono text-sm">Ativo</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const machine = getMachineById(ticket.machineId)
  const problem = getProblemById(ticket.problemId)
  const priorityConfig = PRIORITY_CONFIG[ticket.priority]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">
            Controle de Manutenção
          </h1>
          <p className="text-muted-foreground text-sm">
            Chamado #{ticket.id.split('-')[1]}
          </p>
        </div>
      </div>

      {/* Ticket Info */}
      <Card className={cn("border-l-4", priorityConfig.borderColor)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{machine?.name}</CardTitle>
              <CardDescription>{machine?.sector}</CardDescription>
            </div>
            <Badge 
              className={cn(priorityConfig.bgLight, priorityConfig.textColor)}
            >
              {priorityConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Problema</p>
            <p className="text-foreground">{problem?.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Observação</p>
            <p className="text-foreground">{ticket.observation || 'Nenhuma observação'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Timer Card */}
      <Card className="bg-sidebar text-sidebar-foreground">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-sm text-sidebar-foreground/70 mb-2">Tempo de Manutenção</p>
            <div className="font-mono text-5xl lg:text-6xl font-bold tracking-wider">
              {formatDuration(ticket.status === 'in-progress' ? elapsedTime : 0)}
            </div>
            <p className="text-xs text-sidebar-foreground/50 mt-2">
              {ticket.status === 'in-progress' ? 'Cronômetro ativo' : 'Aguardando início'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!showCompletionForm && (
        <div className="grid gap-4">
          {ticket.status === 'open' && (
            <Button 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={handleStartMaintenance}
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Manutenção
            </Button>
          )}
          
          {ticket.status === 'in-progress' && (
            <Button 
              size="lg" 
              variant="destructive"
              className="w-full"
              onClick={() => setShowCompletionForm(true)}
            >
              <Square className="w-5 h-5 mr-2" />
              Finalizar Manutenção
            </Button>
          )}
        </div>
      )}

      {/* Parts Selection (when completing) */}
      {showCompletionForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Peças Utilizadas
            </CardTitle>
            <CardDescription>
              Selecione as peças que foram utilizadas na manutenção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {parts.map((part) => (
                <div key={part.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Checkbox
                    id={part.id}
                    checked={(selectedParts[part.id] || 0) > 0}
                    onCheckedChange={(checked) => {
                      setSelectedParts(prev => ({
                        ...prev,
                        [part.id]: checked ? 1 : 0
                      }))
                    }}
                  />
                  <Label htmlFor={part.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{part.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {formatCurrency(part.price)}
                    </span>
                  </Label>
                  {(selectedParts[part.id] || 0) > 0 && (
                    <Input
                      type="number"
                      min={1}
                      value={selectedParts[part.id] || 1}
                      onChange={(e) => setSelectedParts(prev => ({
                        ...prev,
                        [part.id]: parseInt(e.target.value) || 0
                      }))}
                      className="w-20"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Custo Total em Peças:</span>
                <span className="text-xl font-bold">{formatCurrency(totalCost)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setShowCompletionForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCompleteMaintenance}>
                  Confirmar Finalização
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
