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
import { Play, Pause, Square, ArrowLeft, Package, CheckCircle, User, History, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
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
  
  // Dialog de confirmação simples
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'start' | 'resume' | 'complete' | null>(null)

  const ticket = ticketId ? tickets.find(t => t.id === ticketId) : null

  // Timer effect
  useEffect(() => {
    if (!ticket || ticket.status !== 'in-progress') {
      if (ticket?.status === 'paused' || ticket?.status === 'unresolved') {
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

  // Nome do operador vem do usuário logado
  const operatorName = currentUser?.name || 'Usuário'

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
        startMaintenance(ticketId, operatorName, currentUser?.id || '')
        break
      case 'resume':
        resumeMaintenance(ticketId, operatorName, currentUser?.id || '')
        break
      case 'complete':
        const usedParts: UsedPart[] = Object.entries(selectedParts)
          .filter(([, qty]) => qty > 0)
          .map(([partId, quantity]) => ({ partId, quantity }))
        
        completeMaintenance(ticketId, usedParts, operatorName, completionNotes.trim() || undefined, problemResolved ?? true, currentUser?.id || '')
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
    
    pauseMaintenance(ticketId, operatorName, pauseReason.trim(), currentUser?.id || '')
    setShowPauseDialog(false)
    setPauseReason('')
  }, [ticketId, operatorName, pauseReason, pauseMaintenance, currentUser])

  // Custo das novas peças selecionadas
  const newPartsCost = Object.entries(selectedParts).reduce((sum, [partId, qty]) => {
    const part = parts.find(p => p.id === partId)
    return sum + (part ? part.price * qty : 0)
  }, 0)
  
  // Custo total (anteriores + novas)
  const previousCost = ticket?.totalCost || 0
  const totalCost = previousCost + newPartsCost

  const getActionLabel = (action: 'start' | 'resume' | 'complete') => {
    switch (action) {
      case 'start': return 'Iniciar Manutenção'
      case 'resume': return 'Continuar Manutenção'
      case 'complete': return 'Finalizar Manutenção'
    }
  }

  // Success screen
  if (showSuccess) {
    const wasResolved = problemResolved === true
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300",
          wasResolved ? "bg-green-100" : "bg-orange-100"
        )}>
          {wasResolved ? (
            <CheckCircle className="w-10 h-10 text-green-600" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-orange-600" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {wasResolved ? 'Manutenção Finalizada!' : 'Chamado Retornado'}
        </h2>
        <p className="text-muted-foreground mt-2">Tempo total registrado: {formatDuration(elapsedTime)}</p>
        {!wasResolved && (
          <p className="text-orange-600 text-sm mt-2">
            O chamado voltou para a lista para outro manutentor continuar
          </p>
        )}
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
              Confirmar Ação
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
              Pausar Manutenção
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
                placeholder="Informe o motivo da pausa (obrigatório)"
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
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
            Manutencao
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            #{ticket.id.split('-')[1]}
          </p>
        </div>
      </div>

      {/* Ticket Info */}
      <Card className={cn("border-l-2 sm:border-l-4", priorityConfig.borderColor)}>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">{machine?.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{machine?.sector}</CardDescription>
            </div>
            <Badge 
              className={cn(priorityConfig.bgLight, priorityConfig.textColor, "text-[10px] sm:text-xs")}
            >
              {priorityConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Problema</p>
            <p className="text-sm sm:text-base text-foreground">{problem?.name}</p>
          </div>
          {ticket.observation && (
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Obs</p>
              <p className="text-sm text-foreground line-clamp-2">{ticket.observation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timer Card */}
      <Card className="bg-sidebar text-sidebar-foreground">
        <CardContent className="py-5 sm:py-8">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-sidebar-foreground/70 mb-1 sm:mb-2">Tempo</p>
            <div className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold tracking-wider">
              {formatDuration(elapsedTime)}
            </div>
            <p className="text-[10px] sm:text-xs text-sidebar-foreground/50 mt-2">
              {ticket.status === 'in-progress' && (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Ativo
                </span>
              )}
              {ticket.status === 'paused' && (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  Pausado
                </span>
              )}
              {ticket.status === 'open' && 'Aguardando'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!showCompletionForm && (
        <div className="grid gap-3">
          {ticket.status === 'open' && (
            <Button 
              size="lg" 
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
              onClick={() => handleAction('start')}
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Manutencao
            </Button>
          )}
          
          {ticket.status === 'in-progress' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full h-12 border-yellow-500 text-yellow-600 hover:bg-yellow-50 text-sm"
                onClick={handlePauseAction}
              >
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Pausar
              </Button>
              <Button 
                size="lg" 
                variant="destructive"
                className="w-full h-12 text-sm"
                onClick={() => setShowCompletionForm(true)}
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Finalizar
              </Button>
            </div>
          )}

          {ticket.status === 'paused' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <Button 
                size="lg" 
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-sm"
                onClick={() => handleAction('resume')}
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Continuar
              </Button>
              <Button 
                size="lg" 
                variant="destructive"
                className="w-full h-12 text-sm"
                onClick={() => setShowCompletionForm(true)}
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Finalizar
              </Button>
            </div>
          )}

          {/* Ticket não resolvido - permitir continuidade */}
          {ticket.status === 'unresolved' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800 dark:text-orange-200">Problema Nao Finalizado</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Este chamado foi marcado como não resolvido anteriormente. Você pode continuar a manutenção para tentar resolver o problema.
                    </p>
                    {ticket.completionNotes && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                        <strong>Observação anterior:</strong> {ticket.completionNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                size="lg" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => handleAction('start')}
              >
                <Play className="w-5 h-5 mr-2" />
                Continuar Manutenção
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

      {/* Tempo por Manutentor */}
      {ticket.timeSegments && ticket.timeSegments.length > 0 && !showCompletionForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo por Manutentor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Agrupar tempos por manutentor */}
              {Object.entries(
                ticket.timeSegments.reduce((acc, seg) => {
                  if (!acc[seg.operatorName]) {
                    acc[seg.operatorName] = 0
                  }
                  acc[seg.operatorName] += seg.duration
                  return acc
                }, {} as Record<string, number>)
              ).map(([operatorName, totalTime]) => (
                <div key={operatorName} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="font-medium">{operatorName}</span>
                  <span className="text-muted-foreground">{formatDuration(totalTime)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-2 border-t mt-2 pt-2 font-semibold">
                <span>Tempo Total</span>
                <span>{formatDuration(ticket.timeSegments.reduce((sum, seg) => sum + seg.duration, 0))}</span>
              </div>
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
              Finalização da Manutenção
            </CardTitle>
            <CardDescription>
              Informe o resultado da manutenção
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
                  <span>Não Resolvido</span>
                </Button>
              </div>
              {problemResolved === false && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700">
                    A máquina será automaticamente colocada em <strong>Observação</strong> para acompanhamento.
                  </p>
                </div>
              )}
            </div>

            {/* Completion Notes */}
            <div className="space-y-2">
              <Label htmlFor="completion-notes" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Observações da Manutenção (opcional)
              </Label>
              <Textarea
                id="completion-notes"
                placeholder="Descreva o que foi feito, problemas encontrados, recomendações..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Peças já utilizadas anteriormente */}
            {ticket.usedParts && ticket.usedParts.length > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <Label className="text-muted-foreground">Peças já utilizadas anteriormente:</Label>
                <div className="space-y-2">
                  {ticket.usedParts.map((up) => {
                    const part = parts.find(p => p.id === up.partId)
                    return (
                      <div key={up.partId} className="flex items-center justify-between text-sm">
                        <span>{part?.name || 'Peça não encontrada'}</span>
                        <span className="text-muted-foreground">
                          {up.quantity}x - {formatCurrency((part?.price || 0) * up.quantity)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between font-medium pt-2 border-t">
                    <span>Custo anterior:</span>
                    <span>{formatCurrency(ticket.totalCost || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Parts Selection */}
            <div className="space-y-3">
              <Label>{ticket.usedParts && ticket.usedParts.length > 0 ? 'Adicionar mais peças' : 'Peças Utilizadas'}</Label>
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
              {previousCost > 0 && newPartsCost > 0 && (
                <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
                  <span>Novas peças:</span>
                  <span>{formatCurrency(newPartsCost)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Custo Total em Peças:</span>
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
