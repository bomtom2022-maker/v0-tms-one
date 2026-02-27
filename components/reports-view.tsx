'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useData } from '@/lib/data-context'
import { formatDuration, formatCurrency, PRIORITY_CONFIG } from '@/lib/types'
import { 
  FileText, 
  Clock, 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  Download,
  X,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type FilterType = 'downtime' | 'cost'

export function ReportsView() {
  const { tickets, machines, getMaintenanceStats, getMachineById, getProblemById, getPartById } = useData()
  const [filterType, setFilterType] = useState<FilterType>('downtime')
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null)

  const completedTickets = tickets.filter(t => t.status === 'completed')
  const totalDowntime = completedTickets.reduce((sum, t) => sum + t.downtime, 0)
  const totalCost = completedTickets.reduce((sum, t) => sum + t.totalCost, 0)

  // Calcular stats completas com custo por maquina
  const machineStats = useMemo(() => {
    const stats = new Map<string, { totalDowntime: number; ticketCount: number; totalCost: number }>()
    
    completedTickets.forEach(ticket => {
      const current = stats.get(ticket.machineId) || { totalDowntime: 0, ticketCount: 0, totalCost: 0 }
      stats.set(ticket.machineId, {
        totalDowntime: current.totalDowntime + ticket.downtime,
        ticketCount: current.ticketCount + 1,
        totalCost: current.totalCost + ticket.totalCost,
      })
    })

    return Array.from(stats.entries())
      .map(([machineId, data]) => ({
        machineId,
        machineName: machines.find(m => m.id === machineId)?.name || machineId,
        sector: machines.find(m => m.id === machineId)?.sector || '',
        ...data,
      }))
  }, [completedTickets, machines])

  // Top 10 ordenado pelo filtro selecionado
  const top10 = useMemo(() => {
    return [...machineStats]
      .sort((a, b) => {
        if (filterType === 'downtime') {
          return b.totalDowntime - a.totalDowntime
        }
        return b.totalCost - a.totalCost
      })
      .slice(0, 10)
  }, [machineStats, filterType])

  // Dados da maquina selecionada
  const selectedMachineData = useMemo(() => {
    if (!selectedMachineId) return null
    
    const machine = getMachineById(selectedMachineId)
    const machineTickets = completedTickets.filter(t => t.machineId === selectedMachineId)
    const stats = machineStats.find(s => s.machineId === selectedMachineId)
    
    return {
      machine,
      tickets: machineTickets,
      stats,
    }
  }, [selectedMachineId, completedTickets, machineStats, getMachineById])

  const handleGeneratePDF = () => {
    alert('Funcionalidade de geracao de PDF sera implementada com integracao ao backend.')
  }

  const getPositionStyle = (position: number) => {
    if (position === 1) return 'bg-amber-500 text-white'
    if (position === 2) return 'bg-amber-400 text-white'
    if (position === 3) return 'bg-amber-300 text-slate-900'
    return 'bg-slate-500 text-white'
  }

  const getValue = (stat: typeof top10[0]) => {
    if (filterType === 'downtime') {
      return formatDuration(stat.totalDowntime)
    }
    return formatCurrency(stat.totalCost)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Relatorios e Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            Analise de manutencoes e indicadores
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePDF} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleGeneratePDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Wrench className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Manutencoes</p>
                <p className="text-xl font-bold">{completedTickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo Total Parado</p>
                <p className="text-xl font-bold">{formatDuration(totalDowntime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo em Pecas</p>
                <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Maquinas Afetadas</p>
                <p className="text-xl font-bold">{machineStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Ranking */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5" />
                Top 10 Maquinas
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                {filterType === 'downtime' 
                  ? 'Maquinas que mais ficaram paradas no periodo' 
                  : 'Maquinas que mais geraram custos no periodo'
                }
              </CardDescription>
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="w-[200px] bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downtime">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Tempo Parado
                  </span>
                </SelectItem>
                <SelectItem value="cost">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Custo em Pecas
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {top10.length > 0 ? (
            <div className="space-y-2">
              {top10.map((stat, index) => {
                const position = index + 1
                
                return (
                  <button
                    key={stat.machineId}
                    onClick={() => setSelectedMachineId(stat.machineId)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-full ${getPositionStyle(position)} flex items-center justify-center font-bold text-sm shrink-0`}>
                      {position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{stat.machineName}</p>
                      <p className="text-xs text-slate-400 truncate">{stat.sector}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-white">{getValue(stat)}</p>
                      <p className="text-xs text-slate-400">{stat.ticketCount} chamados</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <p>Nenhuma manutencao finalizada para exibir estatisticas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Maquina */}
      <Dialog open={!!selectedMachineId} onOpenChange={() => setSelectedMachineId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              {selectedMachineData?.machine?.name || 'Detalhes da Maquina'}
            </DialogTitle>
            <DialogDescription>
              {selectedMachineData?.machine?.sector}
            </DialogDescription>
          </DialogHeader>

          {selectedMachineData && (
            <div className="space-y-6 py-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold">{selectedMachineData.stats?.ticketCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Chamados</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {formatDuration(selectedMachineData.stats?.totalDowntime || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Tempo Parado</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedMachineData.stats?.totalCost || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Custo Total</p>
                </div>
              </div>

              {/* Historico de Manutencoes */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Historico de Manutencoes
                </h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {selectedMachineData.tickets.length > 0 ? (
                    selectedMachineData.tickets
                      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
                      .map(ticket => {
                        const problem = getProblemById(ticket.problemId)
                        const priorityConfig = PRIORITY_CONFIG[ticket.priority]
                        const lastAction = ticket.actions[ticket.actions.length - 1]
                        
                        return (
                          <div 
                            key={ticket.id}
                            className="p-4 rounded-lg border bg-card"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{problem?.name || 'Problema'}</p>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${priorityConfig.color} bg-opacity-10`}
                                  >
                                    {priorityConfig.label}
                                  </Badge>
                                  {ticket.resolved ? (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Resolvido
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Nao Resolvido
                                    </Badge>
                                  )}
                                </div>
                                {ticket.observation && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {ticket.observation}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {ticket.completedAt && format(new Date(ticket.completedAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(ticket.downtime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(ticket.totalCost)}
                              </span>
                              {lastAction && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {lastAction.operatorName}
                                </span>
                              )}
                            </div>

                            {/* Pecas utilizadas */}
                            {ticket.usedParts.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-medium mb-2">Pecas utilizadas:</p>
                                <div className="flex flex-wrap gap-2">
                                  {ticket.usedParts.map((up, idx) => {
                                    const part = getPartById(up.partId)
                                    return (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {part?.name} x{up.quantity}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Notas de finalizacao */}
                            {ticket.completionNotes && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-medium mb-1">Observacoes da finalizacao:</p>
                                <p className="text-sm text-muted-foreground">{ticket.completionNotes}</p>
                              </div>
                            )}
                          </div>
                        )
                      })
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma manutencao finalizada para esta maquina.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
