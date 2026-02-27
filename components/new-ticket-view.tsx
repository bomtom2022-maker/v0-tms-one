'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useData } from '@/lib/data-context'
import { PRIORITY_CONFIG, type Priority } from '@/lib/types'
import { CheckCircle, AlertTriangle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewTicketViewProps {
  onSuccess: () => void
}

export function NewTicketView({ onSuccess }: NewTicketViewProps) {
  const { machines, problems, addTicket } = useData()
  const [machineId, setMachineId] = useState('')
  const [problemId, setProblemId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [observation, setObservation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!machineId || !problemId) return

    setIsSubmitting(true)

    // Simular delay de envio
    setTimeout(() => {
      addTicket({
        machineId,
        problemId,
        priority,
        observation,
      })

      setShowSuccess(true)
      
      // Reset form
      setMachineId('')
      setProblemId('')
      setPriority('medium')
      setObservation('')
      setIsSubmitting(false)

      // Hide success message and navigate
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

        {/* Seleção de Problema */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipo de Problema</CardTitle>
            <CardDescription>Selecione o problema identificado</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={problemId} onValueChange={setProblemId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o problema..." />
              </SelectTrigger>
              <SelectContent>
                {problems.map((problem) => (
                  <SelectItem key={problem.id} value={problem.id}>
                    {problem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Seleção de Prioridade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prioridade</CardTitle>
            <CardDescription>Defina a urgência do chamado</CardDescription>
          </CardHeader>
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
        </Card>

        {/* Observação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observação</CardTitle>
            <CardDescription>Descreva o problema em detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva o problema observado, sintomas, comportamento da máquina, etc."
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Botão de Envio */}
        <Button 
          type="submit" 
          size="lg" 
          className="w-full"
          disabled={!machineId || !problemId || isSubmitting}
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Chamado'}
        </Button>
      </form>
    </div>
  )
}
