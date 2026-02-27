'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useData } from '@/lib/data-context'
import { PRIORITY_CONFIG, type Priority } from '@/lib/types'
import { Plus, AlertTriangle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProblemsView() {
  const { problems, addProblem } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [newProblemName, setNewProblemName] = useState('')
  const [newProblemPriority, setNewProblemPriority] = useState<Priority>('medium')

  const handleAddProblem = () => {
    if (!newProblemName.trim()) return
    
    addProblem(newProblemName.trim(), newProblemPriority)
    setNewProblemName('')
    setNewProblemPriority('medium')
    setIsOpen(false)
  }

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'high': return AlertTriangle
      case 'medium': return Clock
      case 'low': return AlertCircle
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Cadastro de Problemas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os tipos de problemas e suas prioridades padrão
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Problema
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Problema</DialogTitle>
              <DialogDescription>
                Defina o nome do problema e sua prioridade padrão. A prioridade será sugerida automaticamente ao abrir um chamado.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="problem-name">Nome do Problema</Label>
                <Input
                  id="problem-name"
                  placeholder="Ex: Falha no Motor Principal"
                  value={newProblemName}
                  onChange={(e) => setNewProblemName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Prioridade Padrão</Label>
                <Select value={newProblemPriority} onValueChange={(v) => setNewProblemPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                      const config = PRIORITY_CONFIG[p]
                      const Icon = getPriorityIcon(p)
                      return (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1 rounded", config.color)}>
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Esta prioridade será automaticamente selecionada quando este problema for escolhido em um chamado.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddProblem} disabled={!newProblemName.trim()}>
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Problems List */}
      <Card>
        <CardHeader>
          <CardTitle>Problemas Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os problemas disponíveis para abertura de chamados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {problems.map((problem) => {
              const config = PRIORITY_CONFIG[problem.defaultPriority]
              const Icon = getPriorityIcon(problem.defaultPriority)
              
              return (
                <div 
                  key={problem.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-l-4",
                    config.borderColor,
                    "bg-card hover:bg-muted/50 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", config.bgLight)}>
                      <Icon className={cn("w-4 h-4", config.textColor)} />
                    </div>
                    <span className="font-medium">{problem.name}</span>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={cn(config.bgLight, config.textColor, "text-xs")}
                  >
                    {config.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
