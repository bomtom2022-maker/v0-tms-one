'use client'
// reports-view v3 - cache bust

import { useState, useMemo, useRef } from 'react'
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
import { formatDuration, formatDurationLong, formatCurrency, PRIORITY_CONFIG, type AuditLog } from '@/lib/types'
import { 
  FileText, 
  Clock, 
  DollarSign, 
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
} from 'lucide-react'
import { format, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

type ReportType = 'general' | 'machines' | 'users' | 'parts' | 'audit'
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

// Funcao para gerar PDF profissional
function generatePDF(
  title: string,
  subtitle: string,
  data: Record<string, string>[],
  columns: { key: string; label: string; align?: string }[],
  summary?: { label: string; value: string; color?: string }[]
) {
  // Criar janela de impressao
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups para gerar o PDF')
    return
  }

  const currentDate = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })

  // Calcular larguras das colunas baseado no conteudo
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
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #222;
          background: #fff;
        }
        
        .page-container {
          width: 100%;
          max-width: 100%;
          padding: 40px 50px;
          margin: 0 auto;
        }
        
        .header {
          width: 100%;
          padding-bottom: 15px;
          border-bottom: 3px solid #1e293b;
          margin-bottom: 25px;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .header-left h1 {
          font-size: 22pt;
          font-weight: bold;
          color: #0f172a;
          margin-bottom: 5px;
        }
        
        .header-left p {
          font-size: 11pt;
          color: #64748b;
        }
        
        .header-right {
          text-align: right;
        }
        
        .header-right .brand {
          font-size: 18pt;
          font-weight: bold;
          color: #0f172a;
        }
        
        .header-right .info {
          font-size: 10pt;
          color: #64748b;
          margin-top: 3px;
        }
        
        .subtitle {
          font-size: 11pt;
          color: #334155;
          margin-bottom: 25px;
          padding: 12px 18px;
          background: #f1f5f9;
          border-left: 5px solid #1e293b;
          border-radius: 0 4px 4px 0;
        }
        
        .summary {
          display: flex;
          gap: 16px;
          margin-bottom: 28px;
        }
        
        .summary-item {
          flex: 1;
          padding: 16px;
          text-align: center;
          background: #fafafa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        
        .summary-item .label {
          font-size: 9pt;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 6px;
        }
        
        .summary-item .value {
          font-size: 18pt;
          font-weight: bold;
          color: #0f172a;
        }

        .summary-item .value-days {
          font-size: 18pt;
          font-weight: bold;
          line-height: 1.1;
        }

        .summary-item .value-hhmm {
          font-size: 12pt;
          font-weight: 600;
          font-family: monospace;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          font-size: 11pt;
          table-layout: fixed;
        }
        
        th {
          background: #1e293b;
          color: #fff;
          padding: 12px;
          font-weight: 600;
          text-align: left;
          font-size: 10pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 11px 12px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
          word-wrap: break-word;
          word-break: break-word;
          white-space: normal;
          max-width: 200px;
        }
        
        tr:nth-child(even) {
          background: #f8fafc;
        }

        .badge { display: inline-block; padding: 3px 9px; border-radius: 4px; font-size: 10pt; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef9c3; color: #854d0e; }
        
        .footer {
          margin-top: 36px;
          padding-top: 16px;
          border-top: 2px solid #1e293b;
          font-size: 10pt;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .empty-message {
          padding: 50px;
          text-align: center;
          color: #94a3b8;
          font-size: 13pt;
          font-style: italic;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
        }
        
        @media print {
          @page { size: A4; margin: 0; }
          html, body { 
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-container { padding: 40px 50px; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="header">
          <div class="header-content">
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
        </div>
      
      <div class="subtitle">${subtitle}</div>
      
      ${summary ? `
          <div class="summary">
            ${summary.map(s => {
              const hasDays = s.value.includes('d ')
              const [dayPart, timePart] = hasDays ? s.value.split(' ') : [null, null]
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
          <div style="color:#888;font-style:italic;">Sistema desenvolvido em conformidade com as normas TISAX</div>
          <div>Pagina 1</div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 300);
        }
      </script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

// Funcao para gerar PDF por maquina (formato detalhado)
function generateMachineDetailPDF(
  machineData: Array<{
    machineName: string
    sector: string
    stoppedTime: number   // tempo total desde abertura até resolução
    operatingTime: number // tempo real do manutentor trabalhando
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
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #222;
          background: #fff;
        }
        .page-container {
          width: 100%;
          max-width: 100%;
          padding: 40px 50px;
          margin: 0 auto;
        }
        .header {
          width: 100%;
          padding-bottom: 15px;
          border-bottom: 3px solid #222;
          margin-bottom: 30px;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header h1 { font-size: 22pt; color: #111; margin-bottom: 5px; }
        .header p { font-size: 11pt; color: #666; }
        .header-right { text-align: right; }
        .header-right .brand { font-size: 16pt; font-weight: bold; color: #111; }
        .header-right .info { font-size: 10pt; color: #666; margin-top: 3px; }
        .machine-section {
          margin-bottom: 35px;
          page-break-inside: avoid;
        }
        .machine-header {
          background: #1e293b;
          color: white;
          padding: 14px 18px;
          margin-bottom: 15px;
        }
        .machine-header h3 { font-size: 14pt; margin-bottom: 4px; }
        .machine-header p { font-size: 11pt; opacity: 0.85; }
        .machine-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        .machine-stats > div {
          flex: 1;
          text-align: center;
          padding: 14px;
          background: #fafafa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .machine-stats .label { font-size: 9pt; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px; }
        .machine-stats .value { font-size: 15pt; font-weight: bold; color: #0f172a; }
        .machine-stats .value-days { font-size: 15pt; font-weight: bold; line-height: 1.1; }
        .machine-stats .value-hhmm { font-size: 10pt; font-weight: 600; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; font-size: 11pt; table-layout: fixed; }
        th { background: #1e293b; color: #fff; padding: 12px; text-align: left; font-weight: 600; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-wrap: break-word; word-break: break-word; white-space: normal; }
        tr:nth-child(even) { background: #f8fafc; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 10pt; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef9c3; color: #854d0e; }
        .footer {
          margin-top: 36px;
          padding-top: 16px;
          border-top: 2px solid #1e293b;
          font-size: 10pt;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .empty-msg {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
          font-style: italic;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
        }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { 
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-container { padding: 40px 50px; }
          .machine-section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="header">
          <div class="header-content">
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
        </div>
        
        ${machineData.map(machine => `
          <div class="machine-section">
            <div class="machine-header">
              <h3>${machine.machineName}</h3>
              <p>${machine.sector}</p>
            </div>
            <div class="machine-stats">
              <div>
                <span class="label">Total de Chamados</span>
                <span class="value">${machine.tickets.length}</span>
              </div>
              <div style="border-color: #fca5a5;">
                <span class="label" style="color:#dc2626;">Máquina Parada</span>
                ${(() => { const d = formatDurationLong(machine.stoppedTime); return d.days > 0 ? `<span class="value-days" style="color:#dc2626;">${d.days}d</span><span class="value-hhmm" style="color:#ef4444;display:block;">${d.hhmm}</span>` : `<span class="value" style="color:#dc2626;">${d.hhmm}</span>` })()}
                <span style="font-size:9pt;color:#94a3b8;display:block;margin-top:2px;">abertura → resolução</span>
              </div>
              <div style="border-color: #fdba74;">
                <span class="label" style="color:#ea580c;">Tempo Operando</span>
                ${(() => { const d = formatDurationLong(machine.operatingTime); return d.days > 0 ? `<span class="value-days" style="color:#ea580c;">${d.days}d</span><span class="value-hhmm" style="color:#f97316;display:block;">${d.hhmm}</span>` : `<span class="value" style="color:#ea580c;">${d.hhmm}</span>` })()}
                <span style="font-size:9pt;color:#94a3b8;display:block;margin-top:2px;">manutentor trabalhando</span>
              </div>
              <div>
                <span class="label">Custo Total</span>
                <span class="value">${formatCurrency(machine.totalCost)}</span>
              </div>
            </div>
            ${machine.tickets.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Problema</th>
                    <th>Status</th>
                    <th style="color:#ef4444;">Maq. Parada</th>
                    <th style="color:#f97316;">Operando</th>
                    <th>Custo</th>
                    <th>Operador</th>
                    <th>Pecas</th>
                  </tr>
                </thead>
                <tbody>
                  ${machine.tickets.map(t => `
                    <tr>
                      <td>${t.date}</td>
                      <td>${t.problem}</td>
                      <td><span class="badge ${t.resolved ? 'badge-success' : 'badge-warning'}">${t.resolved ? 'Resolvido' : 'Não Resolvido'}</span></td>
                      <td style="color:#dc2626;font-weight:600;">${formatDurationLong(t.stoppedTime).full}</td>
                      <td style="color:#ea580c;">${formatDurationLong(t.downtime).full}</td>
                      <td>${formatCurrency(t.cost)}</td>
                      <td>${t.operator}</td>
                      <td>${t.parts || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="empty-msg">Nenhuma manutenção registrada</div>'}
          </div>
        `).join('')}
        
        <div class="footer">
          <div>TMS ONE - Tool Manager System | Todos os direitos reservados</div>
          <div style="color:#64748b;font-style:italic;">Sistema desenvolvido em conformidade com as normas TISAX</div>
          <div>Pagina 1</div>
        </div>
      </div>
      
      <script>
        window.onload = function() { 
          setTimeout(function() { window.print(); }, 300);
        }
      </script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

export function ReportsView() {
  const { tickets, machines, parts, auditLogs, getMachineById, getProblemById, getPartById } = useData()
  const { users } = useAuth()
  
  const [activeTab, setActiveTab] = useState<ReportType>('general')
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    },
    datePreset: 'month',
    machineId: 'all',
    userId: 'all',
    partId: 'all',
    resolved: 'all',
    priority: 'all'
  })
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Aplicar preset de data
  const handleDatePreset = (preset: DatePreset) => {
    const today = new Date()
    let from: Date
    let to: Date = today

    switch (preset) {
      case 'today':
        from = startOfDay(today)
        to = endOfDay(today)
        break
      case 'week':
        from = subDays(today, 7)
        break
      case 'month':
        from = startOfMonth(today)
        to = endOfMonth(today)
        break
      default:
        return
    }

    setFilters(prev => ({
      ...prev,
      datePreset: preset,
      dateRange: { from, to }
    }))
  }

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date()
      },
      datePreset: 'month',
      machineId: 'all',
      userId: 'all',
      partId: 'all',
      resolved: 'all',
      priority: 'all'
    })
  }

  const hasActiveFilters = 
    filters.machineId !== 'all' || 
    filters.userId !== 'all' || 
    filters.partId !== 'all' ||
    filters.resolved !== 'all' ||
    filters.priority !== 'all'

  // Filtrar tickets para relatório: finalizados + em andamento (máquina ainda parada)
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Incluir todos exceto open sem ação
      if (t.status === 'open' || t.status === 'cancelled') return false

      // Data de referência: completedAt, ou última action, ou createdAt
      const refDate = t.completedAt
        ? new Date(t.completedAt)
        : t.actions.length > 0
          ? new Date(t.actions[t.actions.length - 1].timestamp)
          : new Date(t.createdAt)

      // Filtro de data — só aplica quando preset não é "all"
      if (filters.dateRange?.from && filters.dateRange?.to) {
        // Para tickets ainda ativos, usar createdAt como referência de entrada no período
        const checkDate = t.status === 'completed' || t.status === 'unresolved' ? refDate : new Date(t.createdAt)
        if (!isWithinInterval(checkDate, {
          start: startOfDay(filters.dateRange.from),
          end: endOfDay(filters.dateRange.to)
        })) return false
      }

      if (filters.machineId !== 'all' && t.machineId !== filters.machineId) return false

      if (filters.userId !== 'all') {
        const targetUser = users.find(u => u.id === filters.userId)
        if (!targetUser) return false
        const operatorWorked =
          t.createdBy === filters.userId ||
          t.actions.some(a => a.operatorName === targetUser.name)
        if (!operatorWorked) return false
      }

      if (filters.partId !== 'all') {
        const hasPart = t.usedParts.some(up => up.partId === filters.partId)
        if (!hasPart) return false
      }

      if (filters.resolved !== 'all') {
        if (filters.resolved === 'yes' && !t.resolved) return false
        if (filters.resolved === 'no' && t.resolved !== false) return false
      }

      if (filters.priority !== 'all' && t.priority !== filters.priority) return false

      return true
    })
  }, [tickets, filters, users])

  // Estatísticas gerais
  const stats = useMemo(() => {
    // Tempo Maquina Parada = createdAt ate completedAt (ou agora se ainda ativa)
    const totalStoppedTime = filteredTickets.reduce((sum, t) => {
      const start = new Date(t.createdAt).getTime()
      const end = t.completedAt ? new Date(t.completedAt).getTime() : Date.now()
      return sum + Math.floor((end - start) / 1000)
    }, 0)
    // Tempo Operando = soma dos segmentos de trabalho real do manutentor
    const totalOperatingTime = filteredTickets.reduce((sum, t) => sum + t.downtime, 0)
    const totalCost = filteredTickets.reduce((sum, t) => sum + t.totalCost, 0)
    const resolved = filteredTickets.filter(t => t.resolved).length
    const notResolved = filteredTickets.filter(t => !t.resolved).length
    const uniqueMachines = new Set(filteredTickets.map(t => t.machineId)).size

    return {
      total: filteredTickets.length,
      totalStoppedTime,
      totalOperatingTime,
      totalCost,
      resolved,
      notResolved,
      uniqueMachines
    }
  }, [filteredTickets])

  // Dados por máquina
  const machineData = useMemo(() => {
    const data = new Map<string, { 
      stoppedTime: number   // createdAt → completedAt (tempo real parada)
      operatingTime: number // soma dos segmentos de trabalho
      totalCost: number
      ticketCount: number
      tickets: typeof filteredTickets
    }>()

    filteredTickets.forEach(ticket => {
      const start = new Date(ticket.createdAt).getTime()
      const end = ticket.completedAt ? new Date(ticket.completedAt).getTime() : Date.now()
      const stoppedTime = Math.floor((end - start) / 1000)
      const operatingTime = ticket.downtime

      const current = data.get(ticket.machineId) || { 
        stoppedTime: 0,
        operatingTime: 0,
        totalCost: 0, 
        ticketCount: 0,
        tickets: []
      }
      data.set(ticket.machineId, {
        stoppedTime: current.stoppedTime + stoppedTime,
        operatingTime: current.operatingTime + operatingTime,
        totalCost: current.totalCost + ticket.totalCost,
        ticketCount: current.ticketCount + 1,
        tickets: [...current.tickets, ticket]
      })
    })

    return Array.from(data.entries())
      .map(([machineId, d]) => {
        const machine = getMachineById(machineId)
        return {
          machineId,
          machineName: machine?.name || 'Desconhecida',
          sector: machine?.sector || '',
          ...d
        }
      })
      .sort((a, b) => b.stoppedTime - a.stoppedTime)
  }, [filteredTickets, getMachineById])

  // Dados por usuário - tempo operando = segmentos reais do manutentor
  const userData = useMemo(() => {
    const data = new Map<string, {
      ticketCount: number
      operatingTime: number // tempo real trabalhando (segmentos)
      totalCost: number
      resolvedCount: number
    }>()

    filteredTickets.forEach(ticket => {
      const operatorTimes = new Map<string, number>()
      
      if (ticket.timeSegments && ticket.timeSegments.length > 0) {
        ticket.timeSegments.forEach(seg => {
          const segDuration = seg.duration || (seg.endTime
            ? Math.floor((new Date(seg.endTime).getTime() - new Date(seg.startTime).getTime()) / 1000)
            : ticket.status === 'in-progress' ? Math.floor((Date.now() - new Date(seg.startTime).getTime()) / 1000) : 0)
          const current = operatorTimes.get(seg.operatorName) || 0
          operatorTimes.set(seg.operatorName, current + segDuration)
        })
      } else {
        // Fallback para tickets sem segmentos
        const lastAction = ticket.actions[ticket.actions.length - 1]
        if (lastAction) {
          operatorTimes.set(lastAction.operatorName, ticket.downtime)
        }
      }

      operatorTimes.forEach((operatingTime, operatorName) => {
        const current = data.get(operatorName) || {
          ticketCount: 0,
          operatingTime: 0,
          totalCost: 0,
          resolvedCount: 0
        }
        const lastAction = ticket.actions[ticket.actions.length - 1]
        const isCompleter = lastAction?.operatorName === operatorName

        data.set(operatorName, {
          ticketCount: current.ticketCount + 1,
          operatingTime: current.operatingTime + operatingTime,
          totalCost: current.totalCost + (isCompleter ? ticket.totalCost : 0),
          resolvedCount: current.resolvedCount + (isCompleter && ticket.resolved ? 1 : 0)
        })
      })
    })

    return Array.from(data.entries())
      .map(([userName, d]) => ({ userName, ...d }))
      .sort((a, b) => b.operatingTime - a.operatingTime)
  }, [filteredTickets])

  // Dados por peça
  const partsData = useMemo(() => {
    const data = new Map<string, { quantity: number; totalValue: number }>()

    filteredTickets.forEach(ticket => {
      ticket.usedParts.forEach(up => {
        const part = getPartById(up.partId)
        if (!part) return

        const current = data.get(up.partId) || { quantity: 0, totalValue: 0 }
        data.set(up.partId, {
          quantity: current.quantity + up.quantity,
          totalValue: current.totalValue + (part.price * up.quantity)
        })
      })
    })

    return Array.from(data.entries())
      .map(([partId, d]) => {
        const part = getPartById(partId)
        return {
          partId,
          partName: part?.name || 'Desconhecida',
          unitPrice: part?.price || 0,
          ...d
        }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
  }, [filteredTickets, getPartById])

  // Filtrar logs de auditoria
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const logDate = new Date(log.timestamp)
        if (!isWithinInterval(logDate, {
          start: startOfDay(filters.dateRange.from),
          end: endOfDay(filters.dateRange.to)
        })) return false
      }

      if (filters.userId !== 'all' && log.userId !== filters.userId) return false

      return true
    })
  }, [auditLogs, filters])

  // Gerar PDF baseado na aba ativa
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
            const stoppedSecs = Math.floor((
              (t.completedAt ? new Date(t.completedAt).getTime() : Date.now()) -
              new Date(t.createdAt).getTime()
            ) / 1000)
            return {
              data: format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
              maquina: machine?.name || '-',
              problema: problem?.name || '-',
              prioridade: PRIORITY_CONFIG[t.priority].label,
              status: t.resolved ? 'Resolvido' : 'Não Resolvido',
              maqParada: formatDurationLong(stoppedSecs).full,
              operando: formatDurationLong(t.downtime).full,
              custo: formatCurrency(t.totalCost),
              operador: lastAction?.operatorName || '-'
            }
          }),
          [
            { key: 'data', label: 'Data' },
            { key: 'maquina', label: 'Máquina' },
            { key: 'problema', label: 'Problema' },
            { key: 'prioridade', label: 'Prioridade', align: 'center' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'maqParada', label: 'Maq. Parada', align: 'right' },
            { key: 'operando', label: 'Operando', align: 'right' },
            { key: 'custo', label: 'Custo', align: 'right' },
            { key: 'operador', label: 'Operador' }
          ],
          [
            { label: 'Total de Manutenções', value: String(stats.total) },
            { label: 'Tempo Máquina Parada', value: formatDurationLong(stats.totalStoppedTime).full, color: '#dc2626' },
            { label: 'Tempo Operando', value: formatDurationLong(stats.totalOperatingTime).full, color: '#ea580c' },
            { label: 'Custo Total', value: formatCurrency(stats.totalCost) },
            { label: 'Resolvidos', value: `${stats.resolved} (${stats.total > 0 ? Math.round(stats.resolved / stats.total * 100) : 0}%)` }
          ]
        )
        break

      case 'machines':
        // Gera PDF detalhado por maquina
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
              const partsUsed = t.usedParts.map(up => {
                const part = getPartById(up.partId)
                return `${part?.name} (x${up.quantity})`
              }).join(', ')
              const stoppedSecs = Math.floor((
                (t.completedAt ? new Date(t.completedAt).getTime() : Date.now()) -
                new Date(t.createdAt).getTime()
              ) / 1000)

              return {
                date: format(t.completedAt ?? (t.actions.length > 0 ? new Date(t.actions[t.actions.length - 1].timestamp) : new Date(t.createdAt)), 'dd/MM/yyyy', { locale: ptBR }),
                problem: problem?.name || '-',
                priority: PRIORITY_CONFIG[t.priority].label,
                resolved: t.resolved ?? true,
                stoppedTime: stoppedSecs,
                downtime: t.downtime,
                cost: t.totalCost,
                operator: lastAction?.operatorName || '-',
                notes: t.completionNotes || '',
                parts: partsUsed
              }
            })
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
            custo: formatCurrency(u.totalCost),
          })),
          [
            { key: 'nome', label: 'Manutentor' },
            { key: 'chamados', label: 'Chamados', align: 'center' },
            { key: 'resolvidos', label: 'Resolvidos', align: 'center' },
            { key: 'operando', label: 'Tempo Operando', align: 'right' },
            { key: 'media', label: 'Media/Chamado', align: 'right' },
            { key: 'custo', label: 'Custo Total', align: 'right' },
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
            precoUnit: formatCurrency(p.unitPrice),
            total: formatCurrency(p.totalValue)
          })),
          [
            { key: 'peca', label: 'Peca' },
            { key: 'quantidade', label: 'Quantidade', align: 'center' },
            { key: 'precoUnit', label: 'Preco Unit.', align: 'right' },
            { key: 'total', label: 'Total', align: 'right' }
          ],
          [
            { label: 'Total de Tipos', value: String(partsData.length) },
            { label: 'Custo Total', value: formatCurrency(partsData.reduce((s, p) => s + p.totalValue, 0)) }
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
            detalhes: log.details.substring(0, 80) + (log.details.length > 80 ? '...' : '')
          })),
          [
            { key: 'data', label: 'Data/Hora' },
            { key: 'usuario', label: 'Usuario' },
            { key: 'acao', label: 'Acao' },
            { key: 'entidade', label: 'Entidade' },
            { key: 'detalhes', label: 'Detalhes' }
          ],
          [
            { label: 'Total de Registros', value: String(filteredLogs.length) }
          ]
        )
        break
    }
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
            Análise completa de manutenções e auditoria
          </p>
        </div>
        <Button onClick={handleGeneratePDF}>
          <Printer className="w-4 h-4 mr-2" />
          Gerar PDF
        </Button>
      </div>

      {/* Filtros Globais */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Linha 1: Período ocupa largura total em mobile, metade em desktop */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
{/* Período */}
            <div className="lg:col-span-1">
              <Label className="text-xs">Período</Label>
              <div className="flex gap-1 mb-1">
                <Button 
                  variant={filters.datePreset === 'today' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleDatePreset('today')}
                  className="flex-1 text-xs"
                >
                  Hoje
                </Button>
                <Button 
                  variant={filters.datePreset === 'week' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleDatePreset('week')}
                  className="flex-1 text-xs"
                >
                  7 dias
                </Button>
                <Button 
                  variant={filters.datePreset === 'month' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleDatePreset('month')}
                  className="flex-1 text-xs"
                >
                  Mês
                </Button>
              </div>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {filters.dateRange?.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, 'dd/MM/yy', { locale: ptBR })} - {format(filters.dateRange.to, 'dd/MM/yy', { locale: ptBR })}
                        </>
                      ) : (
                        format(filters.dateRange.from, 'dd/MM/yy', { locale: ptBR })
                      )
                    ) : (
                      'Selecionar datas'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={filters.dateRange}
                    onSelect={(range) => {
                      setFilters(prev => ({ ...prev, dateRange: range, datePreset: 'custom' }))
                    }}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Maquina */}
            <div className="space-y-1">
              <Label className="text-xs">Maquina</Label>
              <Select 
                value={filters.machineId} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, machineId: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Máquinas</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usuario/Manutentor */}
            <div className="space-y-1">
              <Label className="text-xs">Manutentor</Label>
              <Select 
                value={filters.userId} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, userId: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Manutentores</SelectItem>
                  {users.filter(u => u.role === 'manutentor').map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Resolvido */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select 
                value={filters.resolved} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, resolved: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="yes">Resolvidos</SelectItem>
                  <SelectItem value="no">Não Resolvidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

        {/* Tempo Máquina Parada — desde abertura do chamado */}
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

        {/* Tempo Operando — tempo real do manutentor trabalhando */}
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
              <div className="p-2 rounded-lg bg-green-500">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo em Peças</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Resolução separada */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taxa Resolução</p>
                  <p className="text-xl font-bold">
                    {stats.total > 0 ? Math.round(stats.resolved / stats.total * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="flex-1 hidden sm:flex items-center gap-6 text-sm">
                <span className="text-green-600 font-medium">{stats.resolved} resolvidos</span>
                <span className="text-orange-600 font-medium">{stats.notResolved} pendentes</span>
                <span className="text-muted-foreground">{stats.uniqueMachines} máquinas afetadas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas de Relatórios */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
        <TabsList className="grid w-full h-auto gap-1 p-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <TabsTrigger value="general" className="text-[10px] sm:text-xs px-1 py-2">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="machines" className="text-[10px] sm:text-xs px-1 py-2">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">Máquinas</span>
            <span className="sm:hidden">Maq.</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-[10px] sm:text-xs px-1 py-2">
            <User className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">Usuários</span>
            <span className="sm:hidden">User</span>
          </TabsTrigger>
          <TabsTrigger value="parts" className="text-[10px] sm:text-xs px-1 py-2">
            <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">Peças</span>
            <span className="sm:hidden">Pec.</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Geral */}
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Manutenções</CardTitle>
              <CardDescription>
                {filteredTickets.length} manutenções encontradas
              </CardDescription>
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
                      <th className="p-2 sm:p-3 text-right font-medium text-[10px] sm:text-xs text-red-600">Maq. Parada</th>
                      <th className="p-2 sm:p-3 text-right font-medium text-[10px] sm:text-xs text-orange-600 hidden sm:table-cell">Operando</th>
                      <th className="p-2 sm:p-3 text-right font-medium text-[10px] sm:text-xs">Custo</th>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden md:table-cell">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTickets.slice(0, 50).map((ticket) => {
                      const machine = getMachineById(ticket.machineId)
                      const problem = getProblemById(ticket.problemId)
                      const lastAction = ticket.actions[ticket.actions.length - 1]
                      const stoppedSecs = Math.floor((
                        (ticket.completedAt ? new Date(ticket.completedAt).getTime() : Date.now()) -
                        new Date(ticket.createdAt).getTime()
                      ) / 1000)
                      
                      return (
                        <tr key={ticket.id} className="hover:bg-muted/50">
                          <td className="p-2 sm:p-3 whitespace-nowrap text-[10px] sm:text-xs">
                            {format(new Date(ticket.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </td>
                          <td className="p-2 sm:p-3 text-[10px] sm:text-xs max-w-[100px] truncate">{machine?.name || '-'}</td>
                          <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden sm:table-cell max-w-[120px] truncate">{problem?.name || '-'}</td>
                          <td className="p-2 sm:p-3 text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] sm:text-xs px-1 sm:px-2",
                                ticket.resolved 
                                  ? "bg-green-50 text-green-600 border-green-200" 
                                  : ticket.status === 'in-progress' || ticket.status === 'paused'
                                    ? "bg-orange-50 text-orange-600 border-orange-200"
                                    : "bg-red-50 text-red-600 border-red-200"
                              )}
                            >
                              {ticket.resolved ? 'Resolvido' : ticket.status === 'in-progress' ? 'Em andamento' : ticket.status === 'paused' ? 'Pausado' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-right font-mono text-[10px] sm:text-xs text-red-600 font-semibold">
                            {formatDurationLong(stoppedSecs).full}
                          </td>
                          <td className="p-2 sm:p-3 text-right font-mono text-[10px] sm:text-xs text-orange-600 hidden sm:table-cell">
                            {formatDurationLong(ticket.downtime).full}
                          </td>
                          <td className="p-2 sm:p-3 text-right font-mono text-[10px] sm:text-xs">
                            {formatCurrency(ticket.totalCost)}
                          </td>
                          <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden md:table-cell max-w-[80px] truncate">{lastAction?.operatorName || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredTickets.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma manutenção encontrada para os filtros selecionados.
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

        {/* Tab Maquinas */}
        <TabsContent value="machines" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking por Máquina</CardTitle>
              <CardDescription>
                Ordenado por tempo de máquina parada (maior para menor)
              </CardDescription>
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
                      {/* Tempo Máquina Parada */}
                      <div className="text-right">
                        <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Máquina Parada</p>
                        {(() => {
                          const d = formatDurationLong(m.stoppedTime)
                          return d.days > 0 ? (
                            <>
                              <p className="font-bold text-red-600 font-mono leading-tight">{d.days}d</p>
                              <p className="text-xs text-red-500 font-mono">{d.hhmm}</p>
                            </>
                          ) : (
                            <p className="font-bold text-red-600 font-mono">{d.hhmm}</p>
                          )
                        })()}
                        <p className="text-[10px] text-muted-foreground">abertura → resolução</p>
                      </div>
                      {/* Tempo Operando */}
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Operando</p>
                        {(() => {
                          const d = formatDurationLong(m.operatingTime)
                          return d.days > 0 ? (
                            <>
                              <p className="font-medium text-orange-600 font-mono leading-tight">{d.days}d</p>
                              <p className="text-xs text-orange-500 font-mono">{d.hhmm}</p>
                            </>
                          ) : (
                            <p className="font-medium text-orange-600 font-mono">{d.hhmm}</p>
                          )
                        })()}
                        <p className="text-[10px] text-muted-foreground">trabalhando</p>
                      </div>
                      {/* Custo */}
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo Peças</p>
                        <p className="font-medium text-green-600">{formatCurrency(m.totalCost)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {machineData.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum dado encontrado para os filtros selecionados.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Usuarios */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Manutentor</CardTitle>
              <CardDescription>
                Tempo operando = segmentos reais de trabalho por manutentor
              </CardDescription>
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
                      {/* Tempo Operando — tempo real do manutentor */}
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Tempo Operando</p>
                        {(() => {
                          const d = formatDurationLong(u.operatingTime)
                          return d.days > 0 ? (
                            <>
                              <p className="font-medium text-orange-600 font-mono leading-tight">{d.days}d</p>
                              <p className="text-xs text-orange-500 font-mono">{d.hhmm}</p>
                            </>
                          ) : (
                            <p className="font-medium text-orange-600 font-mono">{d.hhmm}</p>
                          )
                        })()}
                        <p className="text-[10px] text-muted-foreground">trabalhando</p>
                      </div>
                      {/* Custo */}
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo</p>
                        <p className="font-medium text-green-600">{formatCurrency(u.totalCost)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {userData.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum dado encontrado para os filtros selecionados.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pecas */}
        <TabsContent value="parts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Peças Utilizadas</CardTitle>
              <CardDescription>
                Ordenado por valor total (maior para menor)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium">Peça</th>
                      <th className="p-3 text-center font-medium">Quantidade</th>
                      <th className="p-3 text-right font-medium">Preço Unit.</th>
                      <th className="p-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {partsData.map((p) => (
                      <tr key={p.partId} className="hover:bg-muted/50">
                        <td className="p-3 font-medium">{p.partName}</td>
                        <td className="p-3 text-center">{p.quantity}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(p.unitPrice)}</td>
                        <td className="p-3 text-right font-mono font-bold text-green-600">
                          {formatCurrency(p.totalValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {partsData.length > 0 && (
                    <tfoot className="bg-muted/50">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-medium">Total Geral:</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {formatCurrency(partsData.reduce((s, p) => s + p.totalValue, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {partsData.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma peça utilizada no período selecionado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
