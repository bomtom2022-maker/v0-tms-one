'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useData } from '@/lib/data-context'
import { formatDuration, formatCurrency, numberToWords } from '@/lib/types'
import { FileText, Clock, DollarSign, Wrench, TrendingUp, Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export function ReportsView() {
  const { tickets, getMaintenanceStats, getMachineById } = useData()

  const completedTickets = tickets.filter(t => t.status === 'completed')
  const totalDowntime = completedTickets.reduce((sum, t) => sum + t.downtime, 0)
  const totalCost = completedTickets.reduce((sum, t) => sum + t.totalCost, 0)
  const stats = getMaintenanceStats()

  // Prepare chart data - Top 10 machines
  const chartData = stats.slice(0, 10).map((stat, index) => ({
    name: stat.machineName.split(' ').slice(0, 2).join(' '),
    fullName: stat.machineName,
    chamados: stat.ticketCount,
    downtime: Math.round(stat.totalDowntime / 60), // Convert to minutes
    fill: index < 3 ? '#ef4444' : index < 6 ? '#f97316' : '#22c55e',
  }))

  const handleGeneratePDF = () => {
    alert('Funcionalidade de geração de PDF será implementada com integração ao backend.')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Relatórios e Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise mensal de manutenções e indicadores
          </p>
        </div>
        <Button onClick={handleGeneratePDF} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Gerar Relatório em PDF
        </Button>
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
                <p className="text-xs text-muted-foreground">Total de Manutenções</p>
                <p className="text-xl font-bold">{numberToWords(completedTickets.length)}</p>
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
                <p className="text-xs text-muted-foreground">Custo em Peças</p>
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
                <p className="text-xs text-muted-foreground">Máquinas Afetadas</p>
                <p className="text-xl font-bold">{numberToWords(stats.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Top Dez - Máquinas com Mais Manutenções
          </CardTitle>
          <CardDescription>
            Tempo de máquina parada por equipamento (em minutos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 11 }} 
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'downtime') return [`${value} minutos`, 'Tempo Parado']
                      return [value, 'Chamados']
                    }}
                    labelFormatter={(label) => {
                      const item = chartData.find(d => d.name === label)
                      return item?.fullName || label
                    }}
                  />
                  <Bar dataKey="downtime" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <p>Nenhuma manutenção finalizada para exibir estatísticas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento por Máquina</CardTitle>
          <CardDescription>Lista completa de manutenções finalizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length > 0 ? (
            <div className="space-y-3">
              {stats.map((stat, index) => {
                const position = index + 1
                const positionColor = position <= 3 ? 'bg-red-500' : position <= 6 ? 'bg-orange-500' : 'bg-green-500'
                
                return (
                  <div 
                    key={stat.machineId}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className={`w-8 h-8 rounded-full ${positionColor} flex items-center justify-center text-white font-bold text-sm`}>
                      {position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{stat.machineName}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {numberToWords(stat.ticketCount)} chamados
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(stat.totalDowntime)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      position <= 3 
                        ? 'bg-red-50 text-red-600 border-red-200' 
                        : position <= 6 
                          ? 'bg-orange-50 text-orange-600 border-orange-200'
                          : 'bg-green-50 text-green-600 border-green-200'
                    }>
                      {position <= 3 ? 'Alta Incidência' : position <= 6 ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma manutenção finalizada para exibir.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
