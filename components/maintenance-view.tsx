'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { PRIORITY_CONFIG, formatDuration, formatCurrency, type UsedPart } from '@/lib/types'
import { Play, Pause, Square, ArrowLeft, Package, CheckCircle, User, History, MessageSquare, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
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
  const { currentUser } = useAuth()
  
  const [elapsedTime, setElapsedTime] = useState(0)
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({})
  const [showCompletionForm, setShowCompletionForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [problemResolved, setProblemResolved] = useState<boolean | null>(null)
  
  // Dialog states - apenas para pausa (que precisa de motivo)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  
  // Dialog de confirmacao simples
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'start' | 'resume' | 'complete' | null>(null)

  const ticket = ticketId ? tickets.find(t => t.id === ticketId) : null

  // Timer effect
  useEffect(() => {
    if (!ticket || ticket.status !== 'in-progress') {
      if (ticket?.status === 'paused') {
        setElapsedTime(ticket.accumulatedTime)
      }
      return
    }

    // Encontrar o ultimo start ou resume
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

  // Nome do operador vem do usuario logado
  const operatorName = currentUser?.name || 'Usuario'

  const handleAction = (action: 'start' | 'resume' | 'complete') => {
    setPendingAction(action)
    setShowConfirmDialog(true)
  }

  const handlePauseAction = () => {
    setPauseReason('')
    setShowPauseDialog(true)
  }

  const confirmAction = useCallback(() => {
    if (!ticketId || !pendingAction) return

    switch (pendingAction) {
      case 'start':
        startMaintenance(ticketId, operatorName)
        break
      case 'resume':
        resumeMaintenance(ticketId, operatorName)
        break
      case 'complete':
        const usedParts: UsedPart[] = Object.entries(selectedParts)
          .filter(([, qty]) => qty > 0)
          .map(([partId, quantity]) => ({ partId, quantity }))
        
        completeMaintenance(ticketId, usedParts, operatorName, completionNotes.trim() || undefined, problemResolved ?? true)
        setShowSuccess(true)
        
        setTimeout(() => {
          setShowSuccess(false)
          setShowCompletionForm(false)
          setSelectedParts({})
          setCompletionNotes('')
          setProblemResolved(null)
          onComplete()
        }, 2000)
        break
    }

    setShowConfirmDialog(false)
    setPendingAction(null)
  }, [ticketId, operatorName, pendingAction, selectedParts, completionNotes, problemResolved, startMaintenance, resumeMaintenance, completeMaintenance, onComplete])

  const confirmPause = useCallback(() => {
    if (!ticketId || !pauseReason.trim()) return
    
    pauseMaintenance(ticketId, operatorName, pauseReason.trim())
    setShowPauseDialog(false)
    setPauseReason('')
  }, [ticketId, operatorName, pauseReason, pauseMaintenance])

  const totalCost = Object.entries(selectedParts).reduce((sum, [partId, qty]) => {
    const part = parts.find(p => p.id === partId)
    return sum + (part ? part.price * qty : 0)
  }, 0)

  const getActionLabel = (action: 'start' | 'resume' | 'complete') => {
    switch (action) {
      case 'start': return 'Iniciar Manutencao'
      case 'resume': return 'Continuar Manutencao'
      case 'complete': return 'Finalizar Manutencao'
    }
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Manutencao Finalizada!</h2>
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
      {/* Dialog de Confirmacao */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Confirmar Acao
            </DialogTitle>
            <DialogDescription>
              {pendingAction && getActionLabel(pendingAction)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Operador</p>
                <p className="font-medium">{operatorName}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAction}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Pausa (precisa do motivo) */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="w-5 h-5" />
              Pausar Manutencao
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da pausa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{operatorName}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pause-reason">Motivo da Pausa *</Label>
              <Textarea
                id="pause-reason"
                placeholder="Informe o motivo da pausa (obrigatorio)"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmPause} disabled={!pauseReason.trim()}>
              Confirmar Pausa
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
            Controle de Manutencao
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
            <p className="text-sm font-medium text-muted-foreground">Observacao</p>
            <p className="text-foreground">{ticket.observation || 'Nenhuma observacao'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Timer Card */}
      <Card className="bg-sidebar text-sidebar-foreground">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-sm text-sidebar-foreground/70 mb-2">Tempo de Manutencao</p>
            <div className="font-mono text-5xl lg:text-6xl font-bold tracking-wider">
              {formatDuration(elapsedTime)}
            </div>
            <p className="text-xs text-sidebar-foreground/50 mt-2">
              {ticket.status === 'in-progress' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Cronometro ativo
                </span>
              )}
              {ticket.status === 'paused' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  Pausado
                </span>
              )}
              {ticket.status === 'open' && 'Aguardando inicio'}
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
              onClick={() => handleAction('start')}
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Manutencao
            </Button>
          )}
          
          {ticket.status === 'in-progress' && (
            <div className="grid grid-cols-2 gap-4">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                onClick={handlePauseAction}
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
                onClick={() => handleAction('resume')}
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
              Historico de Acoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ticket.actions.map((action, index) => {
                const actionLabels = {
                  start: 'Iniciou manutencao',
                  pause: 'Pausou manutencao',
                  resume: 'Retomou manutencao',
                  complete: 'Finalizou manutencao',
                }
                const actionColors = {
                  start: 'bg-green-500',
                  pause: 'bg-yellow-500',
                  resume: 'bg-blue-500',
                  complete: 'bg-purple-500',
                }
                
                return (
                  <div key={index} className="border-l-2 border-muted pl-4 pb-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className={cn("w-2 h-2 rounded-full", actionColors[action.type])} />
                      <div className="flex-1">
                        <span className="font-medium">{action.operatorName}</span>
                        <span className="text-muted-foreground"> - {actionLabels[action.type]}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(action.timestamp), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {action.reason && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        Motivo: {action.reason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parts Selection and Completion Notes (when completing) */}
      {showCompletionForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Finalizacao da Manutencao
            </CardTitle>
            <CardDescription>
              Informe o resultado da manutencao
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problem Resolved Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">O problema foi resolvido? *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={problemResolved === true ? "default" : "outline"}
                  className={cn(
                    "h-auto py-4 flex flex-col items-center gap-2",
                    problemResolved === true && "bg-green-600 hover:bg-green-700 text-white"
                  )}
                  onClick={() => setProblemResolved(true)}
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Sim, Resolvido</span>
                </Button>
                <Button
                  type="button"
                  variant={problemResolved === false ? "default" : "outline"}
                  className={cn(
                    "h-auto py-4 flex flex-col items-center gap-2",
                    problemResolved === false && "bg-orange-500 hover:bg-orange-600 text-white"
                  )}
                  onClick={() => setProblemResolved(false)}
                >
                  <XCircle className="w-6 h-6" />
                  <span>Nao Resolvido</span>
                </Button>
              </div>
              {problemResolved === false && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700">
                    A maquina sera automaticamente colocada em <strong>Observacao</strong> para acompanhamento.
                  </p>
                </div>
              )}
            </div>

            {/* Completion Notes */}
            <div className="space-y-2">
              <Label htmlFor="completion-notes" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Observacoes da Manutencao (opcional)
              </Label>
              <Textarea
                id="completion-notes"
                placeholder="Descreva o que foi feito, problemas encontrados, recomendacoes..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Parts Selection */}
            <div className="space-y-3">
              <Label>Pecas Utilizadas</Label>
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
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Custo Total em Pecas:</span>
                <span className="text-xl font-bold">{formatCurrency(totalCost)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => {
                  setShowCompletionForm(false)
                  setProblemResolved(null)
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => handleAction('complete')}
                  disabled={problemResolved === null}
                >
                  Confirmar Finalizacao
                </Button>
              </div>
              {problemResolved === null && (
                <p className="text-sm text-muted-foreground text-center">
                  Selecione se o problema foi resolvido para continuar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
