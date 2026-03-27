'use client'

import { useState, useMemo, useEffect } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { formatDuration, formatDurationLong, formatCurrency, PRIORITY_CONFIG, type AuditLog, type Shift, type MachineMetrics } from '@/lib/types'
import { fetchShifts, updateMachineShift } from '@/lib/supabase-data'
import {
  FileText,
  Clock,
  Wrench,
  TrendingUp,
  Calendar as CalendarIcon,
  User,
  CheckCircle,
  Filter,
  X,
  Package,
  Settings,
  Printer,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { format, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

type ReportType = 'general' | 'machines' | 'users' | 'parts' | 'metrics'
type DatePreset = 'today' | 'week' | 'month' | 'custom'

interface FilterState {
  dateRange: DateRange | undefined
  datePreset: DatePreset
  machineId: string
  userId: string
  partId: string
  resolved: string
  priority: string
}

function generatePDF(
  title: string,
  subtitle: string,
  data: Record<string, string>[],
  columns: { key: string; label: string; align?: string }[],
  summary?: { label: string; value: string; color?: string }[]
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups para gerar o PDF')
    return
  }

  const currentDate = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })

  const getAlignment = (align?: string) => {
    switch (align) {
      case 'right': return 'text-align: right;'
      case 'center': return 'text-align: center;'
      default: return 'text-align: left;'
    }
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title} - TMS ONE</title>
      <style>
        @page { size: A4 landscape; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #1e293b; background: #fff; }
        .page-container { width: 100%; padding: 28px 36px; }
        .header { width: 100%; padding-bottom: 10px; border-bottom: 3px solid #1e293b; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header-left h1 { font-size: 16pt; font-weight: bold; color: #0f172a; margin-bottom: 3px; }
        .header-left p { font-size: 8pt; color: #64748b; }
        .header-right { text-align: right; }
        .header-right .brand { font-size: 14pt; font-weight: bold; color: #0f172a; }
        .header-right .info { font-size: 8pt; color: #64748b; margin-top: 2px; }
        .subtitle { font-size: 8pt; color: #334155; margin-bottom: 14px; padding: 8px 12px; background: #f1f5f9; border-left: 4px solid #1e293b; }
        .summary { display: flex; gap: 10px; margin-bottom: 16px; }
        .summary-item { flex: 1; padding: 10px 8px; text-align: center; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 5px; }
        .summary-item .label { font-size: 7pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; display: block; margin-bottom: 4px; }
        .summary-item .value { font-size: 14pt; font-weight: bold; color: #0f172a; display: block; }
        .summary-item .value-days { font-size: 16pt; font-weight: bold; line-height: 1.1; display: block; }
        .summary-item .value-hhmm { font-size: 9pt; font-weight: 600; font-family: monospace; display: block; line-height: 1.2; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 8pt; table-layout: auto; }
        th { background: #1e293b; color: #fff; padding: 8px 6px; font-weight: 600; text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
        td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; word-wrap: break-word; word-break: break-word; }
        tr:nth-child(even) { background: #f8fafc; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 7.5pt; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef9c3; color: #854d0e; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #1e293b; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
        .empty-message { padding: 40px; text-align: center; color: #94a3b8; font-size: 11pt; font-style: italic; background: #f8fafc; border: 1px dashed #cbd5e1; }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page-container { padding: 28px 36px; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="header">
          <div class="header-left">
            <h1>${title}</h1>
            <p>Relatório gerado automaticamente pelo sistema</p>
          </div>
          <div class="header-right">
            <div class="brand">TMS ONE</div>
            <div class="info">Tool Manager System</div>
            <div class="info">${currentDate}</div>
          </div>
        </div>

        <div class="subtitle">${subtitle}</div>

        ${summary ? `
          <div class="summary">
            ${summary.map(s => {
              const hasDays = s.value.includes('d ')
              const parts = hasDays ? s.value.split(' ') : [null, null]
              const dayPart = parts[0]
              const timePart = parts[1]
              return `
              <div class="summary-item">
                <span class="label">${s.label}</span>
                ${hasDays ? `
                  <span class="value-days" style="color:${s.color || '#0f172a'}">${dayPart}</span>
                  <span class="value-hhmm" style="color:${s.color || '#0f172a'}">${timePart}</span>
                ` : `
                  <span class="value" style="color:${s.color || '#0f172a'}">${s.value}</span>
                `}
              </div>`
            }).join('')}
          </div>
        ` : ''}

        ${data.length > 0 ? `
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th style="${getAlignment(col.align)}">${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${columns.map(col => `<td style="${getAlignment(col.align)}">${row[col.key] ?? '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-message">Nenhum dado encontrado para os filtros selecionados.</div>'}

        <div class="footer">
          <div>TMS ONE - Tool Manager System | Todos os direitos reservados</div>
          <div style="font-style:italic;">Sistema desenvolvido em conformidade com as normas TISAX</div>
          <div>Pagina 1</div>
        </div>
      </div>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

function generateMachineDetailPDF(
  machineData: Array<{
    machineName: string
    sector: string
    stoppedTime: number
    operatingTime: number
    totalCost: number
    tickets: Array<{
      date: string
      problem: string
      priority: string
      resolved: boolean
      stoppedTime: number
      downtime: number
      cost: number
      operator: string
      notes: string
      parts: string
    }>
  }>
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups para gerar o PDF')
    return
  }

  const currentDate = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Máquina - TMS ONE</title>
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #1e293b; background: #fff; }
        .page-container { padding: 36px 44px; }
        .header { padding-bottom: 12px; border-bottom: 3px solid #1e293b; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header h1 { font-size: 20pt; color: #0f172a; margin-bottom: 4px; }
        .header p { font-size: 10pt; color: #64748b; }
        .header-right { text-align: right; }
        .header-right .brand { font-size: 15pt; font-weight: bold; color: #0f172a; }
        .header-right .info { font-size: 9pt; color: #64748b; margin-top: 2px; }
        .machine-section { margin-bottom: 32px; page-break-inside: avoid; }
        .machine-header { background: #1e293b; color: white; padding: 12px 16px; margin-bottom: 12px; border-radius: 4px 4px 0 0; }
        .machine-header h3 { font-size: 13pt; margin-bottom: 3px; }
        .machine-header p { font-size: 10pt; opacity: 0.85; }
        .machine-stats { display: flex; gap: 12px; margin-bottom: 16px; }
        .machine-stats > div { flex: 1; text-align: center; padding: 12px 8px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 5px; }
        .machine-stats .label { font-size: 8pt; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 5px; }
        .machine-stats .value { font-size: 14pt; font-weight: bold; color: #0f172a; display: block; }
        .machine-stats .value-days { font-size: 15pt; font-weight: bold; line-height: 1.1; display: block; }
        .machine-stats .value-hhmm { font-size: 9pt; font-weight: 600; font-family: monospace; display: block; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; table-layout: fixed; }
        th { background: #1e293b; color: #fff; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.4px; }
        td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-wrap: break-word; word-break: break-word; }
        tr:nth-child(even) { background: #f8fafc; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 9pt; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef9c3; color: #854d0e; }
        .footer { margin-top: 28px; padding-top: 14px; border-top: 2px solid #1e293b; font-size: 9pt; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
        .empty-msg { padding: 36px; text-align: center; color: #94a3b8; font-style: italic; background: #f8fafc; border: 1px dashed #cbd5e1; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page-container { padding: 36px 44px; }
          .machine-section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="header">
          <div>
            <h1>Relatório Detalhado por Máquina</h1>
            <p>Histórico completo de manutenções</p>
          </div>
          <div class="header-right">
            <div class="brand">TMS ONE</div>
            <div class="info">Tool Manager System</div>
            <div class="info">${currentDate}</div>
          </div>
        </div>

        ${machineData.map(machine => {
          const st = formatDurationLong(machine.stoppedTime)
          const op = formatDurationLong(machine.operatingTime)
          return `
          <div class="machine-section">
            <div class="machine-header">
              <h3>${machine.machineName}</h3>
              <p>${machine.sector}</p>
            </div>
            <div class="machine-stats">
              <div>
                <span class="label">Total Chamados</span>
                <span class="value">${machine.tickets.length}</span>
              </div>
              <div style="border-color:#fca5a5;">
                <span class="label" style="color:#dc2626;">Máquina Parada</span>
                ${st.days > 0
                  ? `<span class="value-days" style="color:#dc2626;">${st.days}d</span><span class="value-hhmm" style="color:#ef4444;">${st.hhmm}</span>`
                  : `<span class="value" style="color:#dc2626;">${st.hhmm}</span>`
                }
                <span style="font-size:8pt;color:#94a3b8;display:block;margin-top:2px;">abertura → resolução</span>
              </div>
              <div style="border-color:#fdba74;">
                <span class="label" style="color:#ea580c;">Tempo Operando</span>
                ${op.days > 0
                  ? `<span class="value-days" style="color:#ea580c;">${op.days}d</span><span class="value-hhmm" style="color:#f97316;">${op.hhmm}</span>`
                  : `<span class="value" style="color:#ea580c;">${op.hhmm}</span>`
                }
                <span style="font-size:8pt;color:#94a3b8;display:block;margin-top:2px;">manutentor trabalhando</span>
              </div>
            </div>
            ${machine.tickets.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th style="width:12%">Data</th>
                    <th style="width:25%">Problema</th>
                    <th style="width:12%">Status</th>
                    <th style="width:15%;color:#fca5a5;">Maq. Parada</th>
                    <th style="width:18%">Operador</th>
                    <th style="width:18%">Peças</th>
                  </tr>
                </thead>
                <tbody>
                  ${machine.tickets.map(t => {
                    const ts = formatDurationLong(t.stoppedTime)
                    return `
                    <tr>
                      <td>${t.date}</td>
                      <td>${t.problem}</td>
                      <td><span class="badge ${t.resolved ? 'badge-success' : 'badge-warning'}">${t.resolved ? 'Resolvido' : 'Pendente'}</span></td>
                      <td style="color:#dc2626;font-weight:600;">${ts.full}</td>
                      <td>${t.operator}</td>
                      <td>${t.parts || '-'}</td>
                    </tr>`
                  }).join('')}
                </tbody>
              </table>
            ` : '<div class="empty-msg">Nenhuma manutenção registrada</div>'}
          </div>`
        }).join('')}

        <div class="footer">
          <div>TMS ONE - Tool Manager System | Todos os direitos reservados</div>
          <div style="font-style:italic;">Sistema desenvolvido em conformidade com as normas TISAX</div>
          <div>Pagina 1</div>
        </div>
      </div>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

export function ReportsView() {
  const { tickets, machines, parts, auditLogs, reloadAuditLogs, getMachineById, getProblemById, getPartById } = useData()
  const { users } = useAuth()

  // Carregar audit logs apenas quando a tela de relatórios é aberta
  useEffect(() => {
    reloadAuditLogs()
  }, [])

  const [activeTab, setActiveTab] = useState<ReportType>('general')
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: subDays(new Date(), 30), to: new Date() },
    datePreset: 'month',
    machineId: 'all',
    userId: 'all',
    partId: 'all',
    resolved: 'all',
    priority: 'all',
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  
  // Estados para MTBF/MTTR
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [shiftsError, setShiftsError] = useState<string | null>(null)
  const [metricsPeriod, setMetricsPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [metricsSearchMachine, setMetricsSearchMachine] = useState('')
  const [localMachineShifts, setLocalMachineShifts] = useState<Record<string, string | null>>({})
  
  // Inicializar shifts locais das máquinas
  useEffect(() => {
    const initial: Record<string, string | null> = {}
    machines.forEach(m => {
      initial[m.id] = m.shiftId || null
    })
    setLocalMachineShifts(initial)
  }, [machines])
  
  // Carregar shifts quando aba MTBF/MTTR é acessada
  useEffect(() => {
    if (activeTab === 'metrics') {
      setLoadingShifts(true)
      setShiftsError(null)
      fetchShifts()
        .then(data => setShifts(data))
        .catch(err => setShiftsError(err.message))
        .finally(() => setLoadingShifts(false))
    }
  }, [activeTab])

  const handleDatePreset = (preset: DatePreset) => {
    const today = new Date()
    let from: Date
    let to: Date = today
    switch (preset) {
      case 'today': from = startOfDay(today); to = endOfDay(today); break
      case 'week': from = subDays(today, 7); break
      case 'month': from = startOfMonth(today); to = endOfMonth(today); break
      default: return
    }
    setFilters(prev => ({ ...prev, datePreset: preset, dateRange: { from, to } }))
  }

  const clearFilters = () => {
    setFilters({
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
      datePreset: 'month',
      machineId: 'all',
      userId: 'all',
      partId: 'all',
      resolved: 'all',
      priority: 'all',
    })
  }

  const hasActiveFilters =
    filters.machineId !== 'all' ||
    filters.userId !== 'all' ||
    filters.partId !== 'all' ||
    filters.resolved !== 'all' ||
    filters.priority !== 'all'

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Se filtro é "rejected", mostrar apenas os cancelled
      if (filters.resolved === 'rejected') {
        if (t.status !== 'cancelled') return false
      } else if (filters.resolved === 'paused') {
        // Se filtro é "paused", mostrar apenas os pausados
        if (t.status !== 'paused') return false
      } else {
        // Para outros filtros, excluir open e cancelled
        if (t.status === 'open' || t.status === 'cancelled') return false
      }
      
      const refDate = t.status === 'cancelled' && t.cancelledAt
        ? new Date(t.cancelledAt)
        : t.completedAt
          ? new Date(t.completedAt)
          : t.actions.length > 0
            ? new Date(t.actions[t.actions.length - 1].timestamp)
            : new Date(t.createdAt)
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const checkDate = t.status === 'completed' || t.status === 'unresolved' || t.status === 'cancelled' ? refDate : new Date(t.createdAt)
        if (!isWithinInterval(checkDate, { start: startOfDay(filters.dateRange.from), end: endOfDay(filters.dateRange.to) })) return false
      }
      if (filters.machineId !== 'all' && t.machineId !== filters.machineId) return false
      if (filters.userId !== 'all') {
        const targetUser = users.find(u => u.id === filters.userId)
        if (!targetUser) return false
        const operatorWorked = t.createdBy === filters.userId || t.actions.some(a => a.operatorName === targetUser.name)
        if (!operatorWorked) return false
      }
      if (filters.partId !== 'all') {
        if (!t.usedParts.some(up => up.partId === filters.partId)) return false
      }
      if (filters.resolved !== 'all' && filters.resolved !== 'rejected' && filters.resolved !== 'paused') {
        if (filters.resolved === 'yes' && !t.resolved) return false
        if (filters.resolved === 'no' && t.resolved !== false) return false
      }
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false
      return true
    })
  }, [tickets, filters, users])

  const stats = useMemo(() => {
    const totalStoppedTime = filteredTickets.reduce((sum, t) => {
      const start = new Date(t.createdAt).getTime()
      const end = t.completedAt ? new Date(t.completedAt).getTime() : Date.now()
      return sum + Math.floor((end - start) / 1000)
    }, 0)
    const totalOperatingTime = filteredTickets.reduce((sum, t) => sum + t.downtime, 0)
    const totalCost = filteredTickets.reduce((sum, t) => sum + t.totalCost, 0)
    const resolved = filteredTickets.filter(t => t.resolved).length
    const notResolved = filteredTickets.filter(t => !t.resolved).length
    const uniqueMachines = new Set(filteredTickets.map(t => t.machineId)).size
    return { total: filteredTickets.length, totalStoppedTime, totalOperatingTime, totalCost, resolved, notResolved, uniqueMachines }
  }, [filteredTickets])

  const machineData = useMemo(() => {
    const data = new Map<string, { stoppedTime: number; operatingTime: number; totalCost: number; ticketCount: number; tickets: typeof filteredTickets }>()
    filteredTickets.forEach(ticket => {
      const start = new Date(ticket.createdAt).getTime()
      const end = ticket.completedAt ? new Date(ticket.completedAt).getTime() : Date.now()
      const stoppedTime = Math.floor((end - start) / 1000)
      const current = data.get(ticket.machineId) || { stoppedTime: 0, operatingTime: 0, totalCost: 0, ticketCount: 0, tickets: [] }
      data.set(ticket.machineId, {
        stoppedTime: current.stoppedTime + stoppedTime,
        operatingTime: current.operatingTime + ticket.downtime,
        totalCost: current.totalCost + ticket.totalCost,
        ticketCount: current.ticketCount + 1,
        tickets: [...current.tickets, ticket],
      })
    })
    return Array.from(data.entries())
      .map(([machineId, d]) => {
        const machine = getMachineById(machineId)
        return { machineId, machineName: machine?.name || 'Desconhecida', sector: machine?.sector || '', ...d }
      })
      .sort((a, b) => b.stoppedTime - a.stoppedTime)
  }, [filteredTickets, getMachineById])

  const userData = useMemo(() => {
    const data = new Map<string, { ticketCount: number; operatingTime: number; totalCost: number; resolvedCount: number }>()
    filteredTickets.forEach(ticket => {
      const operatorTimes = new Map<string, number>()
      if (ticket.timeSegments && ticket.timeSegments.length > 0) {
        ticket.timeSegments.forEach(seg => {
          const segDuration = seg.duration || (seg.endTime
            ? Math.floor((new Date(seg.endTime).getTime() - new Date(seg.startTime).getTime()) / 1000)
            : ticket.status === 'in-progress' ? Math.floor((Date.now() - new Date(seg.startTime).getTime()) / 1000) : 0)
          operatorTimes.set(seg.operatorName, (operatorTimes.get(seg.operatorName) || 0) + segDuration)
        })
      } else {
        const lastAction = ticket.actions[ticket.actions.length - 1]
        if (lastAction) operatorTimes.set(lastAction.operatorName, ticket.downtime)
      }
      operatorTimes.forEach((operatingTime, operatorName) => {
        const current = data.get(operatorName) || { ticketCount: 0, operatingTime: 0, totalCost: 0, resolvedCount: 0 }
        const lastAction = ticket.actions[ticket.actions.length - 1]
        const isCompleter = lastAction?.operatorName === operatorName
        data.set(operatorName, {
          ticketCount: current.ticketCount + 1,
          operatingTime: current.operatingTime + operatingTime,
          totalCost: current.totalCost + (isCompleter ? ticket.totalCost : 0),
          resolvedCount: current.resolvedCount + (isCompleter && ticket.resolved ? 1 : 0),
        })
      })
    })
    return Array.from(data.entries()).map(([userName, d]) => ({ userName, ...d })).sort((a, b) => b.operatingTime - a.operatingTime)
  }, [filteredTickets])

  const partsData = useMemo(() => {
    const data = new Map<string, { quantity: number; totalValue: number }>()
    filteredTickets.forEach(ticket => {
      ticket.usedParts.forEach(up => {
        const part = getPartById(up.partId)
        if (!part) return
        const current = data.get(up.partId) || { quantity: 0, totalValue: 0 }
        data.set(up.partId, { quantity: current.quantity + up.quantity, totalValue: current.totalValue + part.price * up.quantity })
      })
    })
    return Array.from(data.entries())
      .map(([partId, d]) => { const part = getPartById(partId); return { partId, partName: part?.name || 'Desconhecida', unitPrice: part?.price || 0, ...d } })
      .sort((a, b) => b.totalValue - a.totalValue)
  }, [filteredTickets, getPartById])

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const logDate = new Date(log.timestamp)
        if (!isWithinInterval(logDate, { start: startOfDay(filters.dateRange.from), end: endOfDay(filters.dateRange.to) })) return false
      }
      if (filters.userId !== 'all' && log.userId !== filters.userId) return false
      return true
    })
  }, [auditLogs, filters])

  const handleGeneratePDF = () => {
    const dateLabel = filters.dateRange?.from && filters.dateRange?.to
      ? `${format(filters.dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} ate ${format(filters.dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
      : 'Todos os periodos'

    switch (activeTab) {
      case 'general':
        generatePDF(
          'Relatório Geral de Manutenções',
          `Período: ${dateLabel}`,
          filteredTickets.map(t => {
            const machine = getMachineById(t.machineId)
            const problem = getProblemById(t.problemId)
            const lastAction = t.actions[t.actions.length - 1]
            const stoppedSecs = Math.floor(((t.completedAt ? new Date(t.completedAt).getTime() : Date.now()) - new Date(t.createdAt).getTime()) / 1000)
            return {
              data: format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
              maquina: machine?.name || '-',
              problema: t.customProblemName || problem?.name || '-',
              prioridade: PRIORITY_CONFIG[t.priority].label,
              status: t.resolved ? 'Resolvido' : 'Não Resolvido',
              maqParada: formatDurationLong(stoppedSecs).full,
              operador: lastAction?.operatorName || '-',
            }
          }),
          [
            { key: 'data', label: 'Data' },
            { key: 'maquina', label: 'Máquina' },
            { key: 'problema', label: 'Problema' },
            { key: 'prioridade', label: 'Prioridade', align: 'center' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'maqParada', label: 'Maq. Parada', align: 'right' },
            { key: 'operador', label: 'Operador' },
          ],
          [
            { label: 'Total de Manutenções', value: String(stats.total) },
            { label: 'Tempo Máquina Parada', value: formatDurationLong(stats.totalStoppedTime).full, color: '#dc2626' },
            { label: 'Resolvidos', value: `${stats.resolved} de ${stats.total}` },
          ]
        )
        break

      case 'machines':
        generateMachineDetailPDF(
          machineData.map(m => ({
            machineName: m.machineName,
            sector: m.sector,
            stoppedTime: m.stoppedTime,
            operatingTime: m.operatingTime,
            totalCost: m.totalCost,
            tickets: m.tickets.map(t => {
              const problem = getProblemById(t.problemId)
              const lastAction = t.actions[t.actions.length - 1]
              const partsUsed = t.usedParts.map(up => { const part = getPartById(up.partId); return `${part?.name} (x${up.quantity})` }).join(', ')
              const stoppedSecs = Math.floor(((t.completedAt ? new Date(t.completedAt).getTime() : Date.now()) - new Date(t.createdAt).getTime()) / 1000)
              return {
                date: format(t.completedAt ?? (t.actions.length > 0 ? new Date(t.actions[t.actions.length - 1].timestamp) : new Date(t.createdAt)), 'dd/MM/yyyy', { locale: ptBR }),
                problem: t.customProblemName || problem?.name || '-',
                priority: PRIORITY_CONFIG[t.priority].label,
                resolved: t.resolved ?? true,
                stoppedTime: stoppedSecs,
                downtime: t.downtime,
                cost: t.totalCost,
                operator: lastAction?.operatorName || '-',
                notes: t.completionNotes || '',
                parts: partsUsed,
              }
            }),
          }))
        )
        break

      case 'users':
        generatePDF(
          'Relatório por Manutentor',
          `Período: ${dateLabel}`,
          userData.map(u => ({
            nome: u.userName,
            chamados: String(u.ticketCount),
            resolvidos: `${u.resolvedCount} (${Math.round(u.resolvedCount / u.ticketCount * 100)}%)`,
            operando: formatDurationLong(u.operatingTime).full,
            media: formatDurationLong(Math.round(u.operatingTime / u.ticketCount)).full,
          })),
          [
            { key: 'nome', label: 'Manutentor' },
            { key: 'chamados', label: 'Chamados', align: 'center' },
            { key: 'resolvidos', label: 'Resolvidos', align: 'center' },
            { key: 'operando', label: 'Tempo Operando', align: 'right' },
            { key: 'media', label: 'Media/Chamado', align: 'right' },
          ],
          [
            { label: 'Total de Manutentores', value: String(userData.length) },
            { label: 'Total de Chamados', value: String(stats.total) },
            { label: 'Tempo Total Operando', value: formatDurationLong(stats.totalOperatingTime).full, color: '#ea580c' },
            { label: 'Tempo Total Maq. Parada', value: formatDurationLong(stats.totalStoppedTime).full, color: '#dc2626' },
          ]
        )
        break

      case 'parts':
        generatePDF(
          'Relatório de Peças Utilizadas',
          `Período: ${dateLabel}`,
          partsData.map(p => ({
            peca: p.partName,
            quantidade: String(p.quantity),
          })),
          [
            { key: 'peca', label: 'Peca' },
            { key: 'quantidade', label: 'Quantidade', align: 'center' },
          ],
          [
            { label: 'Total de Tipos de Peças', value: String(partsData.length) },
            { label: 'Total de Peças Usadas', value: String(partsData.reduce((s, p) => s + p.quantity, 0)) },
          ]
        )
        break

      case 'audit':
        generatePDF(
          'Log de Auditoria',
          `Período: ${dateLabel}`,
          filteredLogs.slice(0, 100).map(log => ({
            data: format(log.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
            usuario: log.userName,
            acao: log.action.replace(/_/g, ' ').toUpperCase(),
            entidade: log.entityName,
            detalhes: log.details.substring(0, 80) + (log.details.length > 80 ? '...' : ''),
          })),
          [
            { key: 'data', label: 'Data/Hora' },
            { key: 'usuario', label: 'Usuario' },
            { key: 'acao', label: 'Acao' },
            { key: 'entidade', label: 'Entidade' },
            { key: 'detalhes', label: 'Detalhes' },
          ],
          [{ label: 'Total de Registros', value: String(filteredLogs.length) }]
        )
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Relatórios e Performance</h1>
          <p className="text-muted-foreground mt-1">Análise completa de manutenções e auditoria</p>
        </div>
        <Button onClick={handleGeneratePDF}>
          <Printer className="w-4 h-4 mr-2" />
          Gerar PDF
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* Período */}
            <div>
              <Label className="text-xs">Período</Label>
              <div className="flex gap-1 mt-1 mb-1">
                <Button variant={filters.datePreset === 'today' ? 'default' : 'outline'} size="sm" onClick={() => handleDatePreset('today')} className="flex-1 text-xs">Hoje</Button>
                <Button variant={filters.datePreset === 'week' ? 'default' : 'outline'} size="sm" onClick={() => handleDatePreset('week')} className="flex-1 text-xs">7 dias</Button>
                <Button variant={filters.datePreset === 'month' ? 'default' : 'outline'} size="sm" onClick={() => handleDatePreset('month')} className="flex-1 text-xs">Mês</Button>
              </div>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {filters.dateRange?.from ? (
                      filters.dateRange.to
                        ? `${format(filters.dateRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(filters.dateRange.to, 'dd/MM/yy', { locale: ptBR })}`
                        : format(filters.dateRange.from, 'dd/MM/yy', { locale: ptBR })
                    ) : 'Selecionar datas'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={filters.dateRange}
                    onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range, datePreset: 'custom' }))}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Máquina */}
            <div className="space-y-1">
              <Label className="text-xs">Máquina</Label>
              <Select value={filters.machineId} onValueChange={(v) => setFilters(prev => ({ ...prev, machineId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Máquinas</SelectItem>
                  {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Manutentor */}
            <div className="space-y-1">
              <Label className="text-xs">Manutentor</Label>
              <Select value={filters.userId} onValueChange={(v) => setFilters(prev => ({ ...prev, userId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Manutentores</SelectItem>
                  {users.filter(u => u.role === 'manutentor').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filters.resolved} onValueChange={(v) => setFilters(prev => ({ ...prev, resolved: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="yes">Resolvidos</SelectItem>
                  <SelectItem value="no">Não Resolvidos</SelectItem>
                  <SelectItem value="paused">Pausados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Wrench className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Manutenções</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-red-600">Máquina Parada</p>
                {(() => {
                  const d = formatDurationLong(stats.totalStoppedTime)
                  return d.days > 0 ? (
                    <>
                      <p className="text-xl font-bold text-red-600 leading-tight">{d.days}d</p>
                      <p className="text-sm font-mono text-red-500">{d.hhmm}</p>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-red-600 font-mono">{d.hhmm}</p>
                  )
                })()}
                <p className="text-[10px] text-muted-foreground">abertura → resolução</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-orange-600">Tempo Operando</p>
                {(() => {
                  const d = formatDurationLong(stats.totalOperatingTime)
                  return d.days > 0 ? (
                    <>
                      <p className="text-xl font-bold text-orange-600 leading-tight">{d.days}d</p>
                      <p className="text-sm font-mono text-orange-500">{d.hhmm}</p>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-orange-600 font-mono">{d.hhmm}</p>
                  )
                })()}
                <p className="text-[10px] text-muted-foreground">manutentor trabalhando</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Máquinas Afetadas</p>
                <p className="text-xl font-bold">{stats.uniqueMachines}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
<TabsList className="grid w-full h-auto gap-1 p-1" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
  <TabsTrigger value="general" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span>Geral</span>
  </TabsTrigger>
  <TabsTrigger value="machines" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span className="hidden sm:inline">Máquinas</span>
  <span className="sm:hidden">Maq.</span>
  </TabsTrigger>
  <TabsTrigger value="users" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <User className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span className="hidden sm:inline">Usuários</span>
  <span className="sm:hidden">Usu.</span>
  </TabsTrigger>
  <TabsTrigger value="parts" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span className="hidden sm:inline">Peças</span>
  <span className="sm:hidden">Pec.</span>
  </TabsTrigger>
  <TabsTrigger value="metrics" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span className="hidden sm:inline">MTBF/MTTR</span>
  <span className="sm:hidden">MTBF</span>
  </TabsTrigger>
  </TabsList>

        {/* Tab Geral */}
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{filters.resolved === 'rejected' ? 'Chamados Rejeitados' : 'Lista de Manutenções'}</CardTitle>
              <CardDescription>{filteredTickets.length} {filters.resolved === 'rejected' ? 'chamados rejeitados' : 'manutenções encontradas'}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[600px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Data</th>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Máquina</th>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden sm:table-cell">Problema</th>
                      <th className="p-2 sm:p-3 text-center font-medium text-[10px] sm:text-xs">Status</th>
                      {filters.resolved === 'rejected' ? (
                        <>
                          <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs text-red-600">Motivo da Rejeição</th>
                          <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden md:table-cell">Rejeitado por</th>
                          <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden md:table-cell">Reportado por</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 sm:p-3 text-right font-medium text-[10px] sm:text-xs text-red-600">Maq. Parada</th>
                          <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden md:table-cell">Operador</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTickets.slice(0, 50).map((ticket) => {
                      const machine = getMachineById(ticket.machineId)
                      const problem = getProblemById(ticket.problemId)
                      const lastAction = ticket.actions[ticket.actions.length - 1]
                      const stoppedSecs = Math.floor(((ticket.completedAt ? new Date(ticket.completedAt).getTime() : Date.now()) - new Date(ticket.createdAt).getTime()) / 1000)
                      
                      if (filters.resolved === 'rejected') {
                        return (
                          <tr key={ticket.id} className="hover:bg-muted/50">
                            <td className="p-2 sm:p-3 whitespace-nowrap text-[10px] sm:text-xs">
                              {ticket.cancelledAt 
                                ? format(new Date(ticket.cancelledAt), 'dd/MM/yy HH:mm', { locale: ptBR })
                                : format(new Date(ticket.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs max-w-[100px] truncate">{machine?.name || '-'}</td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden sm:table-cell max-w-[120px] truncate">{ticket.customProblemName || problem?.name || '-'}</td>
                            <td className="p-2 sm:p-3 text-center">
                              <Badge variant="outline" className="text-[9px] sm:text-xs px-1 sm:px-2 bg-gray-100 text-gray-700 border-gray-300">
                                Rejeitado
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs text-red-600 max-w-[200px]">
                              <p className="line-clamp-2">{ticket.cancellationReason || '-'}</p>
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden md:table-cell max-w-[80px] truncate">
                              {ticket.cancelledByName || '-'}
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden md:table-cell max-w-[80px] truncate">
                              {ticket.createdByName || '-'}
                            </td>
                          </tr>
                        )
                      }
                      
                      const lastPauseAction = ticket.status === 'paused' 
                        ? [...ticket.actions].reverse().find(a => a.type === 'pause')
                        : null
                      
                      return (
                        <tr key={ticket.id} className="hover:bg-muted/50">
                          <td className="p-2 sm:p-3 whitespace-nowrap text-[10px] sm:text-xs">
                            {format(new Date(ticket.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </td>
                          <td className="p-2 sm:p-3 text-[10px] sm:text-xs max-w-[100px] truncate">{machine?.name || '-'}</td>
                          <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden sm:table-cell max-w-[120px] truncate">{ticket.customProblemName || problem?.name || '-'}</td>
                          <td className="p-2 sm:p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className={cn(
                                "text-[9px] sm:text-xs px-1 sm:px-2",
                                ticket.resolved ? "bg-green-50 text-green-600 border-green-200"
                                  : ticket.status === 'in-progress' || ticket.status === 'paused' ? "bg-orange-50 text-orange-600 border-orange-200"
                                  : "bg-red-50 text-red-600 border-red-200"
                              )}>
                                {ticket.resolved ? 'Resolvido' : ticket.status === 'in-progress' ? 'Em andamento' : ticket.status === 'paused' ? 'Pausado' : 'Pendente'}
                              </Badge>
                              {lastPauseAction?.reason && (
                                <span className="text-[9px] text-yellow-700 dark:text-yellow-300 max-w-[120px] truncate" title={lastPauseAction.reason}>
                                  Motivo: {lastPauseAction.reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-right font-mono text-[10px] sm:text-xs text-red-600 font-semibold">
                            {formatDurationLong(stoppedSecs).full}
                          </td>
                          <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden md:table-cell max-w-[100px] truncate">
                            {lastAction?.operatorName || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredTickets.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {filters.resolved === 'rejected' 
                      ? 'Nenhum chamado rejeitado encontrado para os filtros selecionados.'
                      : filters.resolved === 'paused'
                        ? 'Nenhum chamado pausado encontrado para os filtros selecionados.'
                        : 'Nenhuma manutenção encontrada para os filtros selecionados.'}
                  </div>
                )}
                {filteredTickets.length > 50 && (
                  <div className="p-4 text-center text-muted-foreground text-sm border-t">
                    Mostrando 50 de {filteredTickets.length} registros. Gere o PDF para ver todos.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Máquinas */}
        <TabsContent value="machines" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking por Máquina</CardTitle>
              <CardDescription>Ordenado por tempo de máquina parada (maior para menor)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {machineData.map((m, index) => (
                  <div key={m.machineId} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5",
                        index < 3 ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.machineName}</p>
                        <p className="text-xs text-muted-foreground">{m.sector} &bull; {m.ticketCount} chamados</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Máquina Parada</p>
                        {(() => {
                          const d = formatDurationLong(m.stoppedTime)
                          return d.days > 0 ? (
                            <><p className="font-bold text-red-600 font-mono leading-tight">{d.days}d</p><p className="text-xs text-red-500 font-mono">{d.hhmm}</p></>
                          ) : (
                            <p className="font-bold text-red-600 font-mono">{d.hhmm}</p>
                          )
                        })()}
                        <p className="text-[10px] text-muted-foreground">abertura → resolução</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Operando</p>
                        {(() => {
                          const d = formatDurationLong(m.operatingTime)
                          return d.days > 0 ? (
                            <><p className="font-medium text-orange-600 font-mono leading-tight">{d.days}d</p><p className="text-xs text-orange-500 font-mono">{d.hhmm}</p></>
                          ) : (
                            <p className="font-medium text-orange-600 font-mono">{d.hhmm}</p>
                          )
                        })()}
                        <p className="text-[10px] text-muted-foreground">trabalhando</p>
                      </div>
                    </div>
                  </div>
                ))}
                {machineData.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Usuários */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Manutentor</CardTitle>
              <CardDescription>Tempo operando = segmentos reais de trabalho por manutentor</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {userData.map((u) => (
                  <div key={u.userName} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{u.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.resolvedCount} de {u.ticketCount} resolvidos ({Math.round(u.resolvedCount / u.ticketCount * 100)}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{u.ticketCount}</p>
                        <p className="text-xs text-muted-foreground">chamados</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Tempo Operando</p>
                        {(() => {
                          const d = formatDurationLong(u.operatingTime)
                          return d.days > 0 ? (
                            <><p className="font-medium text-orange-600 font-mono leading-tight">{d.days}d</p><p className="text-xs text-orange-500 font-mono">{d.hhmm}</p></>
                          ) : (
                            <p className="font-medium text-orange-600 font-mono">{d.hhmm}</p>
                          )
                        })()}
                        <p className="text-[10px] text-muted-foreground">trabalhando</p>
                      </div>
                    </div>
                  </div>
                ))}
                {userData.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Peças */}
        <TabsContent value="parts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Peças Utilizadas</CardTitle>
              <CardDescription>Ordenado por quantidade utilizada (maior para menor)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium">Peça</th>
                      <th className="p-3 text-center font-medium">Quantidade Usada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {partsData.map((p) => (
                      <tr key={p.partId} className="hover:bg-muted/50">
                        <td className="p-3 font-medium">{p.partName}</td>
                        <td className="p-3 text-center font-mono font-bold">{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  {partsData.length > 0 && (
                    <tfoot className="bg-muted/50">
                      <tr>
                        <td className="p-3 text-right font-medium">Total de Peças:</td>
                        <td className="p-3 text-center font-mono font-bold">{partsData.reduce((s, p) => s + p.quantity, 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {partsData.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">Nenhuma peça utilizada no período selecionado.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab MTBF/MTTR */}
        <TabsContent value="metrics" className="mt-4 space-y-4">
          {/* Explicação dos indicadores */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Indicadores de Manutenção
              </CardTitle>
              <CardDescription>
                Métricas de confiabilidade e eficiência baseadas nos turnos de operação das máquinas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="font-semibold text-blue-700 dark:text-blue-300">MTBF - Tempo Médio Entre Falhas</p>
                  <p className="text-blue-600 dark:text-blue-400 mt-1">
                    Indica quanto tempo, em média, uma máquina opera até apresentar uma falha.
                    Quanto maior, melhor a confiabilidade.
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 font-mono">
                    MTBF = (Horas de Operação - Horas Paradas) / Número de Falhas
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                  <p className="font-semibold text-orange-700 dark:text-orange-300">MTTR - Tempo Médio de Reparo</p>
                  <p className="text-orange-600 dark:text-orange-400 mt-1">
                    Indica quanto tempo, em média, leva para reparar uma máquina após uma falha.
                    Quanto menor, mais eficiente a manutenção.
                  </p>
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-2 font-mono">
                    MTTR = Tempo Total de Reparo / Número de Falhas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuração de Turnos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Turnos de Operação</CardTitle>
              <CardDescription>
                Configure o regime de trabalho de cada máquina para cálculos precisos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingShifts ? (
                <div className="p-4 text-center text-muted-foreground">Carregando turnos...</div>
              ) : shiftsError ? (
                <div className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    A tabela de turnos ainda não foi criada no banco de dados.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Execute o script SQL no Supabase Dashboard para habilitar esta funcionalidade.
                  </p>
                </div>
              ) : shifts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhum turno cadastrado. Configure os turnos no banco de dados.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {shifts.map(shift => (
                      <div key={shift.id} className="p-2 rounded border bg-muted/30 text-center">
                        <p className="font-medium text-sm">{shift.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {shift.hoursPerDay}h/dia - {shift.daysPerWeek} dias/sem
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Vincular máquinas aos turnos */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Vincular Máquinas aos Turnos</p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {machines.map(machine => (
                        <div key={machine.id} className="flex items-center justify-between p-2 rounded border bg-card hover:bg-muted/30">
                          <span className="text-sm font-medium">{machine.name}</span>
                          <Select
                            value={localMachineShifts[machine.id] || 'none'}
                            onValueChange={async (value) => {
                              const newShiftId = value === 'none' ? null : value
                              const oldShiftId = localMachineShifts[machine.id]
                              // Atualizar estado local imediatamente
                              setLocalMachineShifts(prev => ({ ...prev, [machine.id]: newShiftId }))
                              try {
                                await updateMachineShift(machine.id, newShiftId)
                              } catch (err) {
                                // Reverter em caso de erro
                                setLocalMachineShifts(prev => ({ ...prev, [machine.id]: oldShiftId }))
                                console.error('[v0] Erro ao atualizar turno:', err)
                                alert('Erro ao atualizar turno. Verifique se a coluna shift_id existe na tabela machines do banco de dados.')
                              }
                            }}
                          >
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                              <SelectValue placeholder="Selecionar turno" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem turno definido</SelectItem>
                              {shifts.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Métricas por Máquina */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Métricas por Máquina</CardTitle>
                  <CardDescription className="mt-1">
                    Análise de MTBF, MTTR e Disponibilidade
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Filtro de período */}
                  <Select value={metricsPeriod} onValueChange={(v) => setMetricsPeriod(v as 'week' | 'month' | 'year')}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Última Semana</SelectItem>
                      <SelectItem value="month">Último Mês</SelectItem>
                      <SelectItem value="year">Último Ano</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Busca por máquina */}
                  <input
                    type="text"
                    placeholder="Buscar máquina..."
                    className="h-8 px-2 text-xs border rounded-md w-[150px] bg-background"
                    value={metricsSearchMachine}
                    onChange={(e) => setMetricsSearchMachine(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium">Máquina</th>
                      <th className="p-3 text-center font-medium">Turno</th>
                      <th className="p-3 text-center font-medium">Falhas</th>
                      <th className="p-3 text-center font-medium text-blue-600">MTBF (h)</th>
                      <th className="p-3 text-center font-medium text-orange-600">MTTR (h)</th>
                      <th className="p-3 text-center font-medium text-green-600">Disponib.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      // Definir período baseado no filtro
                      const now = new Date()
                      let periodStart: Date
                      let periodDays: number
                      
                      switch (metricsPeriod) {
                        case 'week':
                          periodStart = subDays(now, 7)
                          periodDays = 7
                          break
                        case 'year':
                          periodStart = subDays(now, 365)
                          periodDays = 365
                          break
                        case 'month':
                        default:
                          periodStart = subDays(now, 30)
                          periodDays = 30
                      }
                      
                      // Filtrar máquinas pela busca
                      const filteredMachines = machines.filter(m => 
                        metricsSearchMachine === '' || 
                        m.name.toLowerCase().includes(metricsSearchMachine.toLowerCase())
                      )
                      
                      // Calcular métricas para cada máquina
                      const metricsData: MachineMetrics[] = filteredMachines.map(machine => {
                        // Usar shift local atualizado ou o original da máquina
                        const shiftId = localMachineShifts[machine.id] || machine.shiftId
                        const shift = shifts.find(s => s.id === shiftId)
                        
                        // Filtrar tickets da máquina no período selecionado
                        const machineTickets = tickets.filter(t => 
                          t.machineId === machine.id && 
                          (t.status === 'completed' || t.status === 'unresolved') &&
                          new Date(t.createdAt) >= periodStart &&
                          new Date(t.createdAt) <= now
                        )
                        
                        const totalFailures = machineTickets.length
                        const totalRepairTime = machineTickets.reduce((sum, t) => sum + t.downtime, 0)
                        
                        // Horas esperadas baseado no turno (ou 8h/dia, 5 dias como padrão)
                        const hoursPerDay = shift?.hoursPerDay || 8
                        const daysPerWeek = shift?.daysPerWeek || 5
                        const weeksInPeriod = periodDays / 7
                        const expectedHours = hoursPerDay * daysPerWeek * weeksInPeriod
                        
                        // Tempo parado em horas
                        const totalDowntimeHours = totalRepairTime / 3600
                        
                        // MTBF = (Tempo Operação - Tempo Parado) / Falhas
                        // Se não houver falhas, MTBF é infinito (mostramos como "-")
                        const operatingHours = Math.max(0, expectedHours - totalDowntimeHours)
                        const mtbf = totalFailures > 0 ? operatingHours / totalFailures : 0
                        
                        // MTTR = Tempo Total Reparo / Falhas
                        const mttr = totalFailures > 0 ? totalDowntimeHours / totalFailures : 0
                        
                        // Disponibilidade = (MTBF / (MTBF + MTTR)) * 100
                        const availability = mtbf > 0 ? (mtbf / (mtbf + mttr)) * 100 : (totalFailures === 0 ? 100 : 0)
                        
                        return {
                          machineId: machine.id,
                          machineName: machine.name,
                          shiftName: shift?.name || 'Não definido',
                          periodDays,
                          expectedHours,
                          totalFailures,
                          totalRepairTime,
                          totalDowntime: totalRepairTime,
                          mtbf,
                          mttr,
                          availability,
                        }
                      })
                      
                      // Ordenar por número de falhas (mais problemáticas primeiro)
                      metricsData.sort((a, b) => b.totalFailures - a.totalFailures)
                      
                      if (metricsData.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                              Nenhuma máquina encontrada com o filtro atual.
                            </td>
                          </tr>
                        )
                      }
                      
                      return metricsData.map(m => (
                        <tr key={m.machineId} className="hover:bg-muted/50">
                          <td className="p-3 font-medium">{m.machineName}</td>
                          <td className="p-3 text-center text-xs text-muted-foreground">{m.shiftName}</td>
                          <td className="p-3 text-center font-mono">{m.totalFailures}</td>
                          <td className="p-3 text-center font-mono text-blue-600 font-semibold">
                            {m.totalFailures > 0 ? m.mtbf.toFixed(1) : '-'}
                          </td>
                          <td className="p-3 text-center font-mono text-orange-600 font-semibold">
                            {m.totalFailures > 0 ? m.mttr.toFixed(2) : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "font-mono",
                                m.availability >= 95 ? "bg-green-50 text-green-700 border-green-300" :
                                m.availability >= 85 ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                                "bg-red-50 text-red-700 border-red-300"
                              )}
                            >
                              {m.availability.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
                {machines.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma máquina cadastrada.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legenda e informações */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span>Disponibilidade maior ou igual a 95%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span>Disponibilidade entre 85% e 95%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span>Disponibilidade menor que 85%</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-3">
                <p className="font-medium mb-1">Período selecionado: {metricsPeriod === 'week' ? 'Última Semana (7 dias)' : metricsPeriod === 'month' ? 'Último Mês (30 dias)' : 'Último Ano (365 dias)'}</p>
                <p>Os cálculos consideram apenas chamados finalizados (resolvidos ou não resolvidos) dentro do período.</p>
                <p>Máquinas sem turno definido usam valores padrão: 8h/dia, 5 dias/semana.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
