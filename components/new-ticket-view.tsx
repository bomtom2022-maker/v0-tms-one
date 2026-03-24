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
import { CheckCircle, AlertTriangle, Clock, AlertCircle, AlertOctagon, Search, ChevronDown, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  const [problemSearch, setProblemSearch] = useState('')
  const [showAllProblems, setShowAllProblems] = useState(false)
  const [customProblem, setCustomProblem] = useState('')
  const [isOtherSelected, setIsOtherSelected] = useState(false)

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

  // Filtrar problemas: busca + mostrar apenas os 5 mais recentes se não estiver buscando
  const filteredProblems = problems.filter(p => 
    p.name.toLowerCase().includes(problemSearch.toLowerCase())
  )
  
  // Pegar os 5 últimos cadastrados (assumindo que os mais recentes estão no final do array)
  const recentProblems = showAllProblems || problemSearch 
    ? filteredProblems 
    : filteredProblems.slice(-5).reverse()

  const handleProblemChange = (value: string) => {
    if (value === 'OTHER_CUSTOM') {
      setIsOtherSelected(true)
      setProblemId('')
      setManualPriority(true) // Problema personalizado requer prioridade manual
    } else {
      setIsOtherSelected(false)
      setCustomProblem('')
      setProblemId(value)
    }
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
    
    if (!machineId || (!problemId && !isOtherSelected)) return
    if (isOtherSelected && !customProblem.trim()) return

    setIsSubmitting(true)

    setTimeout(() => {
      addTicket({
        machineId,
        // Se não tiver problemId (outro), usar o primeiro problema cadastrado
        problemId: problemId || problems[0]?.id || '',
        priority,
        observation,
        machineStopped,
        createdBy: currentUser?.id || '',
        createdByName: currentUser?.name || '',
        // Campo dedicado para o nome do problema personalizado
        customProblemName: isOtherSelected ? customProblem.trim() : undefined,
      })

      setShowSuccess(true)
      
      setMachineId('')
      setProblemId('')
      setPriority('medium')
      setManualPriority(false)
      setObservation('')
      setMachineStopped(false)
      setIsSubmitting(false)
      setProblemSearch('')
      setShowAllProblems(false)
      setCustomProblem('')
      setIsOtherSelected(false)

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
  const isObservationRequired = isOtherProblem || isOtherSelected
  
  // Validação do formulário
  const hasValidProblem = problemId || (isOtherSelected && customProblem.trim().length > 0)
  const isFormValid = machineId && hasValidProblem && (!isObservationRequired || observation.trim().length > 0 || customProblem.trim().length > 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          Novo Chamado
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registre um novo chamado
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Seleção de Máquina */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Maquina CNC</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Selecione a maquina</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
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
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="machine-stopped"
                checked={machineStopped}
                onCheckedChange={(checked) => setMachineStopped(checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="machine-stopped" 
                  className={cn(
                    "text-sm sm:text-base font-medium cursor-pointer flex items-center gap-2",
                    machineStopped && "text-red-600"
                  )}
                >
                  <AlertOctagon className={cn("w-4 sm:w-5 h-4 sm:h-5", machineStopped ? "text-red-500" : "text-muted-foreground")} />
                  Maquina Parada
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Marque se a maquina nao pode operar
                </p>
              </div>
            </div>
            {machineStopped && (
              <div className="mt-3 p-2 sm:p-3 bg-red-100 rounded-lg border border-red-200">
                <p className="text-xs sm:text-sm text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Chamado URGENTE
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seleção de Problema */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Tipo de Problema</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isOtherSelected ? 'Descreva o problema' : 'Selecione ou busque o problema'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar problema..."
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {problemSearch && (
                <button
                  type="button"
                  onClick={() => setProblemSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Lista de problemas ou select */}
            {!isOtherSelected ? (
              <div className="space-y-2">
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {recentProblems.map((problem) => {
                    const config = PRIORITY_CONFIG[problem.defaultPriority]
                    const isSelected = problemId === problem.id
                    return (
                      <button
                        key={problem.id}
                        type="button"
                        onClick={() => handleProblemChange(problem.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-muted-foreground/50"
                        )}
                      >
                        {problem.requiresManualPriority ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
                        ) : (
                          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", config.color)} />
                        )}
                        <span className={cn("text-sm", isSelected && "font-medium")}>{problem.name}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Mostrar mais / menos */}
                {!problemSearch && problems.length > 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowAllProblems(!showAllProblems)}
                  >
                    <ChevronDown className={cn("w-4 h-4 mr-1 transition-transform", showAllProblems && "rotate-180")} />
                    {showAllProblems ? 'Mostrar menos' : `Ver todos (${problems.length})`}
                  </Button>
                )}

                {/* Opção "Outro" */}
                <button
                  type="button"
                  onClick={() => handleProblemChange('OTHER_CUSTOM')}
                  className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 w-full text-left transition-all"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm text-muted-foreground">Outro problema (descrever)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Descreva o problema..."
                  value={customProblem}
                  onChange={(e) => setCustomProblem(e.target.value)}
                  className="w-full"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOtherSelected(false)
                    setCustomProblem('')
                    setManualPriority(false)
                  }}
                >
                  Voltar para lista
                </Button>
              </div>
            )}
            
            {selectedProblem && !manualPriority && !machineStopped && !selectedProblem.requiresManualPriority && (
              <div className="p-3 rounded-lg bg-muted/50">
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
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    Prioridade {selectedProblem?.requiresManualPriority ? "" : "Manual"}
                    {selectedProblem?.requiresManualPriority && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs">Obrigatorio</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {selectedProblem?.requiresManualPriority 
                      ? "Defina a prioridade"
                      : "Definir manualmente?"}
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
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
                          "p-2 sm:p-4 rounded-lg border-2 transition-all text-center sm:text-left",
                          isSelected 
                            ? `${config.borderColor} ${config.bgLight}` 
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                          <div className={cn("p-1 sm:p-1.5 rounded", config.color)}>
                            <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                          <div>
                            <p className={cn("font-medium text-xs sm:text-sm", isSelected && config.textColor)}>
                              {config.label}
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
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              Observacao
              {isObservationRequired && (
                <Badge variant="outline" className="text-amber-600 border-amber-500 text-[10px] sm:text-xs font-normal">
                  Obrigatorio
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isObservationRequired 
                ? 'Descreva detalhadamente o problema'
                : 'Descreva o problema (opcional)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder={isObservationRequired 
                ? "Descreva o problema..."
                : "Descreva o problema observado..."}
              rows={3}
              className={cn(
                "resize-none text-sm",
                isObservationRequired && !observation.trim() && "border-amber-500 focus-visible:ring-amber-500"
              )}
            />
            {isObservationRequired && !observation.trim() && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Campo obrigatorio
              </p>
            )}
          </CardContent>
        </Card>

        {/* Botao de Envio */}
        <Button 
          type="submit" 
          size="lg" 
          className={cn(
            "w-full h-12 text-sm sm:text-base font-semibold",
            machineStopped && "bg-red-600 hover:bg-red-700"
          )}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Registrando...' : machineStopped ? 'REGISTRAR URGENTE' : 'Registrar Chamado'}
        </Button>
      </form>
    </div>
  )
}
