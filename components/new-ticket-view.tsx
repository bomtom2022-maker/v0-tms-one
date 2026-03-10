'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { PRIORITY_CONFIG, type Priority } from '@/lib/types'
import { CheckCircle, AlertTriangle, Clock, AlertCircle, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewTicketViewProps {
  onSuccess: () => void
}

export function NewTicketView({ onSuccess }: NewTicketViewProps) {
  const { machines, problems, addTicket, getProblemById } = useData()
  const { currentUser } = useAuth()
  const [machineId, setMachineId] = useState('')
  const [problemId, setProblemId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [manualPriority, setManualPriority] = useState(false)
  const [observation, setObservation] = useState('')
  const [machineStopped, setMachineStopped] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Auto-selecionar prioridade baseada no problema
  useEffect(() => {
    if (problemId) {
      const problem = getProblemById(problemId)
      if (problem) {
        // Se o problema requer prioridade manual (ex: "Outros"), ativar automaticamente
        if (problem.requiresManualPriority) {
          setManualPriority(true)
        } else if (!manualPriority) {
          setPriority(problem.defaultPriority)
        }
      }
    }
  }, [problemId, manualPriority, getProblemById])

  // Se máquina parada, automaticamente definir prioridade alta
  useEffect(() => {
    if (machineStopped && !manualPriority) {
      setPriority('high')
    }
  }, [machineStopped, manualPriority])

  const handleProblemChange = (value: string) => {
    setProblemId(value)
  }

  const handleManualPriorityChange = (checked: boolean) => {
    const problem = getProblemById(problemId)
    // Se o problema requer prioridade manual, não permite desativar
    if (!checked && problem?.requiresManualPriority) {
      return
    }
    setManualPriority(checked)
    if (!checked && problemId && problem) {
      setPriority(machineStopped ? 'high' : problem.defaultPriority)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!machineId || !problemId) return

    setIsSubmitting(true)

    setTimeout(() => {
      addTicket({
        machineId,
        problemId,
        priority,
        observation,
        machineStopped,
        createdBy: currentUser?.id || '',
        createdByName: currentUser?.name || '',
      })

      setShowSuccess(true)
      
      setMachineId('')
      setProblemId('')
      setPriority('medium')
      setManualPriority(false)
      setObservation('')
      setMachineStopped(false)
      setIsSubmitting(false)

      setTimeout(() => {
        setShowSuccess(false)
        onSuccess()
      }, 2000)
    }, 500)
  }

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Chamado Registrado!</h2>
        <p className="text-muted-foreground mt-2">Redirecionando para o dashboard...</p>
      </div>
    )
  }

  const selectedProblem = problemId ? getProblemById(problemId) : null
  
  // Verifica se é o problema "Outros" (requer observação obrigatória)
  const isOtherProblem = selectedProblem?.name.toLowerCase() === 'outros' || selectedProblem?.name.toLowerCase() === 'outro'
  const isObservationRequired = isOtherProblem
  const isFormValid = machineId && problemId && (!isObservationRequired || observation.trim().length > 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Novo Chamado
        </h1>
        <p className="text-muted-foreground mt-1">
          Registre um novo chamado de manutenção
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção de Máquina */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Máquina CNC</CardTitle>
            <CardDescription>Selecione a máquina com problema</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a máquina..." />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    <div className="flex flex-col">
                      <span>{machine.name}</span>
                      <span className="text-xs text-muted-foreground">{machine.sector}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Máquina Parada */}
        <Card className={cn(machineStopped && "border-red-500 bg-red-50/50")}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Checkbox 
                id="machine-stopped"
                checked={machineStopped}
                onCheckedChange={(checked) => setMachineStopped(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="machine-stopped" 
                  className={cn(
                    "text-base font-medium cursor-pointer flex items-center gap-2",
                    machineStopped && "text-red-600"
                  )}
                >
                  <AlertOctagon className={cn("w-5 h-5", machineStopped ? "text-red-500" : "text-muted-foreground")} />
                  Máquina Parada
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Marque esta opção se a máquina está completamente parada e não pode operar
                </p>
              </div>
            </div>
            {machineStopped && (
              <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Este chamado será marcado como URGENTE (Prioridade Alta)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seleção de Problema */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipo de Problema</CardTitle>
            <CardDescription>
              Selecione o problema identificado (a prioridade será definida automaticamente)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={problemId} onValueChange={handleProblemChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o problema..." />
              </SelectTrigger>
              <SelectContent>
                {problems.map((problem) => {
                  const config = PRIORITY_CONFIG[problem.defaultPriority]
                  return (
                    <SelectItem key={problem.id} value={problem.id}>
                      <div className="flex items-center gap-2">
                        {problem.requiresManualPriority ? (
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        ) : (
                          <div className={cn("w-2 h-2 rounded-full", config.color)} />
                        )}
                        <span>{problem.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            
            {selectedProblem && !manualPriority && !machineStopped && !selectedProblem.requiresManualPriority && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Prioridade automática: <span className={cn("font-medium", PRIORITY_CONFIG[selectedProblem.defaultPriority].textColor)}>
                    {PRIORITY_CONFIG[selectedProblem.defaultPriority].label}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Toggle para prioridade manual */}
        {!machineStopped && (
          <Card className={selectedProblem?.requiresManualPriority ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Prioridade {selectedProblem?.requiresManualPriority ? "" : "Manual"}
                    {selectedProblem?.requiresManualPriority && (
                      <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedProblem?.requiresManualPriority 
                      ? "Defina a prioridade para este tipo de problema"
                      : "Deseja definir a prioridade manualmente?"}
                  </CardDescription>
                </div>
                {!selectedProblem?.requiresManualPriority && (
                  <Switch 
                    checked={manualPriority} 
                    onCheckedChange={handleManualPriorityChange}
                  />
                )}
              </div>
            </CardHeader>
            {(manualPriority || selectedProblem?.requiresManualPriority) && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                    const config = PRIORITY_CONFIG[p]
                    const isSelected = priority === p
                    const Icon = p === 'high' ? AlertTriangle : p === 'medium' ? Clock : AlertCircle
                    
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all text-left",
                          isSelected 
                            ? `${config.borderColor} ${config.bgLight}` 
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", config.color)}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className={cn("font-medium text-sm", isSelected && config.textColor)}>
                              {config.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Observação */}
        <Card className={cn(isObservationRequired && !observation.trim() && "border-amber-500")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Observação
              {isObservationRequired && (
                <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs font-normal">
                  Obrigatório
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isObservationRequired 
                ? 'Descreva detalhadamente o problema específico (campo obrigatório para "Outros")'
                : 'Descreva o problema em detalhes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder={isObservationRequired 
                ? "OBRIGATÓRIO: Descreva detalhadamente o problema específico..."
                : "Descreva o problema observado, sintomas, comportamento da máquina, etc."}
              rows={4}
              className={cn(
                "resize-none",
                isObservationRequired && !observation.trim() && "border-amber-500 focus-visible:ring-amber-500"
              )}
            />
            {isObservationRequired && !observation.trim() && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Este campo é obrigatório quando o tipo de problema for "Outros"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Botao de Envio */}
        <Button 
          type="submit" 
          size="lg" 
          className={cn(
            "w-full",
            machineStopped && "bg-red-600 hover:bg-red-700"
          )}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Registrando...' : machineStopped ? 'Registrar Chamado URGENTE' : 'Registrar Chamado'}
        </Button>
      </form>
    </div>
  )
}
