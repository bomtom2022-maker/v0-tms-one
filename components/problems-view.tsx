'use client'

import { useState, useMemo } from 'react'
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
import { useAuth } from '@/lib/auth-context'
import { PRIORITY_CONFIG, type Priority } from '@/lib/types'
import { Plus, AlertTriangle, Clock, AlertCircle, Pencil, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProblemsView() {
  const { problems, addProblem, updateProblem } = useData()
  const { currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [editingProblem, setEditingProblem] = useState<{ id: string; name: string; defaultPriority: Priority } | null>(null)
  const [newProblemName, setNewProblemName] = useState('')
  const [newProblemPriority, setNewProblemPriority] = useState<Priority>('medium')
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')

  // Problemas filtrados
  const filteredProblems = useMemo(() => {
    return problems.filter(problem => {
      const matchesSearch = problem.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPriority = priorityFilter === 'all' || problem.defaultPriority === priorityFilter
      return matchesSearch && matchesPriority
    })
  }, [problems, searchTerm, priorityFilter])

  const hasActiveFilters = searchTerm || priorityFilter !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setPriorityFilter('all')
  }

  const handleAddProblem = () => {
    if (!newProblemName.trim()) return
    
    addProblem(newProblemName.trim(), newProblemPriority, currentUser?.id || '', currentUser?.name || '')
    setNewProblemName('')
    setNewProblemPriority('medium')
    setIsOpen(false)
  }

  const handleEditProblem = () => {
    if (!editingProblem || !editingProblem.name.trim()) return
    
    updateProblem(editingProblem.id, editingProblem.name.trim(), editingProblem.defaultPriority, currentUser?.id || '', currentUser?.name || '')
    setEditingProblem(null)
  }

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'high': return AlertTriangle
      case 'medium': return Clock
      case 'low': return AlertCircle
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Problemas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tipos de problemas e prioridades
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo
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

      {/* Edit Problem Dialog */}
      <Dialog open={!!editingProblem} onOpenChange={(open) => !open && setEditingProblem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Problema</DialogTitle>
            <DialogDescription>
              Altere o nome e a prioridade padrão do problema.
            </DialogDescription>
          </DialogHeader>
          
          {editingProblem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-problem-name">Nome do Problema</Label>
                <Input
                  id="edit-problem-name"
                  value={editingProblem.name}
                  onChange={(e) => setEditingProblem({ ...editingProblem, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Prioridade Padrão</Label>
                <Select 
                  value={editingProblem.defaultPriority} 
                  onValueChange={(v) => setEditingProblem({ ...editingProblem, defaultPriority: v as Priority })}
                >
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
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProblem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProblem} disabled={!editingProblem?.name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {/* Busca por nome */}
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Buscar problema</Label>
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 text-sm"
                />
              </div>
            </div>
            
            {/* Filtro por prioridade */}
            <div className="w-full sm:w-40">
              <Label htmlFor="priority-filter" className="sr-only">Filtrar por prioridade</Label>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as Priority | 'all')}>
                <SelectTrigger id="priority-filter" className="h-9 text-sm">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
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
            </div>

            {/* Botao limpar filtros */}
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0 h-9 w-9">
                <X className="w-4 h-4" />
                <span className="sr-only">Limpar filtros</span>
              </Button>
            )}
          </div>

          {/* Resumo dos resultados */}
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <span>
              {filteredProblems.length} de {problems.length}
            </span>
            {hasActiveFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs">
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Problems List */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Problemas Cadastrados</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Problemas disponiveis para chamados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid gap-2 sm:gap-3">
            {filteredProblems.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {hasActiveFilters 
                  ? 'Nenhum encontrado.'
                  : 'Nenhum cadastrado.'}
              </div>
            ) : filteredProblems.map((problem) => {
              const config = PRIORITY_CONFIG[problem.defaultPriority]
              const Icon = getPriorityIcon(problem.defaultPriority)
              
              return (
                <div 
                  key={problem.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border-l-2 sm:border-l-4",
                    config.borderColor,
                    "bg-card hover:bg-muted/50 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn("p-1.5 sm:p-2 rounded-lg", config.bgLight)}>
                      <Icon className={cn("w-3 h-3 sm:w-4 sm:h-4", config.textColor)} />
                    </div>
                    <span className="font-medium text-sm sm:text-base">{problem.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {problem.requiresManualPriority ? (
                      <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground px-1.5">
                        Manual
                      </Badge>
                    ) : (
                      <Badge 
                        variant="secondary"
                        className={cn(config.bgLight, config.textColor, "text-[10px] sm:text-xs px-1.5")}
                      >
                        {config.label}
                      </Badge>
                    )}
                    {!problem.requiresManualPriority && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingProblem({ 
                          id: problem.id, 
                          name: problem.name, 
                          defaultPriority: problem.defaultPriority 
                        })}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
