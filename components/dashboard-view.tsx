'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useData } from '@/lib/data-context'
import { PRIORITY_CONFIG, MACHINE_STATUS_CONFIG, type Priority } from '@/lib/types'
import { Clock, Search, Filter, Play, Pause, ArrowRight, AlertOctagon, Cog } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DashboardViewProps {
  onSelectTicket: (ticketId: string) => void
}

export function DashboardView({ onSelectTicket }: DashboardViewProps) {
  const { tickets, machines, problems, getMachineById, getProblemById } = useData()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMachine, setFilterMachine] = useState<string>('all')
  const [filterProblem, setFilterProblem] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const totalActive = tickets.filter(t => t.status !== 'completed').length
  const completedToday = tickets.filter(t => {
    if (t.status !== 'completed' || !t.completedAt) return false
    const today = new Date()
    return t.completedAt.toDateString() === today.toDateString()
  }).length

  // Contagem de maquinas por status
  const machineStats = useMemo(() => {
    return {
      critical: machines.filter(m => m.status === 'critical').length,
      attention: machines.filter(m => m.status === 'attention').length,
      ok: machines.filter(m => m.status === 'ok').length,
    }
  }, [machines])

  // Filtrar tickets ativos (não finalizados)
  const activeTickets = useMemo(() => {
    return tickets
      .filter(t => t.status !== 'completed')
      .filter(t => {
        const machine = getMachineById(t.machineId)
        const problem = getProblemById(t.problemId)
        
        // Filtro de busca
        if (searchTerm) {
          const search = searchTerm.toLowerCase()
          const matchMachine = machine?.name.toLowerCase().includes(search)
          const matchProblem = problem?.name.toLowerCase().includes(search)
          const matchObservation = t.observation.toLowerCase().includes(search)
          if (!matchMachine && !matchProblem && !matchObservation) return false
        }
        
        // Filtro de máquina
        if (filterMachine !== 'all' && t.machineId !== filterMachine) return false
        
        // Filtro de problema
        if (filterProblem !== 'all' && t.problemId !== filterProblem) return false
        
        // Filtro de prioridade
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false
        
        return true
      })
  }, [tickets, searchTerm, filterMachine, filterProblem, filterPriority, getMachineById, getProblemById])

  const clearFilters = () => {
    setSearchTerm('')
    setFilterMachine('all')
    setFilterProblem('all')
    setFilterPriority('all')
  }

  const hasActiveFilters = searchTerm || filterMachine !== 'all' || filterProblem !== 'all' || filterPriority !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Dashboard de Gestao
        </h1>
        <p className="text-muted-foreground mt-1">
          {totalActive} chamados ativos &bull; {completedToday} finalizados hoje
        </p>
      </div>

      {/* Machine Status Cards - Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maquinas Criticas</p>
                <p className="text-3xl font-bold text-red-500">{machineStats.critical}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <AlertOctagon className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {machines.filter(m => m.status === 'critical').slice(0, 3).map(m => (
                  <Badge key={m.id} variant="secondary" className="text-xs bg-red-50 text-red-600">
                    {m.name.split(' ').slice(0, 2).join(' ')}
                  </Badge>
                ))}
                {machineStats.critical > 3 && (
                  <Badge variant="secondary" className="text-xs">+{machineStats.critical - 3}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Observacao</p>
                <p className="text-3xl font-bold text-orange-500">{machineStats.attention}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <Cog className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {machines.filter(m => m.status === 'attention').slice(0, 3).map(m => (
                  <Badge key={m.id} variant="secondary" className="text-xs bg-orange-50 text-orange-600">
                    {m.name.split(' ').slice(0, 2).join(' ')}
                  </Badge>
                ))}
                {machineStats.attention > 3 && (
                  <Badge variant="secondary" className="text-xs">+{machineStats.attention - 3}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Operacao Normal</p>
                <p className="text-3xl font-bold text-green-500">{machineStats.ok}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Cog className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Machine Filter */}
            <Select value={filterMachine} onValueChange={setFilterMachine}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as Maquinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Maquinas</SelectItem>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Problem Filter */}
            <Select value={filterProblem} onValueChange={setFilterProblem}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os Problemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Problemas</SelectItem>
                {problems.map((problem) => (
                  <SelectItem key={problem.id} value={problem.id}>
                    {problem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as Prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_CONFIG[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reported Tickets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manutencoes Reportadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeTickets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? 'Nenhum chamado encontrado com os filtros aplicados.'
                  : 'Nenhum chamado ativo no momento.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {activeTickets.map((ticket) => {
                const machine = getMachineById(ticket.machineId)
                const problem = getProblemById(ticket.problemId)
                const priorityConfig = PRIORITY_CONFIG[ticket.priority]
                
                const statusLabel = ticket.status === 'in-progress' 
                  ? 'Em Manutencao' 
                  : ticket.status === 'paused'
                    ? 'Pausado'
                    : 'Aguardando'

                const statusColor = ticket.status === 'in-progress'
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : ticket.status === 'paused'
                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'

                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors border-l-4",
                      priorityConfig.borderColor
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">
                            {machine?.name || 'Maquina Desconhecida'}
                          </h3>
                          <Badge 
                            variant="secondary"
                            className={cn(priorityConfig.bgLight, priorityConfig.textColor, "text-xs")}
                          >
                            {priorityConfig.label}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", statusColor)}>
                            {ticket.status === 'in-progress' && <Play className="w-3 h-3 mr-1" />}
                            {ticket.status === 'paused' && <Pause className="w-3 h-3 mr-1" />}
                            {statusLabel}
                          </Badge>
                          {ticket.machineStopped && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                              <AlertOctagon className="w-3 h-3 mr-1" />
                              Maquina Parada
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {problem?.name || 'Problema nao especificado'}
                        </p>
                        {ticket.observation && (
                          <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                            {ticket.observation}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(ticket.createdAt, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => onSelectTicket(ticket.id)}
                        className="shrink-0"
                      >
                        {ticket.status === 'open' ? 'Iniciar' : 'Gerenciar'}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
