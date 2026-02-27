'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useData } from '@/lib/data-context'
import { PRIORITY_CONFIG, formatDuration, formatCurrency, type UsedPart } from '@/lib/types'
import { Play, Pause, Square, Clock, ArrowLeft, Package, CheckCircle, User, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MaintenanceViewProps {
  ticketId: string | null
  onBack: () => void
  onComplete: () => void
}

export function MaintenanceView({ ticketId, onBack, onComplete }: MaintenanceViewProps) {
  const { 
    tickets, 
    parts, 
    getMachineById, 
    getProblemById, 
    startMaintenance, 
    pauseMaintenance,
    resumeMaintenance,
    completeMaintenance 
  } = useData()
  
  const [elapsedTime, setElapsedTime] = useState(0)
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({})
  const [showCompletionForm, setShowCompletionForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [operatorName, setOperatorName] = useState('')
  const [showOperatorDialog, setShowOperatorDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'start' | 'pause' | 'resume' | 'complete' | null>(null)

  const ticket = ticketId ? tickets.find(t => t.id === ticketId) : null

  // Timer effect
  useEffect(() => {
    if (!ticket || ticket.status !== 'in-progress') {
      if (ticket?.status === 'paused') {
        setElapsedTime(ticket.accumulatedTime)
      }
      return
    }

    // Encontrar o último start ou resume
    const lastStartOrResume = [...ticket.actions]
      .reverse()
      .find(a => a.type === 'start' || a.type === 'resume')

    if (!lastStartOrResume) return

    const interval = setInterval(() => {
      const now = new Date()
      const lastActionTime = new Date(lastStartOrResume.timestamp)
      const currentSession = Math.floor((now.getTime() - lastActionTime.getTime()) / 1000)
      setElapsedTime(ticket.accumulatedTime + currentSession)
    }, 1000)

    return () => clearInterval(interval)
  }, [ticket])

  const handleActionWithOperator = (action: 'start' | 'pause' | 'resume' | 'complete') => {
    setPendingAction(action)
    setOperatorName('')
    setShowOperatorDialog(true)
  }

  const confirmAction = useCallback(() => {
    if (!ticketId || !operatorName.trim() || !pendingAction) return

    switch (pendingAction) {
      case 'start':
        startMaintenance(ticketId, operatorName.trim())
        break
      case 'pause':
        pauseMaintenance(ticketId, operatorName.trim())
        break
      case 'resume':
        resumeMaintenance(ticketId, operatorName.trim())
        break
      case 'complete':
        const usedParts: UsedPart[] = Object.entries(selectedParts)
          .filter(([, qty]) => qty > 0)
          .map(([partId, quantity]) => ({ partId, quantity }))
        
        completeMaintenance(ticketId, usedParts, operatorName.trim())
        setShowSuccess(true)
        
        setTimeout(() => {
          setShowSuccess(false)
          setShowCompletionForm(false)
          setSelectedParts({})
          onComplete()
        }, 2000)
        break
    }

    setShowOperatorDialog(false)
    setOperatorName('')
    setPendingAction(null)
  }, [ticketId, operatorName, pendingAction, selectedParts, startMaintenance, pauseMaintenance, resumeMaintenance, completeMaintenance, onComplete])

  const totalCost = Object.entries(selectedParts).reduce((sum, [partId, qty]) => {
    const part = parts.find(p => p.id === partId)
    return sum + (part ? part.price * qty : 0)
  }, 0)

  const getActionLabel = (action: 'start' | 'pause' | 'resume' | 'complete') => {
    switch (action) {
      case 'start': return 'Iniciar Manutenção'
      case 'pause': return 'Pausar Manutenção'
      case 'resume': return 'Continuar Manutenção'
      case 'complete': return 'Finalizar Manutenção'
    }
  }

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

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Nenhum chamado selecionado.</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          Voltar ao Dashboard
        </Button>
      </div>
    )
  }

  const machine = getMachineById(ticket.machineId)
  const problem = getProblemById(ticket.problemId)
  const priorityConfig = PRIORITY_CONFIG[ticket.priority]

  return (
    <div className="space-y-6">
      {/* Operator Dialog */}
      <Dialog open={showOperatorDialog} onOpenChange={setShowOperatorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Identificação do Operador
            </DialogTitle>
            <DialogDescription>
              Informe seu nome para registrar a ação: {pendingAction && getActionLabel(pendingAction)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="operator-name">Nome do Operador</Label>
            <Input
              id="operator-name"
              placeholder="Digite seu nome completo"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && operatorName.trim()) {
                  confirmAction()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOperatorDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAction} disabled={!operatorName.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {formatDuration(elapsedTime)}
            </div>
            <p className="text-xs text-sidebar-foreground/50 mt-2">
              {ticket.status === 'in-progress' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Cronômetro ativo
                </span>
              )}
              {ticket.status === 'paused' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  Pausado
                </span>
              )}
              {ticket.status === 'open' && 'Aguardando início'}
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
              onClick={() => handleActionWithOperator('start')}
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Manutenção
            </Button>
          )}
          
          {ticket.status === 'in-progress' && (
            <div className="grid grid-cols-2 gap-4">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                onClick={() => handleActionWithOperator('pause')}
              >
                <Pause className="w-5 h-5 mr-2" />
                Pausar
              </Button>
              <Button 
                size="lg" 
                variant="destructive"
                className="w-full"
                onClick={() => setShowCompletionForm(true)}
              >
                <Square className="w-5 h-5 mr-2" />
                Finalizar
              </Button>
            </div>
          )}

          {ticket.status === 'paused' && (
            <div className="grid grid-cols-2 gap-4">
              <Button 
                size="lg" 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleActionWithOperator('resume')}
              >
                <Play className="w-5 h-5 mr-2" />
                Continuar
              </Button>
              <Button 
                size="lg" 
                variant="destructive"
                className="w-full"
                onClick={() => setShowCompletionForm(true)}
              >
                <Square className="w-5 h-5 mr-2" />
                Finalizar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action History */}
      {ticket.actions.length > 0 && !showCompletionForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ticket.actions.map((action, index) => {
                const actionLabels = {
                  start: 'Iniciou manutenção',
                  pause: 'Pausou manutenção',
                  resume: 'Retomou manutenção',
                  complete: 'Finalizou manutenção',
                }
                const actionColors = {
                  start: 'bg-green-500',
                  pause: 'bg-yellow-500',
                  resume: 'bg-blue-500',
                  complete: 'bg-purple-500',
                }
                
                return (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className={cn("w-2 h-2 rounded-full", actionColors[action.type])} />
                    <div className="flex-1">
                      <span className="font-medium">{action.operatorName}</span>
                      <span className="text-muted-foreground"> - {actionLabels[action.type]}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(action.timestamp), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
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
                <Button onClick={() => handleActionWithOperator('complete')}>
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
