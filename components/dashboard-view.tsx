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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { useNotification } from '@/lib/notification-context'
import { PRIORITY_CONFIG, type Priority } from '@/lib/types'
import { Clock, Search, Filter, Play, Pause, ArrowRight, AlertCircle, Wrench, CheckCircle2, User, CalendarIcon, XCircle, History, ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Ticket } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow, format, isToday, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DashboardViewProps {
  onSelectTicket: (ticketId: string) => void
}

export function DashboardView({ onSelectTicket }: DashboardViewProps) {
  const { tickets, machines, problems, getMachineById, getProblemById, rejectTicket } = useData()
  const { isManutentor, isLider, currentUser } = useAuth()
  const { notify } = useNotification()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMachine, setFilterMachine] = useState<string>('all')
  const [filterProblem, setFilterProblem] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  // Filtro de data para finalizadas
  const [completedDateFilter, setCompletedDateFilter] = useState<Date>(new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Estado para rejeição de chamado (apenas manutentores)
  const [rejectingTicket, setRejectingTicket] = useState<{ id: string; machineName: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  
  // Estados para exibir abas de chamados por status
  const [showOpen, setShowOpen] = useState(false)
  const [showInMaintenance, setShowInMaintenance] = useState(false)
  const [showPaused, setShowPaused] = useState(false)
  const [showUnresolved, setShowUnresolved] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showRejected, setShowRejected] = useState(false)
  
  // Filtros para listas expandidas
  const [pausedFilter, setPausedFilter] = useState({ search: '', machine: 'all', date: '' })
  const [rejectedFilter, setRejectedFilter] = useState({ search: '', machine: 'all', date: '' })
  const [unresolvedFilter, setUnresolvedFilter] = useState({ search: '', machine: 'all', date: '' })
  
  // Estado para Sheet de histórico da manutenção
  const [selectedTicketHistory, setSelectedTicketHistory] = useState<Ticket | null>(null)

  // Estatísticas coerentes com StatusCards
  const dashboardStats = useMemo(() => {
    // Chamados em Aberto (aguardando manutentor)
    const openTickets = tickets.filter(t => t.status === 'open').length
    // Em Manutenção (sendo atendidos agora)
    const inMaintenanceTickets = tickets.filter(t => t.status === 'in-progress').length
    // Pausados
    const pausedTickets = tickets.filter(t => t.status === 'paused').length
    // Nao Resolvidos
    const unresolvedTickets = tickets.filter(t => t.status === 'unresolved').length
    // Finalizados no dia selecionado
    const completedOnDate = tickets.filter(t => {
      if (t.status !== 'completed' || !t.completedAt) return false
      return isSameDay(t.completedAt, completedDateFilter)
    }).length
    // Rejeitados (cancelled)
    const rejectedTickets = tickets.filter(t => t.status === 'cancelled').length

    return {
      open: openTickets,
      inMaintenance: inMaintenanceTickets,
      paused: pausedTickets,
      unresolved: unresolvedTickets,
      completed: completedOnDate,
      rejected: rejectedTickets,
    }
  }, [tickets, completedDateFilter])

  // Total de chamados ativos (open + in-progress + paused + unresolved)
  const totalActive = tickets.filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled'
  ).length

  // Handler para rejeitar chamado (apenas manutentores)
  const handleRejectTicket = async () => {
    if (!rejectingTicket || !rejectionReason.trim() || !currentUser) return
    setIsRejecting(true)
    try {
      await rejectTicket(rejectingTicket.id, rejectionReason.trim(), currentUser.id, currentUser.name)
      
      // Notificar sobre a rejeição
      notify(
        'Chamado Rejeitado',
        `O chamado para a máquina ${rejectingTicket.machineName} foi rejeitado. Motivo: ${rejectionReason.trim()}`,
        'warning'
      )
      
      setRejectingTicket(null)
      setRejectionReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao rejeitar chamado')
    } finally {
      setIsRejecting(false)
    }
  }

  // Último chamado em aberto criado por este lider (somente status 'open')
  const liderLastOpenTicketId = useMemo(() => {
    if (!isLider || !currentUser) return null
    const myOpenTickets = tickets
      .filter(t => t.status === 'open' && t.createdBy === currentUser.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return myOpenTickets[0]?.id ?? null
  }, [isLider, currentUser, tickets])

  // Filtrar tickets ativos (nao finalizados e nao cancelados)
  const activeTickets = useMemo(() => {
    return tickets
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      // Ordenar para que tickets não resolvidos apareçam primeiro
      .sort((a, b) => {
        if (a.status === 'unresolved' && b.status !== 'unresolved') return -1
        if (b.status === 'unresolved' && a.status !== 'unresolved') return 1
        return 0
      })
      .filter(t => {
        const machine = getMachineById(t.machineId)
        const problem = getProblemById(t.problemId)
        
        // Filtro de busca
        if (searchTerm) {
          const search = searchTerm.toLowerCase()
          const matchMachine = machine?.name.toLowerCase().includes(search)
          const problemName = t.customProblemName || problem?.name || ''
          const matchProblem = problemName.toLowerCase().includes(search)
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

  // Listas de chamados por status
  const openTickets = useMemo(() => {
    return tickets.filter(t => t.status === 'open').sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [tickets])

  const inMaintenanceTickets = useMemo(() => {
    return tickets.filter(t => t.status === 'in-progress').sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [tickets])

  const pausedTickets = useMemo(() => {
    return tickets.filter(t => t.status === 'paused').sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [tickets])

  const unresolvedTickets = useMemo(() => {
    return tickets.filter(t => t.status === 'unresolved').sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [tickets])

  const completedTickets = useMemo(() => {
    return tickets
      .filter(t => t.status === 'completed' && t.completedAt && isSameDay(t.completedAt, completedDateFilter))
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return dateB - dateA
      })
  }, [tickets, completedDateFilter])

  const rejectedTickets = useMemo(() => {
    return tickets
      .filter(t => t.status === 'cancelled')
      .sort((a, b) => {
        const dateA = a.cancelledAt ? new Date(a.cancelledAt).getTime() : 0
        const dateB = b.cancelledAt ? new Date(b.cancelledAt).getTime() : 0
        return dateB - dateA
      })
  }, [tickets])

  const clearFilters = () => {
    setSearchTerm('')
    setFilterMachine('all')
    setFilterProblem('all')
    setFilterPriority('all')
  }

  const hasActiveFilters = searchTerm || filterMachine !== 'all' || filterProblem !== 'all' || filterPriority !== 'all'

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCompletedDateFilter(date)
      setCalendarOpen(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalActive} chamados ativos
          </p>
        </div>
      </div>

      {/* Status Cards - 6 contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Em Aberto */}
        <Card 
          className={cn(
            "border-l-2 sm:border-l-4 border-l-red-500 cursor-pointer transition-all hover:shadow-md",
            showOpen && "ring-2 ring-red-500"
          )}
          onClick={() => setShowOpen(!showOpen)}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Em Aberto</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-500">{dashboardStats.open}</p>
                <p className="text-[9px] text-muted-foreground">Clique para ver</p>
              </div>
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Em Manutenção */}
        <Card 
          className={cn(
            "border-l-2 sm:border-l-4 border-l-blue-500 cursor-pointer transition-all hover:shadow-md",
            showInMaintenance && "ring-2 ring-blue-500"
          )}
          onClick={() => setShowInMaintenance(!showInMaintenance)}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Em Manutenção</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-500">{dashboardStats.inMaintenance}</p>
                <p className="text-[9px] text-muted-foreground">Clique para ver</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-full">
                <Wrench className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pausados */}
        <Card 
          className={cn(
            "border-l-2 sm:border-l-4 border-l-orange-500 cursor-pointer transition-all hover:shadow-md",
            showPaused && "ring-2 ring-orange-500"
          )}
          onClick={() => setShowPaused(!showPaused)}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Pausados</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-500">{dashboardStats.paused}</p>
                <p className="text-[9px] text-muted-foreground">Clique para ver</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-full">
                <Pause className="w-4 h-4 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Não Resolvidos */}
        <Card 
          className={cn(
            "border-l-2 sm:border-l-4 border-l-yellow-500 cursor-pointer transition-all hover:shadow-md",
            showUnresolved && "ring-2 ring-yellow-500"
          )}
          onClick={() => setShowUnresolved(!showUnresolved)}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Não Resolvidos</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{dashboardStats.unresolved}</p>
                <p className="text-[9px] text-muted-foreground">Clique para ver</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-full">
                <Play className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finalizadas hoje - Com filtro de data */}
        <Card 
          className={cn(
            "border-l-2 sm:border-l-4 border-l-green-500 col-span-2 sm:col-span-1 cursor-pointer transition-all hover:shadow-md",
            showCompleted && "ring-2 ring-green-500"
          )}
          onClick={() => setShowCompleted(!showCompleted)}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Finalizados</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-500">{dashboardStats.completed}</p>
                <p className="text-[9px] text-muted-foreground">Clique para ver</p>
              </div>
              <div className="p-2 bg-green-50 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
            </div>
            {/* Filtro de data para finalizados */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-left font-normal h-6 text-[9px] px-2 mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {isToday(completedDateFilter) 
                    ? 'Hoje' 
                    : format(completedDateFilter, "dd/MM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={completedDateFilter}
                  onSelect={handleDateSelect}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Rejeitados */}
        <Card 
          className={cn(
            "border-l-2 sm:border-l-4 border-l-gray-500 cursor-pointer transition-all hover:shadow-md",
            showRejected && "ring-2 ring-gray-500"
          )}
          onClick={() => setShowRejected(!showRejected)}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Rejeitados</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-500">{dashboardStats.rejected}</p>
                <p className="text-[9px] text-muted-foreground">Clique para ver</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-full">
                <XCircle className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Chamados Em Aberto */}
      {showOpen && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Chamados Em Aberto
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowOpen(false)}>
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {openTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado em aberto</p>
            ) : (
              <div className="space-y-2">
                {openTickets.map((ticket) => {
                  const machine = getMachineById(ticket.machineId)
                  const problem = getProblemById(ticket.problemId)
                  return (
                    <div key={ticket.id} className="p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => onSelectTicket(ticket.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{machine?.name || 'Máquina'}</p>
                          <p className="text-xs text-muted-foreground">{ticket.customProblemName || problem?.name || 'Problema'}</p>
                          <p className="text-xs text-muted-foreground mt-1">Reportado por: {ticket.createdByName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">Aguardando</Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(ticket.createdAt), "dd/MM HH:mm", { locale: ptBR })}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Chamados Em Manutenção */}
      {showInMaintenance && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                Chamados Em Manutenção
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowInMaintenance(false)}>
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {inMaintenanceTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado em manutenção</p>
            ) : (
              <div className="space-y-2">
                {inMaintenanceTickets.map((ticket) => {
                  const machine = getMachineById(ticket.machineId)
                  const problem = getProblemById(ticket.problemId)
                  const lastAction = ticket.actions[ticket.actions.length - 1]
                  return (
                    <div key={ticket.id} className="p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => onSelectTicket(ticket.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{machine?.name || 'Máquina'}</p>
                          <p className="text-xs text-muted-foreground">{ticket.customProblemName || problem?.name || 'Problema'}</p>
                          <p className="text-xs text-muted-foreground mt-1">Manutentor: {lastAction?.operatorName || '-'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">Trabalhando</Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(ticket.createdAt), "dd/MM HH:mm", { locale: ptBR })}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Chamados Pausados */}
      {showPaused && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Pause className="w-4 h-4 text-orange-500" />
                Chamados Pausados ({pausedTickets.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPaused(false)}>
                Fechar
              </Button>
            </div>
            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={pausedFilter.search}
                  onChange={(e) => setPausedFilter(f => ({ ...f, search: e.target.value }))}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <Select value={pausedFilter.machine} onValueChange={(v) => setPausedFilter(f => ({ ...f, machine: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as máquinas</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={pausedFilter.date}
                onChange={(e) => setPausedFilter(f => ({ ...f, date: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {(() => {
              const filtered = pausedTickets.filter(ticket => {
                const machine = getMachineById(ticket.machineId)
                const problem = getProblemById(ticket.problemId)
                const matchSearch = pausedFilter.search === '' || 
                  machine?.name.toLowerCase().includes(pausedFilter.search.toLowerCase()) ||
                  (ticket.customProblemName || problem?.name || '').toLowerCase().includes(pausedFilter.search.toLowerCase())
                const matchMachine = pausedFilter.machine === 'all' || ticket.machineId === pausedFilter.machine
                const matchDate = pausedFilter.date === '' || format(new Date(ticket.createdAt), 'yyyy-MM-dd') === pausedFilter.date
                return matchSearch && matchMachine && matchDate
              })
              
              if (filtered.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado pausado encontrado</p>
              }
              
              return (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filtered.map((ticket) => {
                    const machine = getMachineById(ticket.machineId)
                    const problem = getProblemById(ticket.problemId)
                    const pauseActions = ticket.actions.filter(a => a.type === 'pause')
                    const pauseCount = pauseActions.length
                    const lastPauseAction = pauseActions[pauseActions.length - 1]
                    return (
                      <div key={ticket.id} className="p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => onSelectTicket(ticket.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{machine?.name || 'Máquina'}</p>
                            <p className="text-xs text-muted-foreground">{ticket.customProblemName || problem?.name || 'Problema'}</p>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">Pausado</Badge>
                              {pauseCount > 1 && (
                                <Badge variant="outline" className="text-[9px] bg-orange-100 text-orange-700 border-orange-300">
                                  Pausa {pauseCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(ticket.createdAt), "dd/MM HH:mm", { locale: ptBR })}</p>
                          </div>
                        </div>
                        <div className="mt-2 p-2 rounded bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800">
                          <p className="text-[10px] font-medium text-orange-700 dark:text-orange-300">Motivo da pausa:</p>
                          <p className="text-xs text-orange-800 dark:text-orange-200">{lastPauseAction?.reason || 'Sem motivo informado'}</p>
                          {lastPauseAction?.operatorName && (
                            <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Pausado por: <span className="font-medium">{lastPauseAction.operatorName}</span>
                            </p>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedTicketHistory(ticket); }}
                            className="text-[10px] text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200 mt-1.5 flex items-center gap-0.5 underline"
                          >
                            <History className="w-3 h-3" />
                            Ver histórico completo
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Lista de Chamados Não Resolvidos */}
      {showUnresolved && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Play className="w-4 h-4 text-yellow-600" />
                Chamados Não Resolvidos ({unresolvedTickets.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowUnresolved(false)}>
                Fechar
              </Button>
            </div>
            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={unresolvedFilter.search}
                  onChange={(e) => setUnresolvedFilter(f => ({ ...f, search: e.target.value }))}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <Select value={unresolvedFilter.machine} onValueChange={(v) => setUnresolvedFilter(f => ({ ...f, machine: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as máquinas</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={unresolvedFilter.date}
                onChange={(e) => setUnresolvedFilter(f => ({ ...f, date: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {(() => {
              const filtered = unresolvedTickets.filter(ticket => {
                const machine = getMachineById(ticket.machineId)
                const problem = getProblemById(ticket.problemId)
                const matchSearch = unresolvedFilter.search === '' || 
                  machine?.name.toLowerCase().includes(unresolvedFilter.search.toLowerCase()) ||
                  (ticket.customProblemName || problem?.name || '').toLowerCase().includes(unresolvedFilter.search.toLowerCase())
                const matchMachine = unresolvedFilter.machine === 'all' || ticket.machineId === unresolvedFilter.machine
                const matchDate = unresolvedFilter.date === '' || format(new Date(ticket.createdAt), 'yyyy-MM-dd') === unresolvedFilter.date
                return matchSearch && matchMachine && matchDate
              })
              
              if (filtered.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado não resolvido encontrado</p>
              }
              
              return (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filtered.map((ticket) => {
                    const machine = getMachineById(ticket.machineId)
                    const problem = getProblemById(ticket.problemId)
                    return (
                      <div key={ticket.id} className="p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => onSelectTicket(ticket.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{machine?.name || 'Máquina'}</p>
                            <p className="text-xs text-muted-foreground">{ticket.customProblemName || problem?.name || 'Problema'}</p>
                            <p className="text-xs text-muted-foreground mt-1">Reportado por: {ticket.createdByName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-300">Não Resolvido</Badge>
                            <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(ticket.createdAt), "dd/MM HH:mm", { locale: ptBR })}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Lista de Chamados Finalizados */}
      {showCompleted && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Chamados Finalizados ({isToday(completedDateFilter) ? 'Hoje' : format(completedDateFilter, "dd/MM", { locale: ptBR })})
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCompleted(false)}>
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {completedTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado finalizado nesta data</p>
            ) : (
              <div className="space-y-2">
                {completedTickets.map((ticket) => {
                  const machine = getMachineById(ticket.machineId)
                  const problem = getProblemById(ticket.problemId)
                  const lastAction = ticket.actions[ticket.actions.length - 1]
                  return (
                    <div key={ticket.id} className="p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => onSelectTicket(ticket.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{machine?.name || 'Máquina'}</p>
                          <p className="text-xs text-muted-foreground">{ticket.customProblemName || problem?.name || 'Problema'}</p>
                          <p className="text-xs text-muted-foreground mt-1">Finalizado por: {lastAction?.operatorName || '-'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                            {ticket.resolved ? 'Resolvido' : 'Finalizado'}
                          </Badge>
                          {ticket.completedAt && (
                            <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(ticket.completedAt), "dd/MM HH:mm", { locale: ptBR })}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Chamados Rejeitados */}
      {showRejected && (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-500" />
                Chamados Rejeitados ({rejectedTickets.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowRejected(false)}>
                Fechar
              </Button>
            </div>
            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={rejectedFilter.search}
                  onChange={(e) => setRejectedFilter(f => ({ ...f, search: e.target.value }))}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <Select value={rejectedFilter.machine} onValueChange={(v) => setRejectedFilter(f => ({ ...f, machine: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as máquinas</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={rejectedFilter.date}
                onChange={(e) => setRejectedFilter(f => ({ ...f, date: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {(() => {
              const filtered = rejectedTickets.filter(ticket => {
                const machine = getMachineById(ticket.machineId)
                const problem = getProblemById(ticket.problemId)
                const matchSearch = rejectedFilter.search === '' || 
                  machine?.name.toLowerCase().includes(rejectedFilter.search.toLowerCase()) ||
                  (ticket.customProblemName || problem?.name || '').toLowerCase().includes(rejectedFilter.search.toLowerCase()) ||
                  (ticket.cancellationReason || '').toLowerCase().includes(rejectedFilter.search.toLowerCase())
                const matchMachine = rejectedFilter.machine === 'all' || ticket.machineId === rejectedFilter.machine
                const ticketDate = ticket.cancelledAt ? format(new Date(ticket.cancelledAt), 'yyyy-MM-dd') : format(new Date(ticket.createdAt), 'yyyy-MM-dd')
                const matchDate = rejectedFilter.date === '' || ticketDate === rejectedFilter.date
                return matchSearch && matchMachine && matchDate
              })
              
              if (filtered.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado rejeitado encontrado</p>
              }
              
              return (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filtered.map((ticket) => {
                    const machine = getMachineById(ticket.machineId)
                    const problem = getProblemById(ticket.problemId)
                    return (
                      <div key={ticket.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{machine?.name || 'Máquina'}</p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.customProblemName || problem?.name || 'Problema'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Reportado por: {ticket.createdByName}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-700">
                              Rejeitado
                            </Badge>
                            {ticket.cancelledAt && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(new Date(ticket.cancelledAt), "dd/MM HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Motivo da Rejeição */}
                        <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                          <p className="text-[10px] font-medium text-destructive">Motivo da Rejeição:</p>
                          <p className="text-xs text-foreground">{ticket.cancellationReason || '-'}</p>
                          {ticket.cancelledByName && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Rejeitado por: {ticket.cancelledByName}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Filters - Compacto para mobile */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {/* Search */}
            <div className="relative col-span-2">
              <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-9 h-9 text-sm"
              />
            </div>

            {/* Machine Filter */}
            <Select value={filterMachine} onValueChange={setFilterMachine}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Maquina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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

      {/* Reported Tickets Section - Somente Visualizacao */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Manutencoes Reportadas</CardTitle>
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
                  ? 'Em Manutenção' 
                  : ticket.status === 'paused'
                    ? 'Pausado'
                    : ticket.status === 'unresolved'
                      ? 'Problema Não Finalizado'
                      : 'Aguardando'

                const statusColor = ticket.status === 'in-progress'
                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
                  : ticket.status === 'paused'
                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400'
                    : ticket.status === 'unresolved'
                      ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400'
                      : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'

                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "p-3 sm:p-4 hover:bg-muted/50 transition-colors border-l-2 sm:border-l-4",
                      priorityConfig.borderColor
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                            {machine?.name || 'Maquina'}
                          </h3>
                          <Badge 
                            variant="secondary"
                            className={cn(priorityConfig.bgLight, priorityConfig.textColor, "text-[10px] sm:text-xs px-1.5 py-0")}
                          >
                            {priorityConfig.label}
                          </Badge>
                          {ticket.machineStopped && (
                            <Badge variant="destructive" className="text-[10px] sm:text-xs animate-pulse px-1.5 py-0">
                              PARADA
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          {ticket.customProblemName || problem?.name || 'Problema'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-xs text-muted-foreground">
                          <Badge variant="outline" className={cn("text-[10px] sm:text-xs px-1.5 py-0", statusColor)}>
                            {ticket.status === 'in-progress' && <Play className="w-2.5 h-2.5 mr-0.5" />}
                            {ticket.status === 'paused' && <Pause className="w-2.5 h-2.5 mr-0.5" />}
                            {ticket.status === 'unresolved' && <AlertCircle className="w-2.5 h-2.5 mr-0.5" />}
                            {statusLabel}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(ticket.createdAt, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                          {ticket.createdByName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Reportado por <span className="font-medium text-foreground">{ticket.createdByName}</span>
                            </span>
                          )}
                        </div>
                        {/* Motivo da pausa - exibido quando ticket está pausado */}
                        {ticket.status === 'paused' && (() => {
                          const pauseActions = ticket.actions.filter(a => a.type === 'pause')
                          const pauseCount = pauseActions.length
                          const lastPauseAction = pauseActions[pauseActions.length - 1]
                          return (
                            <div className="mt-2 p-2 rounded bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-medium text-yellow-700 dark:text-yellow-300">Motivo da pausa:</p>
                                {pauseCount > 1 && (
                                  <Badge variant="outline" className="text-[9px] bg-yellow-100 text-yellow-700 border-yellow-300">
                                    Pausa {pauseCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-yellow-800 dark:text-yellow-200">{lastPauseAction?.reason || 'Sem motivo informado'}</p>
                              {lastPauseAction?.operatorName && (
                                <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Pausado por: <span className="font-medium">{lastPauseAction.operatorName}</span>
                                </p>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedTicketHistory(ticket); }}
                                className="text-[10px] text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200 mt-1.5 flex items-center gap-0.5 underline"
                              >
                                <History className="w-3 h-3" />
                                Ver histórico completo
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                      
                      {/* Botao de gerenciar - apenas para manutentores */}
                      {isManutentor && (
                        <div className="shrink-0">
                          <Button 
                            variant={ticket.status === 'unresolved' ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                              "w-full sm:w-auto h-8 text-xs sm:text-sm",
                              ticket.status === 'unresolved' && 'border-orange-500 text-orange-600 hover:bg-orange-50'
                            )}
                            onClick={() => onSelectTicket(ticket.id)}
                          >
                            {ticket.status === 'open' ? 'Iniciar' : ticket.status === 'unresolved' ? 'Continuar' : 'Gerenciar'}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}

                      {/* Botao rejeitar - apenas manutentores podem rejeitar chamados em aberto */}
                      {ticket.status === 'open' && isManutentor && (
                        <div className="shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto h-8 text-xs sm:text-sm border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => setRejectingTicket({ id: ticket.id, machineName: machine?.name || 'Máquina' })}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Rejeição */}
      <Dialog open={!!rejectingTicket} onOpenChange={(open) => !open && setRejectingTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Chamado</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja rejeitar o chamado de <strong>{rejectingTicket?.machineName}</strong>?
              <br />
              <span className="text-destructive">Esta ação não pode ser desfeita.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Motivo da rejeição <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Descreva o motivo da rejeição do chamado..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingTicket(null); setRejectionReason('') }} disabled={isRejecting}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectTicket} 
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de Histórico da Manutenção */}
      <Sheet open={!!selectedTicketHistory} onOpenChange={(open) => !open && setSelectedTicketHistory(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico da Manutenção
            </SheetTitle>
            <SheetDescription>
              {selectedTicketHistory && (() => {
                const machine = getMachineById(selectedTicketHistory.machineId)
                const problem = getProblemById(selectedTicketHistory.problemId)
                return (
                  <span>
                    <strong>{machine?.name || 'Máquina'}</strong> - {selectedTicketHistory.customProblemName || problem?.name || 'Problema'}
                  </span>
                )
              })()}
            </SheetDescription>
          </SheetHeader>
          
          {selectedTicketHistory && (
            <div className="mt-6 space-y-4">
              {/* Informações do Chamado */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm font-medium">
                  {format(new Date(selectedTicketHistory.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Por: <span className="font-medium text-foreground">{selectedTicketHistory.createdByName}</span>
                </p>
              </div>

              {/* Linha do Tempo */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Linha do Tempo
                </h4>
                <div className="relative border-l-2 border-muted-foreground/20 ml-2 space-y-4">
                  {/* Evento de criação */}
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="p-2 rounded bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300">Chamado Criado</p>
                      <p className="text-[10px] text-green-600 dark:text-green-400">
                        {format(new Date(selectedTicketHistory.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Por: {selectedTicketHistory.createdByName}
                      </p>
                    </div>
                  </div>
                  
                  {/* Ações da manutenção */}
                  {selectedTicketHistory.actions.map((action, index) => {
                    const actionConfig = {
                      start: { label: 'Manutenção Iniciada', color: 'blue', icon: Play },
                      pause: { label: 'Manutenção Pausada', color: 'orange', icon: Pause },
                      resume: { label: 'Manutenção Retomada', color: 'blue', icon: Play },
                      complete: { label: 'Manutenção Finalizada', color: 'green', icon: CheckCircle2 },
                    }[action.type] || { label: action.type, color: 'gray', icon: Clock }
                    
                    const IconComponent = actionConfig.icon
                    const colorClasses = {
                      blue: 'bg-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
                      orange: 'bg-orange-500 text-orange-700 dark:text-orange-300 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
                      green: 'bg-green-500 text-green-700 dark:text-green-300 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
                      gray: 'bg-gray-500 text-gray-700 dark:text-gray-300 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800',
                    }[actionConfig.color]

                    return (
                      <div key={index} className="relative pl-6">
                        <div className={cn("absolute -left-[9px] top-0 w-4 h-4 rounded-full flex items-center justify-center", colorClasses.split(' ')[0])}>
                          <IconComponent className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div className={cn("p-2 rounded border", colorClasses.split(' ').slice(1).join(' '))}>
                          <p className={cn("text-xs font-medium", colorClasses.split(' ')[1])}>{actionConfig.label}</p>
                          <p className={cn("text-[10px]", colorClasses.split(' ')[1].replace('700', '600').replace('300', '400'))}>
                            {format(new Date(action.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Por: <span className="font-medium text-foreground">{action.operatorName}</span>
                          </p>
                          {action.reason && (
                            <p className="text-xs mt-1 p-1.5 rounded bg-background/50">
                              <span className="font-medium">Motivo:</span> {action.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resumo de Pausas */}
              {(() => {
                const pauseActions = selectedTicketHistory.actions.filter(a => a.type === 'pause')
                if (pauseActions.length === 0) return null
                return (
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800">
                    <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
                      Resumo de Pausas ({pauseActions.length})
                    </h4>
                    <div className="space-y-2">
                      {pauseActions.map((pause, idx) => (
                        <div key={idx} className="text-xs p-2 rounded bg-background/50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Pausa {idx + 1}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(pause.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">Por: {pause.operatorName}</p>
                          {pause.reason && <p className="mt-1">Motivo: {pause.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Botão para gerenciar */}
              {isManutentor && (
                <Button 
                  className="w-full" 
                  onClick={() => {
                    onSelectTicket(selectedTicketHistory.id)
                    setSelectedTicketHistory(null)
                  }}
                >
                  Gerenciar Manutenção
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
