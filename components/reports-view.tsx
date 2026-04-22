'use client'

import { useState, useMemo, useEffect } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'

import { Calendar } from '@/components/ui/calendar'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { formatDuration, formatDurationLong, formatDurationHours, formatCurrency, PRIORITY_CONFIG, type AuditLog, type Shift, type MachineMetrics } from '@/lib/types'
import { fetchShifts, updateMachineShift, fetchMetricsByPeriod } from '@/lib/supabase-data'
import {
  FileText,
  Clock,
  Wrench,
  TrendingUp,
  Calendar as CalendarIcon,
  User,
  CheckCircle,
  CheckCircle2,
  Filter,
  X,
  Package,
  Settings,
  Printer,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  BarChart3,
  AlertTriangle,
  Info,
  Search,
  Eye,
  History,
} from 'lucide-react'
import { format, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subDays, differenceInDays, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

type ReportType = 'general' | 'machines' | 'users' | 'parts' | 'cancelled' | 'metrics'
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

// Função para gerar PDF de métricas MTBF/MTTR (com opção de incluir pausas)
function generateMetricsPDF(
  metricsData: Array<{
    machineName: string
    shiftName: string
    totalFailures: number
    mtbf: number
    mttr: number
    availability: number
  }>,
  pausedTickets: Array<{
    machine: string
    problem: string
    pauseReason: string
    pausedAt: string
    pausedBy: string
  }>,
  periodLabel: string,
  includePaused: boolean = false
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups para gerar o PDF')
    return
  }

  const currentDate = new Date().toLocaleString('pt-BR')
  const totalPages = includePaused ? 2 : 1

  const pausedPage = includePaused ? `
      <!-- Página 2: Chamados Pausados -->
      <div class="page">
        <div class="header">
          <div class="header-left">
            <h1>Chamados Pausados - Motivos</h1>
            <p>Detalhamento dos chamados pausados e seus motivos</p>
          </div>
          <div class="header-right">
            <div class="brand">TMS ONE</div>
            <div class="info">Tool Manager System</div>
            <div class="info">${currentDate}</div>
          </div>
        </div>

        <div class="subtitle">Período: ${periodLabel}</div>

        <div class="summary">
          <div class="summary-item">
            <span class="label">Total de Pausados</span>
            <span class="value text-orange">${pausedTickets.length}</span>
          </div>
        </div>

        ${pausedTickets.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width:18%">Máquina</th>
                <th style="width:22%">Problema</th>
                <th style="width:30%">Motivo da Pausa</th>
                <th style="width:15%" class="text-center">Data da Pausa</th>
                <th style="width:15%">Pausado Por</th>
              </tr>
            </thead>
            <tbody>
              ${pausedTickets.map(t => `
                <tr>
                  <td>${t.machine}</td>
                  <td>${t.problem}</td>
                  <td>${t.pauseReason || 'Não informado'}</td>
                  <td class="text-center">${t.pausedAt}</td>
                  <td>${t.pausedBy}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-message">Nenhum chamado pausado no período selecionado.</div>'}

        <div class="footer">
          <div>TMS ONE - Tool Manager System | Todos os direitos reservados</div>
          <div style="font-style:italic;">Sistema desenvolvido em conformidade com as normas TISAX</div>
          <div>Página 2 de ${totalPages}</div>
        </div>
      </div>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório MTBF/MTTR - TMS ONE</title>
      <style>
        @page { size: A4 landscape; margin: 15mm 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; line-height: 1.4; color: #1e293b; background: #fff; }
        .page { width: 100%; padding: 0; page-break-after: always; }
        .page:last-child { page-break-after: avoid; }
        .header { width: 100%; padding-bottom: 12px; border-bottom: 3px solid #1e293b; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header-left h1 { font-size: 15pt; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
        .header-left p { font-size: 9pt; color: #64748b; }
        .header-right { text-align: right; }
        .header-right .brand { font-size: 13pt; font-weight: bold; color: #0f172a; }
        .header-right .info { font-size: 8pt; color: #64748b; margin-top: 2px; }
        .subtitle { font-size: 9pt; color: #334155; margin-bottom: 16px; padding: 10px 14px; background: #f1f5f9; border-left: 4px solid #1e293b; }
        .summary { display: flex; gap: 12px; margin-bottom: 18px; }
        .summary-item { flex: 1; padding: 12px 10px; text-align: center; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; }
        .summary-item .label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; display: block; margin-bottom: 5px; }
        .summary-item .value { font-size: 15pt; font-weight: bold; color: #0f172a; display: block; }
        .metrics-grid { display: flex; gap: 16px; margin-bottom: 18px; }
        .metric-box { flex: 1; padding: 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fafafa; }
        .metric-box h3 { font-size: 10pt; color: #334155; margin-bottom: 6px; font-weight: 600; }
        .metric-box p { font-size: 8pt; color: #64748b; line-height: 1.4; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
        th { background: #1e293b; color: #fff; padding: 10px 8px; font-weight: 600; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.4px; }
        td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-blue { color: #2563eb; }
        .text-orange { color: #ea580c; }
        .text-green { color: #16a34a; }
        .text-yellow { color: #ca8a04; }
        .text-red { color: #dc2626; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef9c3; color: #854d0e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: auto; padding-top: 12px; border-top: 2px solid #1e293b; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
        .empty-message { padding: 24px; text-align: center; color: #94a3b8; font-size: 10pt; font-style: italic; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; }
        @media print {
          @page { size: A4 landscape; margin: 15mm 12mm; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head>
    <body>
      <!-- Página 1: Métricas MTBF/MTTR -->
      <div class="page">
        <div class="header">
          <div class="header-left">
            <h1>Indicadores de Manutenção - MTBF/MTTR</h1>
            <p>Relatório de confiabilidade e eficiência das máquinas</p>
          </div>
          <div class="header-right">
            <div class="brand">TMS ONE</div>
            <div class="info">Tool Manager System</div>
            <div class="info">${currentDate}</div>
          </div>
        </div>

        <div class="subtitle">Período: ${periodLabel}</div>

        <div class="metrics-grid">
          <div class="metric-box">
            <h3 class="text-blue">MTBF - Tempo Médio Entre Falhas</h3>
            <p>Indica quanto tempo, em média, uma máquina opera até apresentar uma falha. Quanto maior, melhor a confiabilidade.</p>
          </div>
          <div class="metric-box">
            <h3 class="text-orange">MTTR - Tempo Médio de Reparo</h3>
            <p>Indica quanto tempo, em média, leva para reparar uma máquina após uma falha. Quanto menor, mais eficiente.</p>
          </div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <span class="label">Total de Máquinas</span>
            <span class="value">${metricsData.length}</span>
          </div>
          <div class="summary-item">
            <span class="label">Total de Falhas</span>
            <span class="value text-red">${metricsData.reduce((s, m) => s + m.totalFailures, 0)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Disponibilidade Média</span>
            <span class="value text-green">${metricsData.length > 0 ? (metricsData.reduce((s, m) => s + m.availability, 0) / metricsData.length).toFixed(1) : 0}%</span>
          </div>
        </div>

        ${metricsData.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width:25%">Máquina</th>
                <th style="width:20%" class="text-center">Turno</th>
                <th style="width:10%" class="text-center">Falhas</th>
                <th style="width:15%" class="text-center">MTBF (h)</th>
                <th style="width:15%" class="text-center">MTTR (h)</th>
                <th style="width:15%" class="text-center">Disponibilidade</th>
              </tr>
            </thead>
            <tbody>
              ${metricsData.map(m => `
                <tr>
                  <td>${m.machineName}</td>
                  <td class="text-center">${m.shiftName}</td>
                  <td class="text-center">${m.totalFailures}</td>
                  <td class="text-center text-blue" style="font-weight:600;">${m.totalFailures > 0 ? m.mtbf.toFixed(1) : '-'}</td>
                  <td class="text-center text-orange" style="font-weight:600;">${m.totalFailures > 0 ? m.mttr.toFixed(2) : '-'}</td>
                  <td class="text-center">
                    <span class="badge ${m.availability >= 95 ? 'badge-green' : m.availability >= 85 ? 'badge-yellow' : 'badge-red'}">${m.availability.toFixed(1)}%</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-message">Nenhuma máquina com dados no período selecionado.</div>'}

        <div class="footer">
          <div>TMS ONE - Tool Manager System | Todos os direitos reservados</div>
          <div style="font-style:italic;">Sistema desenvolvido em conformidade com as normas TISAX</div>
          <div>Página 1 de ${totalPages}</div>
        </div>
      </div>

      ${pausedPage}

      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
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
                    <th style="width:18%">Manutentor</th>
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
  const { users, isAdmin } = useAuth()

  // Carregar audit logs apenas quando a tela de relatórios é aberta
  useEffect(() => {
    reloadAuditLogs()
  }, [])

  const [activeTab, setActiveTab] = useState<ReportType>('metrics')
  // Filtro padrão: do dia 1 do mês atual até hoje
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: startOfMonth(new Date()), to: new Date() },
    datePreset: 'month',
    machineId: 'all',
    userId: 'all',
    partId: 'all',
    resolved: 'all',
    priority: 'all',
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  
  // Estados para cliques sequenciais no calendário de filtros gerais
  const [tempFilterFrom, setTempFilterFrom] = useState<Date | undefined>(startOfMonth(new Date()))
  const [tempFilterTo, setTempFilterTo] = useState<Date | undefined>(new Date())
  const [filterClickCount, setFilterClickCount] = useState(2)
  const [filterCalendarMonth, setFilterCalendarMonth] = useState<Date>(new Date())
  
  // Handler para cliques sequenciais no calendário de filtros
  const handleFilterDateClick = (date: Date | undefined) => {
    if (!date) return
    
    if (filterClickCount === 0) {
      setTempFilterFrom(date)
      setTempFilterTo(undefined)
      setFilterClickCount(1)
    } else if (filterClickCount === 1) {
      if (tempFilterFrom && date < tempFilterFrom) {
        setTempFilterTo(tempFilterFrom)
        setTempFilterFrom(date)
      } else {
        setTempFilterTo(date)
      }
      setFilterClickCount(2)
    } else {
      setTempFilterFrom(date)
      setTempFilterTo(undefined)
      setFilterClickCount(1)
    }
  }
  
  // Aplicar seleção de datas do filtro geral
  const applyFilterDateRange = () => {
    if (tempFilterFrom && tempFilterTo) {
      setFilters(prev => ({ ...prev, dateRange: { from: tempFilterFrom, to: tempFilterTo }, datePreset: 'custom' }))
      setCalendarOpen(false)
    }
  }
  
  // Sincronizar estados temporários quando popover abre
  const handleFilterCalendarOpenChange = (open: boolean) => {
    if (open) {
      setTempFilterFrom(filters.dateRange?.from)
      setTempFilterTo(filters.dateRange?.to)
      setFilterClickCount(filters.dateRange?.from && filters.dateRange?.to ? 2 : 0)
      if (filters.dateRange?.from) {
        setFilterCalendarMonth(filters.dateRange.from)
      }
    }
    setCalendarOpen(open)
  }
  
  // Estados para MTBF/MTTR
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [shiftsError, setShiftsError] = useState<string | null>(null)
  const [metricsPeriod, setMetricsPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [metricsSearchMachine, setMetricsSearchMachine] = useState('')
  
  // Estados para Sheet de histórico da máquina (inicializados com valores seguros)
  const [machineHistoryOpen, setMachineHistoryOpen] = useState(false)
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null)
  const [selectedMachineName, setSelectedMachineName] = useState<string>('')
  const [machineHistoryTickets, setMachineHistoryTickets] = useState<typeof tickets>([])
  const [loadingMachineHistory, setLoadingMachineHistory] = useState(false)
  const [localMachineShifts, setLocalMachineShifts] = useState<Record<string, string | null>>({})
  const [metricsIncludePaused, setMetricsIncludePaused] = useState(false)
  
  // Estados para dados da View v_metricas_reais
  const [viewMetrics, setViewMetrics] = useState<Array<{
    machine_id: string
    machine_name: string
    total_falhas: number
    downtime_horas: number
    uptime_horas: number
    mtbf: number
    mttr: number
    disponibilidade: number
  }>>([])
  const [monthlyHours, setMonthlyHours] = useState<number>(0)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [tempMonthlyHours, setTempMonthlyHours] = useState<string>('')
  const [savingHours, setSavingHours] = useState(false)
  
  // Estados para filtro de data customizado das métricas
  const [metricsDateRange, setMetricsDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [metricsCalendarOpen, setMetricsCalendarOpen] = useState(false)
  const [proportionalHours, setProportionalHours] = useState<number>(0)
  
  // Estados temporários para seleção por cliques sequenciais
  const [tempMetricsFrom, setTempMetricsFrom] = useState<Date | undefined>(startOfMonth(new Date()))
  const [tempMetricsTo, setTempMetricsTo] = useState<Date | undefined>(endOfMonth(new Date()))
  const [metricsClickCount, setMetricsClickCount] = useState(0)
  const [metricsCalendarMonth, setMetricsCalendarMonth] = useState<Date>(new Date())
  
  // Handler para cliques sequenciais no calendário de métricas
  const handleMetricsDateClick = (date: Date | undefined) => {
    if (!date) return
    
    if (metricsClickCount === 0) {
      // 1º clique: define o from
      setTempMetricsFrom(date)
      setTempMetricsTo(undefined)
      setMetricsClickCount(1)
    } else if (metricsClickCount === 1) {
      // 2º clique: define o to (garante que from < to)
      if (tempMetricsFrom && date < tempMetricsFrom) {
        setTempMetricsTo(tempMetricsFrom)
        setTempMetricsFrom(date)
      } else {
        setTempMetricsTo(date)
      }
      setMetricsClickCount(2)
    } else {
      // 3º clique: limpa e define novo from
      setTempMetricsFrom(date)
      setTempMetricsTo(undefined)
      setMetricsClickCount(1)
    }
  }
  
  // Aplicar seleção de datas
  const applyMetricsDateRange = () => {
    if (tempMetricsFrom && tempMetricsTo) {
      setMetricsDateRange({ from: tempMetricsFrom, to: tempMetricsTo })
      setMetricsCalendarOpen(false)
    }
  }
  
  // Sincronizar estados temporários quando popover abre
  const handleMetricsCalendarOpenChange = (open: boolean) => {
    if (open) {
      setTempMetricsFrom(metricsDateRange?.from)
      setTempMetricsTo(metricsDateRange?.to)
      setMetricsClickCount(metricsDateRange?.from && metricsDateRange?.to ? 2 : 0)
      if (metricsDateRange?.from) {
        setMetricsCalendarMonth(metricsDateRange.from)
      }
    }
    setMetricsCalendarOpen(open)
  }
  
  // Estados para seções colapsáveis

  const [showConfigSection, setShowConfigSection] = useState(false)
  // showSummaryCards removido - resumo agora sempre visível
  
  // Estados para aba Ocorrências Solucionadas
  const [solvedSearchQuery, setSolvedSearchQuery] = useState('')
  const [showAllSolved, setShowAllSolved] = useState(false)
  const [selectedSolvedTicket, setSelectedSolvedTicket] = useState<typeof tickets[0] | null>(null)
  const INITIAL_SOLVED_COUNT = 5
  
  // Estado para alerta de máquinas críticas (expansível)
  const [showCriticalMachines, setShowCriticalMachines] = useState(false)
  

  
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
  
  // Carregar métricas da View v_metricas_reais ou função RPC por período
  const loadViewMetrics = async (fromDate?: Date, toDate?: Date) => {
    setLoadingMetrics(true)
    setMetricsError(null)
    try {
      const fromStr = fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined
      const toStr = toDate ? format(toDate, 'yyyy-MM-dd') : undefined
      
      const data = await fetchMetricsByPeriod(fromStr, toStr)
      setViewMetrics(data.metrics || [])
      setMonthlyHours(data.monthlyHours || 0)
      setTempMonthlyHours(String(data.monthlyHours || ''))
      
      // Calcular horas proporcionais: (HorasMensais / DiasNoMes) * DiasSelecionados
      if (data.monthlyHours > 0 && fromDate && toDate) {
        const daysInMonth = getDaysInMonth(new Date())
        const selectedDays = differenceInDays(toDate, fromDate) + 1
        const proportional = (data.monthlyHours / daysInMonth) * selectedDays
        setProportionalHours(Math.round(proportional * 100) / 100)
      } else {
        setProportionalHours(data.monthlyHours || 0)
      }
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoadingMetrics(false)
    }
  }
  
  // Carregar métricas quando aba é acessada ou quando datas mudam
  useEffect(() => {
    if (activeTab === 'metrics') {
      loadViewMetrics(metricsDateRange?.from, metricsDateRange?.to)
    }
  }, [activeTab, metricsDateRange])
  
  // Função SEGURA para abrir histórico da máquina
  const openMachineHistory = (machineId: string, machineName: string) => {
    try {
      // Validações de segurança
      if (!machineId || typeof machineId !== 'string') {
        console.error('[v0] machineId inválido:', machineId)
        return
      }
      
      setSelectedMachineId(machineId)
      setSelectedMachineName(machineName || 'Máquina')
      setLoadingMachineHistory(true)
      setMachineHistoryOpen(true)
      
      // Filtrar tickets da máquina respeitando o dateRange selecionado (usa filters.dateRange da aba geral)
      const safeTickets = Array.isArray(tickets) ? tickets : []
      
      const filtered = safeTickets.filter(t => {
        // Verificar se o ticket é da máquina
        if (t.machineId !== machineId) return false
        
        // Mostrar tickets que afetam downtime:
        // 1. machineStopped === true OU
        // 2. Tem downtime registrado (totalDowntimeMinutes > 0 ou downtime > 0)
        const hasDowntimeRecorded = (t.totalDowntimeMinutes && t.totalDowntimeMinutes > 0) || 
                                    (t.downtime && t.downtime > 0)
        const hasMachineStopped = t.machineStopped === true
        
        if (!hasDowntimeRecorded && !hasMachineStopped) return false
        
        // Verificar filtro de data se existir (usa filters.dateRange que é o filtro geral da página)
        if (filters.dateRange?.from && filters.dateRange?.to) {
          try {
            const ticketDate = new Date(t.createdAt)
            return isWithinInterval(ticketDate, {
              start: startOfDay(filters.dateRange.from),
              end: endOfDay(filters.dateRange.to)
            })
          } catch {
            return false
          }
        }
        return true
      })
      
      // Ordenar por data mais recente
      const sorted = filtered.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setMachineHistoryTickets(sorted)
      setLoadingMachineHistory(false)
    } catch (err) {
      console.error('[v0] Erro ao abrir histórico:', err)
      setMachineHistoryTickets([])
      setLoadingMachineHistory(false)
    }
  }
  
  // Função para fechar o Sheet
  const closeMachineHistory = () => {
    setMachineHistoryOpen(false)
    setSelectedMachineId(null)
    setSelectedMachineName('')
    setMachineHistoryTickets([])
  }
  
  // Função para salvar horas mensais
  const saveMonthlyHours = async () => {
    const hours = parseFloat(tempMonthlyHours)
    if (isNaN(hours) || hours < 0) {
      alert('Digite um valor válido de horas')
      return
    }
    setSavingHours(true)
    try {
      const res = await fetch('/api/metrics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyHours: hours })
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      // Recarregar métricas para refletir novo cálculo instantaneamente
      await loadViewMetrics()
    } catch (err) {
      alert('Erro ao salvar configuração')
    } finally {
      setSavingHours(false)
    }
  }

  // ========== MÉTRICAS CORRIGIDAS COM LIVE DOWNTIME ==========
  // Combina viewMetrics (dados históricos) com downtime ativo de tickets em aberto
  // TAMBÉM inclui máquinas que só têm tickets ativos (sem histórico)
  // RESPONSIVO ao filtro de data - usa capacidade proporcional ao período
  const correctedMachineMetrics = useMemo(() => {
    if (monthlyHours === 0) return []
    
    const now = new Date()
    
    // Calcular dias no período filtrado
    const filterStart = filters.dateRange?.from ? startOfDay(filters.dateRange.from) : startOfMonth(new Date())
    const filterEnd = filters.dateRange?.to ? endOfDay(filters.dateRange.to) : endOfMonth(new Date())
    const diasNoFiltro = Math.max(1, differenceInDays(filterEnd, filterStart) + 1)
    
    // Calcular capacidade proporcional ao período filtrado
    // Usa horas por dia (22.57h) * dias no filtro
    const diasNoMes = getDaysInMonth(filterStart)
    const horasPorDia = monthlyHours / diasNoMes
    const capacidadePeriodo = horasPorDia * diasNoFiltro
    
    // 1. Buscar TODOS os tickets ativos com machineStopped === true
    const allActiveStoppedTickets = tickets.filter(t => 
      t.machineStopped === true &&
      (t.status === 'open' || t.status === 'in_progress' || t.status === 'paused')
    )
    
    // 2. IDs de máquinas que já estão no viewMetrics (histórico)
    const machineIdsWithHistory = new Set(viewMetrics.map(m => m.machine_id))
    
    // 3. Máquinas com tickets ativos que NÃO estão no viewMetrics
    const machinesOnlyActive = allActiveStoppedTickets
      .filter(t => !machineIdsWithHistory.has(t.machineId))
      .reduce((acc, ticket) => {
        if (!acc.has(ticket.machineId)) {
          const machine = machines.find(m => m.id === ticket.machineId)
          if (machine) {
            acc.set(ticket.machineId, {
              machine_id: ticket.machineId,
              machine_name: machine.name,
              total_falhas: 0,
              downtime_horas: 0,
              mtbf: capacidadePeriodo,
              mttr: 0,
              disponibilidade: 100
            })
          }
        }
        return acc
      }, new Map())
    
    // 4. Combinar: máquinas com histórico + máquinas só com tickets ativos
    const allMachineData = [...viewMetrics, ...Array.from(machinesOnlyActive.values())]
    
    return allMachineData.map(m => {
      // Buscar TODOS os tickets desta máquina com machineStopped no período
      const machineTickets = tickets.filter(t => 
        t.machineId === m.machine_id &&
        t.machineStopped === true
      )
      
      // Separar tickets ativos (em aberto) dos concluídos
      const activeTickets = machineTickets.filter(t => 
        t.status === 'open' || t.status === 'in_progress' || t.status === 'paused'
      )
      
      // Tickets concluídos DENTRO do período filtrado
      const completedTicketsInPeriod = machineTickets.filter(t => {
        if (t.status !== 'completed') return false
        const completedAt = t.completedAt ? new Date(t.completedAt) : null
        if (!completedAt) return false
        return completedAt >= filterStart && completedAt <= filterEnd
      })
      
      // Downtime de tickets CONCLUÍDOS no período (do banco ou calculado)
      const completedDowntimeHoras = completedTicketsInPeriod.reduce((sum, ticket) => {
        // Usar downtime do ticket se disponível, senão calcular
        if (ticket.totalDowntimeMinutes) {
          return sum + (ticket.totalDowntimeMinutes / 60)
        }
        // Calcular baseado em createdAt e completedAt
        const start = new Date(ticket.createdAt)
        const end = ticket.completedAt ? new Date(ticket.completedAt) : now
        const effectiveStart = start < filterStart ? filterStart : start
        const effectiveEnd = end > filterEnd ? filterEnd : end
        if (effectiveStart > effectiveEnd) return sum
        return sum + ((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60))
      }, 0)
      
      // Calcular downtime ativo DENTRO DO PERÍODO FILTRADO
      const liveDowntimeHoras = activeTickets.reduce((sum, ticket) => {
        const ticketStart = new Date(ticket.createdAt)
        
        // Início efetivo: maior entre (início ticket) e (início filtro)
        let effectiveStart = ticketStart
        if (filterStart && ticketStart < filterStart) {
          effectiveStart = filterStart
        }
        
        // Fim efetivo: menor entre (agora) e (fim filtro)
        let effectiveEnd = now
        if (filterEnd && effectiveEnd > filterEnd) {
          effectiveEnd = filterEnd
        }
        
        // Se fora do período, não conta
        if (effectiveStart > effectiveEnd) return sum
        
        const downtimeMs = effectiveEnd.getTime() - effectiveStart.getTime()
        const downtimeHoras = Math.max(0, downtimeMs / (1000 * 60 * 60))
        return sum + downtimeHoras
      }, 0)
      
      // Total downtime NO PERÍODO = concluídos no período + ativos no período
      // NÃO usar m.downtime_horas (que é do mês inteiro), usar apenas dados do período
      const totalDowntimeHoras = Math.min(completedDowntimeHoras + liveDowntimeHoras, capacidadePeriodo)
      
      // Tempo operando no período
      const tempoOperandoPeriodo = Math.max(0, capacidadePeriodo - totalDowntimeHoras)
      
      // Disponibilidade corrigida: Tempo Operando / Capacidade do Período * 100
      const disponibilidadeCorrigida = capacidadePeriodo > 0 
        ? Math.max(0, (tempoOperandoPeriodo / capacidadePeriodo) * 100) 
        : 100
      
      // Total de falhas NO PERÍODO = concluídos no período + ativos
      const totalFalhasCorrigido = completedTicketsInPeriod.length + activeTickets.length
      
      // MTBF e MTTR corrigidos usando capacidade do período
      const mtbfCorrigido = totalFalhasCorrigido > 0 
        ? Math.max(0, tempoOperandoPeriodo / totalFalhasCorrigido) 
        : capacidadePeriodo
      const mttrCorrigido = totalFalhasCorrigido > 0 
        ? totalDowntimeHoras / totalFalhasCorrigido 
        : 0
      
      // Status ativo (para exibição)
      const activeTicket = activeTickets.length > 0 ? activeTickets[0] : null
      
      return {
        ...m,
        downtime_horas_original: m.downtime_horas,
        downtime_horas: totalDowntimeHoras,
        completedDowntimeHoras,
        disponibilidade_original: m.disponibilidade,
        disponibilidade: disponibilidadeCorrigida,
        total_falhas_original: m.total_falhas,
        total_falhas: totalFalhasCorrigido,
        completedTicketsCount: completedTicketsInPeriod.length,
        mtbf: mtbfCorrigido,
        mttr: mttrCorrigido,
        liveDowntimeHoras,
        capacidadePeriodo,
        hasActiveTicket: activeTickets.length > 0,
        activeTicketStatus: activeTicket?.status || null,
        activeTicketPauseReason: activeTicket?.pauseReason || null,
        activeTicketCreatedAt: activeTicket?.createdAt || null
      }
    }).sort((a, b) => a.disponibilidade - b.disponibilidade) // Ordenar do pior para melhor
  }, [viewMetrics, tickets, monthlyHours, machines, filters.dateRange])
  
  // ========== MÉTRICAS GLOBAIS PARCIAIS (MTTR e contagens) ==========
  // O MTBF Global será calculado depois de 'stats' para usar o mesmo Tempo Operando do resumo
  const globalMetricsPartial = useMemo(() => {
    if (viewMetrics.length === 0) return { mttrGlobal: 0, totalFalhas: 0, totalDowntime: 0, totalMaquinas: 0 }
    
    // Somar todas as falhas e downtime de TODAS as máquinas
    const totalFalhas = viewMetrics.reduce((sum, m) => sum + m.total_falhas, 0)
    const totalDowntimeHoras = viewMetrics.reduce((sum, m) => sum + m.downtime_horas, 0)
    
    // MTTR Global: Downtime total / Número de falhas (tempo médio de reparo)
    const mttrGlobal = totalFalhas > 0 ? totalDowntimeHoras / totalFalhas : 0
    
    return { 
      mttrGlobal, 
      totalFalhas, 
      totalDowntime: totalDowntimeHoras,
      totalMaquinas: viewMetrics.length
    }
  }, [viewMetrics])
  // ========== FIM MÉTRICAS GLOBAIS PARCIAIS ==========
  
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
    // Resetar para o padrão: do dia 1 do mês atual até hoje
    setFilters({
      dateRange: { from: startOfMonth(new Date()), to: new Date() },
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
      
      // ========== FILTRO DE DATA CORRIGIDO ==========
      // Tickets em aberto (in-progress, paused, pending) devem ser incluídos se:
      // - Foram criados ANTES ou DURANTE o período do filtro
      // - Ainda estão abertos (não finalizados)
      // Isso garante que o downtime deles seja contabilizado no período
      
      const isOpenTicket = t.status === 'in-progress' || t.status === 'paused' || t.status === 'pending'
      
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const filterStart = startOfDay(filters.dateRange.from)
        const filterEnd = endOfDay(filters.dateRange.to)
        
        if (isOpenTicket) {
          // Tickets em aberto: incluir se foram criados ANTES do fim do filtro
          // (se criado antes do período, ainda conta pois está aberto durante o período)
          const createdAt = new Date(t.createdAt)
          if (createdAt > filterEnd) return false // Criado depois do período? Não inclui
          // Se criado antes ou durante o período e ainda está aberto, INCLUI
        } else {
          // Tickets fechados: usar lógica original (data de referência dentro do intervalo)
          const refDate = t.status === 'cancelled' && t.cancelledAt
            ? new Date(t.cancelledAt)
            : t.completedAt
              ? new Date(t.completedAt)
              : t.actions.length > 0
                ? new Date(t.actions[t.actions.length - 1].timestamp)
                : new Date(t.createdAt)
          const checkDate = t.status === 'completed' || t.status === 'unresolved' || t.status === 'cancelled' ? refDate : new Date(t.createdAt)
          if (!isWithinInterval(checkDate, { start: filterStart, end: filterEnd })) return false
        }
      }
      // ========== FIM FILTRO DE DATA CORRIGIDO ==========
      
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

  // Tickets válidos para métricas: apenas completed + resolved (exclui cancelados/rejeitados)
  const validTicketsForMetrics = useMemo(() => {
    return filteredTickets.filter(t => t.status === 'completed' && t.resolved === true)
  }, [filteredTickets])
  
  // Tickets cancelados/rejeitados (para aba separada)
  const cancelledTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.status !== 'cancelled') return false
      // Aplicar filtros de data
      const refDate = t.cancelledAt ? new Date(t.cancelledAt) : new Date(t.createdAt)
      if (filters.dateRange?.from && refDate < filters.dateRange.from) return false
      if (filters.dateRange?.to) {
        const toEnd = new Date(filters.dateRange.to)
        toEnd.setHours(23, 59, 59, 999)
        if (refDate > toEnd) return false
      }
      // Aplicar filtro de máquina
      if (filters.machineId !== 'all' && t.machineId !== filters.machineId) return false
      return true
    })
  }, [tickets, filters])

  // Tickets em aberto (open, in-progress, paused) para cálculo de downtime progressivo
  // IMPORTANTE: Buscar direto de `tickets` pois `filteredTickets` exclui status 'open'
  // Status possíveis: 'open' | 'in-progress' | 'paused' | 'completed' | 'cancelled' | 'unresolved'
  const openTicketsForDowntime = useMemo(() => {
    const filterStart = filters.dateRange?.from ? startOfDay(filters.dateRange.from) : null
    const filterEnd = filters.dateRange?.to ? endOfDay(filters.dateRange.to) : null
    
    const openTickets = tickets.filter(t => {
      // Apenas tickets com status "em aberto" (não finalizados)
      if (t.status !== 'open' && t.status !== 'in_progress' && t.status !== 'paused') {
        return false
      }
      
      // CRÍTICO: Apenas considerar downtime se a máquina está REALMENTE parada
      if (t.machineStopped !== true) {
        return false
      }
      
      // Respeitar filtro de máquina se selecionado
      if (filters.machineId !== 'all' && t.machineId !== filters.machineId) {
        return false
      }
      
      // Incluir se o ticket foi criado ANTES do fim do filtro
      // (mesmo criado antes do período, se ainda está aberto, afeta o período)
      if (filterEnd) {
        const createdAt = new Date(t.createdAt)
        if (createdAt > filterEnd) return false
      }
      
      return true
    })
    
    return openTickets
  }, [tickets, filters.dateRange, filters.machineId, getMachineById])

  const stats = useMemo(() => {
    // ========== CÁLCULO DO DOWNTIME TOTAL (INCLUI TICKETS EM ABERTO - CRONÔMETRO VIVO) ==========
    
    // 1. Downtime de tickets fechados (completed + resolved) - usa o valor já calculado
    const closedTicketsDowntime = validTicketsForMetrics.reduce((sum, t) => sum + t.downtime, 0)
    
    // 2. Downtime de tickets em aberto (CRONÔMETRO VIVO - até AGORA)
    // REGRA: Calcular desde o início do problema até o momento atual
    const now = new Date()
    
    // Limites do filtro de data
    const filterStart = filters.dateRange?.from ? startOfDay(filters.dateRange.from) : null
    const filterEnd = filters.dateRange?.to ? endOfDay(filters.dateRange.to) : null
    
    const openTicketsDowntime = openTicketsForDowntime.reduce((sum, ticket) => {
      // Data de início do problema (criação do ticket)
      const ticketStart = new Date(ticket.createdAt)
      
      // O downtime acumulado vai desde a criação até AGORA (cronômetro vivo)
      // MAS deve respeitar o filtro de data selecionado
      
      // Início efetivo: o maior entre (início do ticket) e (início do filtro)
      let effectiveStart = ticketStart
      if (filterStart && ticketStart < filterStart) {
        effectiveStart = filterStart
      }
      
      // Fim efetivo: o menor entre (agora) e (fim do filtro)
      let effectiveEnd = now
      if (filterEnd && effectiveEnd > filterEnd) {
        effectiveEnd = filterEnd
      }
      
      // Se o ticket foi criado depois do período do filtro, não conta
      if (effectiveStart > effectiveEnd) {
        return sum
      }
      
      // Calcular downtime em segundos
      const downtimeMs = effectiveEnd.getTime() - effectiveStart.getTime()
      const downtimeSeconds = Math.max(0, Math.floor(downtimeMs / 1000))
      
      return sum + downtimeSeconds
    }, 0)
    
    // Downtime total = fechados + abertos (progressivo em tempo real)
    const totalStoppedTime = closedTicketsDowntime + openTicketsDowntime
    
    // ========== MÁQUINAS CRÍTICAS (paradas há mais de 48h) ==========
    const CRITICAL_HOURS = 48
    const criticalMachines = openTicketsForDowntime
      .map(ticket => {
        const ticketStart = new Date(ticket.createdAt)
        const hoursDown = (now.getTime() - ticketStart.getTime()) / (1000 * 60 * 60)
        return {
          ticketId: ticket.id,
          machineId: ticket.machineId,
          machineName: getMachineById(ticket.machineId)?.name || 'Desconhecida',
          status: ticket.status,
          pauseReason: ticket.pauseReason || null,
          createdAt: ticket.createdAt,
          hoursDown,
          isCritical: hoursDown >= CRITICAL_HOURS
        }
      })
      .filter(m => m.isCritical)
      .sort((a, b) => b.hoursDown - a.hoursDown)
    
    // ========== MÉTRICAS APENAS DE MÁQUINAS PARADAS (para MTBF/MTTR) ==========
    // Filtrar apenas tickets onde machineStopped === true
    const stoppedMachineTickets = filteredTickets.filter(t => t.machineStopped === true)
    const stoppedMachineCount = stoppedMachineTickets.length
    
    // Downtime apenas de máquinas paradas (fechados)
    const stoppedClosedTickets = validTicketsForMetrics.filter(t => t.machineStopped === true)
    const stoppedClosedDowntime = stoppedClosedTickets.reduce((sum, t) => sum + t.downtime, 0)
    
    // Downtime de tickets abertos com máquina parada (CRONÔMETRO VIVO)
    // Nota: openTicketsForDowntime já filtra por machineStopped === true
    const stoppedOpenDowntime = openTicketsForDowntime.reduce((sum, ticket) => {
      const ticketStart = new Date(ticket.createdAt)
      let effectiveStart = ticketStart
      if (filterStart && ticketStart < filterStart) {
        effectiveStart = filterStart
      }
      // Usar NOW para cronômetro vivo
      let effectiveEnd = now
      if (filterEnd && effectiveEnd > filterEnd) {
        effectiveEnd = filterEnd
      }
      if (effectiveStart > effectiveEnd) {
        return sum
      }
      const downtimeMs = effectiveEnd.getTime() - effectiveStart.getTime()
      const downtimeSeconds = Math.max(0, Math.floor(downtimeMs / 1000))
      return sum + downtimeSeconds
    }, 0)
    
    // Total de tempo parado apenas de máquinas paradas
    const stoppedMachineDowntime = stoppedClosedDowntime + stoppedOpenDowntime
    const stoppedMachineUniqueCount = new Set(stoppedMachineTickets.map(t => t.machineId)).size
    // ========== FIM MÉTRICAS MÁQUINAS PARADAS ==========

    // ========== CÁLCULO TEMPO OPERANDO (PROPORCIONAL AO FILTRO) ==========
    // CONSTANTES (valores fixos e explícitos):
    const H_PLANEJADA_DIA = 15.8 // 474h mensais ÷ 30 dias = 15.8h/dia por máquina
    
    // PASSO 1: Calcular dias no período filtrado
    // REGRA: Se from === to (mesmo dia), dias = 1. Se from = ontem e to = hoje, dias = 2
    let diasNoFiltro = 1 // padrão para "Hoje"
    if (filters.dateRange?.from && filters.dateRange?.to) {
      // differenceInDays retorna a diferença absoluta, +1 para incluir ambos os dias
      diasNoFiltro = Math.max(1, differenceInDays(filters.dateRange.to, filters.dateRange.from) + 1)
    }
    
    // PASSO 2: Total de máquinas ativas (usando o número exato de máquinas cadastradas)
    const totalMaquinas = machines.length // Todas as máquinas cadastradas
    
    // PASSO 3: Calcular Capacidade Total em HORAS
    // Fórmula: CapacidadeTotalHoras = H_PLANEJADA_DIA × DiasNoFiltro × TotalMaquinas
    // Exemplo: 15.8 × 2 × 27 = 853.2h
    const capacidadeTotalHoras = H_PLANEJADA_DIA * diasNoFiltro * totalMaquinas
    
    // PASSO 4: Converter Downtime de segundos para HORAS (apenas máquinas paradas)
    const downtimeTotalHoras = stoppedMachineDowntime / 3600
    
    // PASSO 5: Tempo Operando em HORAS
    // Fórmula: TempoOperando = CapacidadeTotal - DowntimeMáquinasParadas
    const tempoOperandoHoras = Math.max(0, capacidadeTotalHoras - downtimeTotalHoras)
    
    // PASSO 6: Converter de volta para SEGUNDOS (para manter compatibilidade com formatDurationHours)
    const totalOperatingTime = tempoOperandoHoras * 3600
    
    // ========== FIM CÁLCULO TEMPO OPERANDO ==========
    
    const totalCost = validTicketsForMetrics.reduce((sum, t) => sum + t.totalCost, 0)
    const resolved = validTicketsForMetrics.length
    const notResolved = filteredTickets.filter(t => t.status === 'unresolved').length
    const uniqueMachines = new Set(validTicketsForMetrics.map(t => t.machineId)).size
    
    // Downtime da View (em horas) - soma de todas as máquinas
    const viewDowntimeHoras = viewMetrics.reduce((sum, m) => sum + m.downtime_horas, 0)
    
    // Contagem de cancelados para exibição
    const cancelledCount = cancelledTickets.length
    
    return { 
      total: filteredTickets.length, 
      validTotal: validTicketsForMetrics.length,
      totalStoppedTime, 
      totalOperatingTime, 
      totalCost, 
      resolved, 
      notResolved, 
      uniqueMachines,
      viewDowntimeHoras,
      cancelledCount,
      // Informações para legenda do card Tempo Operando
      daysInPeriod: diasNoFiltro,
      totalMachinesCount: totalMaquinas,
      plannedCapacityHours: capacidadeTotalHoras,
      dailyCapacityHours: H_PLANEJADA_DIA,
      // Métricas de máquinas paradas (para MTBF/MTTR)
      stoppedMachineCount,
      stoppedMachineDowntime,
      stoppedMachineUniqueCount,
      // Máquinas críticas (paradas há mais de 48h)
      criticalMachines,
      openTicketsCount: openTicketsForDowntime.length
    }
  }, [filteredTickets, validTicketsForMetrics, openTicketsForDowntime, cancelledTickets, viewMetrics, filters.dateRange, machines, getMachineById])

  // ========== MTBF E MTTR GLOBAL (REGRA VETORE) ==========
  // Divisor: Total de Reportes (toda a demanda gerada)
  // MTBF = Tempo Operando Total / Total de Reportes
  // MTTR = Tempo Parado Real (máquinas paradas) / Total de Reportes
  const globalMetrics = useMemo(() => {
    // Tempo parado em horas (apenas máquinas que realmente pararam)
    const stoppedDowntimeHoras = stats.stoppedMachineDowntime / 3600
    // Tempo operando em horas
    const tempoOperandoHoras = Math.max(0, stats.plannedCapacityHours - stoppedDowntimeHoras)
    
    // Divisor único: Total de Reportes (toda a demanda)
    const totalReportes = stats.total
    
    // MTBF Global: Tempo Operando / Total de Reportes
    const mtbfGlobal = totalReportes > 0 ? tempoOperandoHoras / totalReportes : 0
    
    // MTTR Global: Tempo Parado Real / Total de Reportes
    const mttrGlobal = totalReportes > 0 ? stoppedDowntimeHoras / totalReportes : 0
    
    // Disponibilidade Global: (Capacidade Total - Tempo Parado) / Capacidade Total * 100
    // Fórmula: Tempo Operando / Capacidade Total
    const disponibilidadeGlobal = stats.plannedCapacityHours > 0 
      ? (tempoOperandoHoras / stats.plannedCapacityHours) * 100 
      : 100
    
    return {
      mtbfGlobal,
      mttrGlobal,
      disponibilidadeGlobal,
      totalReportes,
      totalDowntime: stoppedDowntimeHoras,
      tempoOperandoTotal: tempoOperandoHoras,
      capacidadeTotal: stats.plannedCapacityHours,
      totalMaquinas: stats.uniqueMachines
    }
  }, [stats.stoppedMachineDowntime, stats.total, stats.plannedCapacityHours, stats.uniqueMachines])
  // ========== FIM MTBF E MTTR GLOBAL ==========

  const machineData = useMemo(() => {
    // Usar tickets válidos (completed + resolved) + tickets em aberto para métricas de máquinas
    const data = new Map<string, { stoppedTime: number; operatingTime: number; totalCost: number; ticketCount: number; tickets: typeof validTicketsForMetrics; openTickets: number }>()
    
    // 1. Adicionar downtime de tickets fechados
    validTicketsForMetrics.forEach(ticket => {
      // stoppedTime = downtime real do ticket (não tempo de abertura até fechamento)
      const stoppedTime = ticket.downtime
      const current = data.get(ticket.machineId) || { stoppedTime: 0, operatingTime: 0, totalCost: 0, ticketCount: 0, tickets: [], openTickets: 0 }
      const segmentsTime = ticket.timeSegments?.reduce((s, seg) => s + seg.duration, 0) || 0
      data.set(ticket.machineId, {
        stoppedTime: current.stoppedTime + stoppedTime,
        operatingTime: current.operatingTime + segmentsTime,
        totalCost: current.totalCost + ticket.totalCost,
        ticketCount: current.ticketCount + 1,
        tickets: [...current.tickets, ticket],
        openTickets: current.openTickets,
      })
    })
    
    // 2. Adicionar downtime progressivo de tickets em aberto (até o final do dia anterior)
    const yesterday = subDays(new Date(), 1)
    const endOfYesterdayTime = endOfDay(yesterday)
    const filterStartTime = filters.dateRange?.from ? startOfDay(filters.dateRange.from) : null
    const filterEndTime = filters.dateRange?.to ? endOfDay(filters.dateRange.to) : null
    
    openTicketsForDowntime.forEach(ticket => {
      const ticketStart = new Date(ticket.createdAt)
      
      // Calcular downtime progressivo respeitando o filtro
      let effectiveStart = ticketStart
      if (filterStartTime && ticketStart < filterStartTime) {
        effectiveStart = filterStartTime
      }
      
      let effectiveEnd = endOfYesterdayTime
      if (filterEndTime && effectiveEnd > filterEndTime) {
        effectiveEnd = filterEndTime
      }
      
      if (effectiveStart <= effectiveEnd) {
        const downtimeMs = effectiveEnd.getTime() - effectiveStart.getTime()
        const downtimeSeconds = Math.max(0, Math.floor(downtimeMs / 1000))
        
        const current = data.get(ticket.machineId) || { stoppedTime: 0, operatingTime: 0, totalCost: 0, ticketCount: 0, tickets: [], openTickets: 0 }
        data.set(ticket.machineId, {
          ...current,
          stoppedTime: current.stoppedTime + downtimeSeconds,
          openTickets: current.openTickets + 1,
        })
      }
    })
    
    return Array.from(data.entries())
      .map(([machineId, d]) => {
        const machine = getMachineById(machineId)
        return { machineId, machineName: machine?.name || 'Desconhecida', sector: machine?.sector || '', ...d }
      })
      .sort((a, b) => b.stoppedTime - a.stoppedTime)
  }, [validTicketsForMetrics, openTicketsForDowntime, getMachineById, filters.dateRange])
  
  const userData = useMemo(() => {
    // Usar apenas tickets válidos para métricas de usuários
    const data = new Map<string, { ticketCount: number; operatingTime: number; totalCost: number; resolvedCount: number }>()
    validTicketsForMetrics.forEach(ticket => {
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
  }, [validTicketsForMetrics])

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
              manutentor: lastAction?.operatorName || '-',
            }
          }),
          [
            { key: 'data', label: 'Data' },
            { key: 'maquina', label: 'Máquina' },
            { key: 'problema', label: 'Problema' },
            { key: 'prioridade', label: 'Prioridade', align: 'center' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'maqParada', label: 'Maq. Parada', align: 'right' },
            { key: 'manutentor', label: 'Manutentor' },
          ],
          [
            { label: 'Total de Manutenções', value: String(stats.total) },
            { label: 'Tempo Máquina Parada', value: formatDurationLong(stats.stoppedMachineDowntime).full, color: '#dc2626' },
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
            { label: 'Tempo Total Maq. Parada', value: formatDurationLong(stats.stoppedMachineDowntime).full, color: '#dc2626' },
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

      case 'metrics':
        // Definir período baseado no filtro de métricas
        const now = new Date()
        let periodStart: Date
        let periodLabel: string
        
        switch (metricsPeriod) {
          case 'week':
            periodStart = subDays(now, 7)
            periodLabel = 'Última Semana (7 dias)'
            break
          case 'year':
            periodStart = subDays(now, 365)
            periodLabel = 'Último Ano (365 dias)'
            break
          case 'month':
          default:
            periodStart = subDays(now, 30)
            periodLabel = 'Último Mês (30 dias)'
        }
        
        // Filtrar máquinas pela busca
        const filteredMachinesForPDF = machines.filter(m => 
          metricsSearchMachine === '' || 
          m.name.toLowerCase().includes(metricsSearchMachine.toLowerCase())
        )
        
        // Calcular métricas para PDF
        const metricsForPDF = filteredMachinesForPDF.map(machine => {
          const shiftId = localMachineShifts[machine.id] || machine.shiftId
          const shift = shifts.find(s => s.id === shiftId)
          
          const machineTickets = tickets.filter(t => 
            t.machineId === machine.id && 
            (t.status === 'completed' || t.status === 'unresolved') &&
            new Date(t.createdAt) >= periodStart &&
            new Date(t.createdAt) <= now
          )
          
          const totalFailures = machineTickets.length
          const totalRepairTime = machineTickets.reduce((sum, t) => sum + t.downtime, 0)
          
          const periodDays = metricsPeriod === 'week' ? 7 : metricsPeriod === 'year' ? 365 : 30
          const hoursPerDay = shift?.hoursPerDay || 8
          const daysPerWeek = shift?.daysPerWeek || 5
          const weeksInPeriod = periodDays / 7
          const expectedHours = hoursPerDay * daysPerWeek * weeksInPeriod
          
          const totalDowntimeHours = totalRepairTime / 3600
          const operatingHours = Math.max(0, expectedHours - totalDowntimeHours)
          const mtbf = totalFailures > 0 ? operatingHours / totalFailures : 0
          const mttr = totalFailures > 0 ? totalDowntimeHours / totalFailures : 0
          const availability = mtbf > 0 ? (mtbf / (mtbf + mttr)) * 100 : (totalFailures === 0 ? 100 : 0)
          
          return {
            machineName: machine.name,
            shiftName: shift?.name || 'Não definido',
            totalFailures,
            mtbf,
            mttr,
            availability,
          }
        }).sort((a, b) => b.totalFailures - a.totalFailures)
        
        // Buscar chamados pausados com motivo
        const pausedTicketsForPDF = tickets
          .filter(t => t.status === 'paused')
          .map(t => {
            const machine = getMachineById(t.machineId)
            const problem = getProblemById(t.problemId)
            const lastPauseAction = [...t.actions].reverse().find(a => a.type === 'pause')
            return {
              machine: machine?.name || '-',
              problem: t.customProblemName || problem?.name || '-',
              pauseReason: lastPauseAction?.reason || 'Não informado',
              pausedAt: lastPauseAction ? format(new Date(lastPauseAction.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-',
              pausedBy: lastPauseAction?.operatorName || '-',
            }
          })
        
        generateMetricsPDF(metricsForPDF, pausedTicketsForPDF, periodLabel, metricsIncludePaused)
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
              <Popover open={calendarOpen} onOpenChange={handleFilterCalendarOpenChange}>
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
                  {/* Indicador de seleção atual */}
                  <div className="p-3 border-b flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium border-2",
                        tempFilterFrom 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-muted text-muted-foreground border-dashed border-muted-foreground/30"
                      )}>
                        {tempFilterFrom ? format(tempFilterFrom, "dd/MM/yy", { locale: ptBR }) : "Início"}
                      </div>
                      <span className="text-muted-foreground text-xs">até</span>
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium border-2",
                        tempFilterTo 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-muted text-muted-foreground border-dashed border-muted-foreground/30"
                      )}>
                        {tempFilterTo ? format(tempFilterTo, "dd/MM/yy", { locale: ptBR }) : "Fim"}
                      </div>
                    </div>
                    {filterClickCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => {
                          setTempFilterFrom(undefined)
                          setTempFilterTo(undefined)
                          setFilterClickCount(0)
                        }}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  {/* Calendário único com navegação */}
                  <Calendar
                    mode="single"
                    month={filterCalendarMonth}
                    onMonthChange={setFilterCalendarMonth}
                    selected={undefined}
                    onSelect={handleFilterDateClick}
                    locale={ptBR}
                    className="p-3"
                    modifiers={{
                      selected: (date) => {
                        if (tempFilterFrom && date.toDateString() === tempFilterFrom.toDateString()) return true
                        if (tempFilterTo && date.toDateString() === tempFilterTo.toDateString()) return true
                        return false
                      },
                      range: (date) => {
                        if (tempFilterFrom && tempFilterTo) {
                          return date > tempFilterFrom && date < tempFilterTo
                        }
                        return false
                      }
                    }}
                    modifiersStyles={{
                      selected: { 
                        backgroundColor: 'hsl(var(--primary))', 
                        color: 'hsl(var(--primary-foreground))',
                        fontWeight: 'bold'
                      },
                      range: { 
                        backgroundColor: 'hsl(var(--primary) / 0.15)',
                        borderRadius: 0
                      }
                    }}
                  />
                  
                  {/* Botão Aplicar */}
                  <div className="p-3 border-t bg-muted/30">
                    <Button
                      className="w-full"
                      size="sm"
                      disabled={!tempFilterFrom || !tempFilterTo}
                      onClick={applyFilterDateRange}
                    >
                      Aplicar Período
                    </Button>
                  </div>
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

      {/* Resumo do Período - Sempre visível com MTBF/MTTR integrados */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Resumo do Período</CardTitle>
              <CardDescription>
                {stats.total} reportes | {formatDurationHours(stats.stoppedMachineDowntime).display} parado | {stats.stoppedMachineCount} com máq. parada
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Linha 1: Métricas principais - Ordem: Tempo Operando, Máquina Parada, Total Reportes, Máquinas Afetadas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Tempo Operando */}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-600">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-emerald-700">Tempo Operando</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-emerald-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-center">
                        <p>Capacidade total de {stats.totalMachinesCount} máquinas no período de {stats.daysInPeriod} dia{stats.daysInPeriod > 1 ? 's' : ''}, subtraindo o tempo de parada.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {(() => {
                    const d = formatDurationHours(stats.totalOperatingTime)
                    return (
                      <>
                        <p className="text-xl font-extrabold text-emerald-700 leading-tight">{d.display}</p>
                        <p className="text-xs font-mono text-emerald-600">{d.hhmm}</p>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* 2. Máquina Parada */}
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-red-600">Máquina Parada</p>
                  {(() => {
                    const d = formatDurationHours(stats.stoppedMachineDowntime)
                    return (
                      <>
                        <p className="text-xl font-bold text-red-600 leading-tight">{d.display}</p>
                        <p className="text-xs font-mono text-red-500">{d.hhmm}</p>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* 3. Total Reportes */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary">
                  <Wrench className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Reportes</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                  <p className="text-[10px] text-muted-foreground">{stats.stoppedMachineCount} com máquina parada</p>
                </div>
              </div>
            </div>

            {/* 4. Máquinas Afetadas */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Máquinas Afetadas</p>
                  <p className="text-xl font-bold">{stats.uniqueMachines}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Linha 2: MTBF, MTTR e Disponibilidade Global */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* MTBF Global */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500 shadow-sm">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-blue-700">MTBF Global</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-blue-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="font-medium">Tempo Médio Entre Falhas</p>
                        <p className="text-xs mt-1">Tempo Operando / {globalMetrics.totalReportes} reportes</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{globalMetrics.mtbfGlobal.toFixed(1)}h</p>
                  <p className="text-[10px] text-blue-500">{globalMetrics.totalReportes} reportes</p>
                </div>
              </div>
            </div>

            {/* MTTR Global */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500 shadow-sm">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-orange-700">MTTR Global</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-orange-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="font-medium">Tempo Médio de Reparo</p>
                        <p className="text-xs mt-1">{globalMetrics.totalDowntime.toFixed(1)}h / {globalMetrics.totalReportes} reportes</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{globalMetrics.mttrGlobal.toFixed(1)}h</p>
                  <p className="text-[10px] text-orange-500">{globalMetrics.totalDowntime.toFixed(1)}h parado</p>
                </div>
              </div>
            </div>

            {/* Disponibilidade Global */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-green-700">Disponibilidade</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-green-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="font-medium">Disponibilidade Global</p>
                        <p className="text-xs mt-1">Tempo Operando / Capacidade Total</p>
                        <p className="text-xs">{globalMetrics.tempoOperandoTotal.toFixed(1)}h / {globalMetrics.capacidadeTotal.toFixed(1)}h</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold",
                    globalMetrics.disponibilidadeGlobal >= 95 ? "text-green-600" :
                    globalMetrics.disponibilidadeGlobal >= 85 ? "text-yellow-600" :
                    "text-red-600"
                  )}>
                    {globalMetrics.disponibilidadeGlobal.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-green-500">{globalMetrics.tempoOperandoTotal.toFixed(0)}h operando</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Alerta de Máquinas Críticas (paradas há mais de 48h) - Expansível */}
          {stats.criticalMachines && stats.criticalMachines.length > 0 && (
            <div className="mt-4">
              {!showCriticalMachines ? (
                // Botão colapsado - ícone pequeno
                <button
                  onClick={() => setShowCriticalMachines(true)}
                  className="relative p-1 rounded-full bg-red-100 border border-red-300 hover:bg-red-200 transition-colors animate-pulse"
                  title="Máquinas paradas há mais de 48h"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold text-white bg-red-600 rounded-full">
                    {stats.criticalMachines.length}
                  </span>
                </button>
              ) : (
                // Card expandido
                <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h4 className="font-bold text-red-700">ALERTA: Máquinas Paradas há mais de 48h</h4>
                    <Badge variant="destructive" className="ml-auto">{stats.criticalMachines.length}</Badge>
                    <button
                      onClick={() => setShowCriticalMachines(false)}
                      className="p-1 rounded hover:bg-red-200 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {stats.criticalMachines.slice(0, 5).map((m) => (
                      <div key={m.ticketId} className="flex items-center justify-between p-2 bg-white rounded-lg border border-red-200">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-red-700">{m.machineName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {m.status === 'open' ? 'Aberto' : m.status === 'in_progress' ? 'Em Andamento' : 'Pausado'}
                          </Badge>
                          {m.pauseReason && (
                            <span className="text-xs text-muted-foreground italic">({m.pauseReason})</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-red-600">{Math.floor(m.hoursDown)}h</span>
                          <span className="text-xs text-red-500 ml-1">parada</span>
                        </div>
                      </div>
                    ))}
                    {stats.criticalMachines.length > 5 && (
                      <p className="text-xs text-red-600 text-center">+ {stats.criticalMachines.length - 5} outras máquinas críticas</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
<TabsList className="grid w-full h-auto gap-1 p-1" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>
  <TabsTrigger value="metrics" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span className="hidden sm:inline">MTBF/MTTR</span>
  <span className="sm:hidden">MTBF</span>
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
  <TabsTrigger value="cancelled" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <X className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span className="hidden sm:inline">Cancelados</span>
  <span className="sm:hidden">Canc.</span>
  {stats.cancelledCount > 0 && (
    <span className="ml-1 px-1.5 py-0.5 text-[8px] bg-red-100 text-red-600 rounded-full">{stats.cancelledCount}</span>
  )}
  </TabsTrigger>
  <TabsTrigger value="general" className="text-[10px] sm:text-xs px-1 sm:px-2 py-2">
  <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
  <span>Geral</span>
  </TabsTrigger>
  </TabsList>

        {/* Tab Geral - Resumo Operacional */}
        <TabsContent value="general" className="mt-4 space-y-4">
          {/* Cards de Resumo */}
          {(() => {
            // Calcular métricas do período selecionado
            const completedInPeriod = (filteredTickets || []).filter(t => t.status === 'completed')
            const totalParadas = completedInPeriod.length
            const totalDowntimeSeconds = completedInPeriod.reduce((sum, t) => sum + (t.downtime || 0), 0)
            
            // Máquinas paradas AGORA (tickets abertos ou em andamento)
            const maquinasParadasAgora = (tickets || []).filter(t => 
              t.status === 'open' || t.status === 'in-progress' || t.status === 'paused'
            ).length
            
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-950">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Total de Paradas</p>
                        <p className="text-xl sm:text-2xl font-bold">{totalParadas}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">ocorrências solucionadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 sm:p-3 rounded-full bg-red-100 dark:bg-red-950">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Downtime Total</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-600">
                          {formatDurationHours(totalDowntimeSeconds).display}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">horas de máquina parada</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className={maquinasParadasAgora > 0 ? "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20" : ""}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 sm:p-3 rounded-full",
                        maquinasParadasAgora > 0 ? "bg-orange-200 dark:bg-orange-900" : "bg-green-100 dark:bg-green-950"
                      )}>
                        <AlertTriangle className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6",
                          maquinasParadasAgora > 0 ? "text-orange-600" : "text-green-600"
                        )} />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Status Atual</p>
                        <p className={cn(
                          "text-xl sm:text-2xl font-bold",
                          maquinasParadasAgora > 0 ? "text-orange-600" : "text-green-600"
                        )}>
                          {maquinasParadasAgora}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {maquinasParadasAgora === 0 ? "tudo operando" : maquinasParadasAgora === 1 ? "máquina parada agora" : "máquinas paradas agora"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
          
          {/* Feed de Ocorrências Solucionadas */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Ocorrências Solucionadas
                  </CardTitle>
                  <CardDescription>
                    {(() => {
                      const allCompleted = (filteredTickets || []).filter(t => t.status === 'completed')
                      const filtered = allCompleted.filter(t => {
                        if (!solvedSearchQuery.trim()) return true
                        const q = solvedSearchQuery.toLowerCase()
                        const machine = getMachineById(t.machineId)
                        const problem = getProblemById(t.problemId)
                        return (
                          machine?.name?.toLowerCase().includes(q) ||
                          (t.customProblemName || problem?.name || '').toLowerCase().includes(q) ||
                          t.createdByName?.toLowerCase().includes(q)
                        )
                      })
                      return solvedSearchQuery 
                        ? `${filtered.length} de ${allCompleted.length} manutenções encontradas`
                        : `${allCompleted.length} manutenções concluídas no período`
                    })()}
                  </CardDescription>
                </div>
                
                {/* Campo de Busca */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por máquina, problema..."
                    value={solvedSearchQuery}
                    onChange={(e) => {
                      setSolvedSearchQuery(e.target.value)
                      setShowAllSolved(false)
                    }}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Data</th>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Máquina</th>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden sm:table-cell">Problema</th>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden lg:table-cell">Solução</th>
                      <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden md:table-cell">Manutentor</th>
                      <th className="p-2 sm:p-3 text-right font-medium text-[10px] sm:text-xs text-red-600">Tempo Parado</th>
                      <th className="p-2 sm:p-3 text-center font-medium text-[10px] sm:text-xs w-10">Ver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      const allCompleted = (filteredTickets || [])
                        .filter(t => t.status === 'completed')
                        .filter(t => {
                          if (!solvedSearchQuery.trim()) return true
                          const q = solvedSearchQuery.toLowerCase()
                          const machine = getMachineById(t.machineId)
                          const problem = getProblemById(t.problemId)
                          return (
                            machine?.name?.toLowerCase().includes(q) ||
                            (t.customProblemName || problem?.name || '').toLowerCase().includes(q) ||
                            t.createdByName?.toLowerCase().includes(q)
                          )
                        })
                        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
                      
                      const displayedTickets = showAllSolved ? allCompleted : allCompleted.slice(0, INITIAL_SOLVED_COUNT)
                      
                      if (allCompleted.length === 0) {
                        return null
                      }
                      
                      return displayedTickets.map((ticket) => {
                        const machine = getMachineById(ticket.machineId)
                        const problem = getProblemById(ticket.problemId)
                        const downtimeSeconds = ticket.downtime || 0
                        
                        const actions = ticket?.actions || []
                        const completeAction = [...actions].reverse().find(a => a.type === 'complete')
                        const lastAction = actions.length > 0 ? actions[actions.length - 1] : null
                        const technicianName = completeAction?.operatorName || lastAction?.operatorName || ticket?.createdByName || '-'
                        
                        const solution = ticket.notes || completeAction?.reason || '-'
                        
                        return (
                          <tr 
                            key={ticket.id} 
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedSolvedTicket(ticket)}
                          >
                            <td className="p-2 sm:p-3 whitespace-nowrap text-[10px] sm:text-xs">
                              <div>
                                {format(new Date(ticket.completedAt || ticket.createdAt), 'dd/MM/yy', { locale: ptBR })}
                              </div>
                              <div className="text-muted-foreground">
                                {format(new Date(ticket.completedAt || ticket.createdAt), 'HH:mm', { locale: ptBR })}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-medium max-w-[100px] truncate">
                              {machine?.name || '-'}
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden sm:table-cell max-w-[120px] truncate">
                              {ticket.customProblemName || problem?.name || '-'}
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden lg:table-cell max-w-[150px] truncate text-muted-foreground">
                              {solution}
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden md:table-cell max-w-[100px] truncate">
                              {technicianName}
                            </td>
                            <td className="p-2 sm:p-3 text-right font-mono text-[10px] sm:text-xs text-red-600 font-semibold whitespace-nowrap">
                              {formatDurationHours(downtimeSeconds).display}
                            </td>
                            <td className="p-2 sm:p-3 text-center">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
                
                {/* Mensagem quando não há resultados */}
                {(() => {
                  const allCompleted = (filteredTickets || []).filter(t => t.status === 'completed')
                  const filtered = allCompleted.filter(t => {
                    if (!solvedSearchQuery.trim()) return true
                    const q = solvedSearchQuery.toLowerCase()
                    const machine = getMachineById(t.machineId)
                    const problem = getProblemById(t.problemId)
                    return (
                      machine?.name?.toLowerCase().includes(q) ||
                      (t.customProblemName || problem?.name || '').toLowerCase().includes(q) ||
                      t.createdByName?.toLowerCase().includes(q)
                    )
                  })
                  
                  if (allCompleted.length === 0) {
                    return (
                      <div className="p-8 text-center text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhuma ocorrência solucionada no período selecionado.</p>
                      </div>
                    )
                  }
                  
                  if (filtered.length === 0 && solvedSearchQuery) {
                    return (
                      <div className="p-8 text-center text-muted-foreground">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhuma ocorrência encontrada com este termo.</p>
                        <p className="text-xs mt-1">Tente buscar por outro termo.</p>
                      </div>
                    )
                  }
                  
                  // Botão Exibir Mais/Menos
                  if (allCompleted.length > INITIAL_SOLVED_COUNT) {
                    return (
                      <div className="p-3 border-t">
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground hover:text-foreground"
                          onClick={() => setShowAllSolved(!showAllSolved)}
                        >
                          {showAllSolved ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Exibir menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Exibir mais ({filtered.length - INITIAL_SOLVED_COUNT} restantes)
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  }
                  
                  return null
                })()}
              </div>
            </CardContent>
          </Card>
          
          {/* Sheet de Detalhes da Ocorrência Solucionada */}
          <Sheet open={!!selectedSolvedTicket} onOpenChange={() => setSelectedSolvedTicket(null)}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              {selectedSolvedTicket && (() => {
                const ticket = selectedSolvedTicket
                const machine = getMachineById(ticket.machineId)
                const problem = getProblemById(ticket.problemId)
                const downtimeSeconds = ticket.downtime || 0
                const priorityConfig = PRIORITY_CONFIG[ticket.priority]
                
                const actions = ticket?.actions || []
                const completeAction = [...actions].reverse().find(a => a.type === 'complete')
                const technicianName = completeAction?.operatorName || ticket?.createdByName || '-'
                
                return (
                  <>
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Detalhes da Ocorrência
                      </SheetTitle>
                      <SheetDescription>
                        Concluída em {format(new Date(ticket.completedAt || ticket.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-6 mt-6">
                      {/* Informações da Máquina */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Máquina
                        </h4>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="font-semibold">{machine?.name || '-'}</p>
                          <p className="text-sm text-muted-foreground">{machine?.sector || '-'}</p>
                          {machine?.manufacturer && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {machine.manufacturer} {machine.model && `- ${machine.model}`}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Problema */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Problema Reportado</h4>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="font-medium">{ticket.customProblemName || problem?.name || '-'}</p>
                          {ticket.observation && (
                            <p className="text-sm text-muted-foreground mt-2">{ticket.observation}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge className={cn("text-xs", priorityConfig.bgLight, priorityConfig.textColor)}>
                              {priorityConfig.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Dados da Operação */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Dados da Operação
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-muted/50 border">
                            <p className="text-xs text-muted-foreground">Criado em</p>
                            <p className="text-sm font-medium">
                              {format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(ticket.createdAt), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-xs text-green-600">Concluído em</p>
                            <p className="text-sm font-medium text-green-700">
                              {format(new Date(ticket.completedAt || ticket.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-green-600">
                              {format(new Date(ticket.completedAt || ticket.createdAt), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                            <p className="text-xs text-red-600">Tempo Parado</p>
                            <p className="text-sm font-bold text-red-700">
                              {formatDurationHours(downtimeSeconds).display}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-xs text-blue-600">Tempo de Reparo</p>
                            <p className="text-sm font-bold text-blue-700">
                              {formatDuration(ticket.accumulatedTime || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Responsáveis */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Responsáveis
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                            <div>
                              <p className="text-xs text-muted-foreground">Reportado por</p>
                              <p className="text-sm font-medium">{ticket.createdByName || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                            <div>
                              <p className="text-xs text-green-600">Finalizado por</p>
                              <p className="text-sm font-medium text-green-700">{technicianName}</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Notas de Conclusão */}
                      {ticket.notes && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Observações da Conclusão</h4>
                          <div className="p-3 rounded-lg bg-muted/50 border">
                            <p className="text-sm">{ticket.notes}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Histórico de Ações */}
                      {actions.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Histórico de Ações
                          </h4>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {actions.map((action, index) => {
                              const actionLabels: Record<string, string> = {
                                start: 'Iniciou manutenção',
                                pause: 'Pausou manutenção',
                                resume: 'Retomou manutenção',
                                complete: 'Finalizou manutenção',
                              }
                              const actionColors: Record<string, string> = {
                                start: 'bg-green-500',
                                pause: 'bg-yellow-500',
                                resume: 'bg-blue-500',
                                complete: 'bg-green-600',
                              }
                              return (
                                <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                                  <div className={cn("w-2 h-2 rounded-full mt-1.5", actionColors[action.type] || 'bg-gray-400')} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium">{actionLabels[action.type] || action.type}</p>
                                    <p className="text-xs text-muted-foreground">{action.operatorName}</p>
                                    {action.reason && <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {format(new Date(action.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Peças Utilizadas */}
                      {ticket.usedParts && ticket.usedParts.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Peças Utilizadas
                          </h4>
                          <div className="space-y-1">
                            {ticket.usedParts.map((up, index) => {
                              const part = parts.find(p => p.id === up.partId)
                              return (
                                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                  <span className="text-sm">{part?.name || 'Peça não encontrada'}</span>
                                  <Badge variant="secondary">{up.quantity}x</Badge>
                                </div>
                              )
                            })}
                          </div>
                          {ticket.totalCost > 0 && (
                            <div className="flex items-center justify-between p-2 border-t mt-2">
                              <span className="text-sm font-medium">Custo Total</span>
                              <span className="text-sm font-bold text-green-600">
                                {formatCurrency(ticket.totalCost)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <SheetFooter className="mt-6">
                      <SheetClose asChild>
                        <Button variant="outline" className="w-full">Fechar</Button>
                      </SheetClose>
                    </SheetFooter>
                  </>
                )
              })()}
            </SheetContent>
          </Sheet>
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
                  <div 
                    key={m.machineId} 
                    className="p-4 hover:bg-primary/10 cursor-pointer transition-colors"
                    onClick={() => openMachineHistory(m.machineId, m.machineName)}
                  >
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
                          const d = formatDurationHours(m.stoppedTime)
                          return (
                            <>
                              <p className="font-bold text-red-600 font-mono leading-tight">{d.display}</p>
                              <p className="text-xs text-red-500 font-mono">{d.hhmm}</p>
                            </>
                          )
                        })()}
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Operando</p>
                        {(() => {
                          const d = formatDurationHours(m.operatingTime)
                          return (
                            <>
                              <p className="font-medium text-orange-600 font-mono leading-tight">{d.display}</p>
                              <p className="text-xs text-orange-500 font-mono">{d.hhmm}</p>
                            </>
                          )
                        })()}
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
          
          {/* Sheet de Histórico da Máquina - Aba Máquinas */}
          <Sheet open={machineHistoryOpen} onOpenChange={setMachineHistoryOpen}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Histórico de Manutenções
                </SheetTitle>
                <SheetDescription className="text-base font-semibold text-foreground">
                  {selectedMachineName || 'Máquina'}
                </SheetDescription>
                {filters.dateRange?.from && filters.dateRange?.to && (
                  <p className="text-xs text-muted-foreground">
                    Período: {format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto py-4">
                {/* Estado de Loading */}
                {loadingMachineHistory && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Carregando...</span>
                  </div>
                )}
                
                {/* Lista vazia */}
                {!loadingMachineHistory && (machineHistoryTickets || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Nenhum chamado encontrado para esta máquina no período selecionado.</p>
                  </div>
                )}
                
                {/* Lista de chamados */}
                {!loadingMachineHistory && (machineHistoryTickets || []).length > 0 && (
                  <div className="space-y-3">
                    {(machineHistoryTickets || []).map((ticket) => {
                      const problem = ticket?.problemId ? getProblemById(ticket.problemId) : null
                      const isCompleted = ticket?.status === 'completed'
                      const isCancelled = ticket?.status === 'cancelled'
                      const isActive = !isCompleted && !isCancelled && ticket?.machineStopped === true
                      
                      // CÁLCULO CORRETO INDUSTRIAL (Machine Downtime Real)
                      // Tempo de parada da produção = created_at até completed_at (ou agora se ainda aberto)
                      let downtimeSeconds = 0
                      
                      if (ticket?.machineStopped) {
                        const startTime = ticket?.createdAt ? new Date(ticket.createdAt).getTime() : 0
                        
                        if (isCompleted && ticket?.completedAt && startTime > 0) {
                          // Máquina parou e já foi consertada (Tempo total da falha)
                          const endTime = new Date(ticket.completedAt).getTime()
                          downtimeSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000))
                          
                        } else if (isActive && startTime > 0) {
                          // Máquina está parada AGORA (Tempo desde a quebra até agora)
                          const nowTime = new Date().getTime()
                          downtimeSeconds = Math.max(0, Math.floor((nowTime - startTime) / 1000))
                        }
                      }
                      
                      const hasDowntime = downtimeSeconds > 0
                      
                      // Buscar técnico: prioriza quem finalizou, depois último operador, depois quem criou
                      const actions = ticket?.actions || []
                      const completeAction = [...actions].reverse().find(a => a.type === 'complete')
                      const lastAction = actions.length > 0 ? actions[actions.length - 1] : null
                      const technicianName = completeAction?.operatorName 
                        || lastAction?.operatorName 
                        || ticket?.createdByName 
                        || 'N/A'
                      
                      return (
                        <div
                          key={ticket?.id || Math.random()}
                          className={cn(
                            "border rounded-lg p-4 transition-colors",
                            isCompleted 
                              ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                              : hasDowntime
                                ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                                : "border-border bg-card"
                          )}
                        >
                          {/* Data e Status */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {ticket?.createdAt ? format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}
                              </span>
                            </div>
                            <Badge 
                              variant={isCompleted ? "default" : "secondary"}
                              className={cn(
                                "text-xs",
                                isCompleted && "bg-green-600 hover:bg-green-700"
                              )}
                            >
                              {isCompleted ? "Concluído" : ticket?.status === 'cancelled' ? "Cancelado" : "Aberto"}
                            </Badge>
                          </div>
                          
                          {/* Problema */}
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs">
                              {problem?.name || ticket?.customProblemName || 'Problema não especificado'}
                            </Badge>
                          </div>
                          
                          {/* Técnico */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <User className="w-4 h-4" />
                            <span>Técnico:</span>
                            <span className="font-medium text-foreground">
                              {technicianName}
                            </span>
                          </div>
                          
                          {/* Downtime */}
                          {hasDowntime && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className={cn("w-4 h-4", isActive ? "text-orange-500 animate-pulse" : "text-red-500")} />
                              <span className={cn("font-medium", isActive ? "text-orange-600" : "text-red-600")}>
                                Downtime: {formatDurationHours(downtimeSeconds).display}
                                {isActive && <span className="ml-1 text-xs">(ativo)</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer com botão Fechar */}
              <SheetFooter className="border-t pt-4 mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={closeMachineHistory}
                >
                  <X className="w-4 h-4 mr-2" />
                  Fechar
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
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
                          const d = formatDurationHours(u.operatingTime)
                          return (
                            <>
                              <p className="font-medium text-orange-600 font-mono leading-tight">{d.display}</p>
                              <p className="text-xs text-orange-500 font-mono">{d.hhmm}</p>
                            </>
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

  {/* Tab Cancelados/Rejeitados */}
  <TabsContent value="cancelled" className="mt-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <X className="w-5 h-5 text-red-500" />
          Chamados Cancelados/Rejeitados
        </CardTitle>
        <CardDescription>
          {cancelledTickets.length} chamados cancelados ou rejeitados no período. 
          <span className="text-amber-600 font-medium ml-1">Estes chamados NÃO afetam os cálculos de MTBF, MTTR e Disponibilidade.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {cancelledTickets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <X className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum chamado cancelado no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Data</th>
                  <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Máquina</th>
                  <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden sm:table-cell">Problema</th>
                  <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Cancelado por</th>
                  <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs hidden md:table-cell">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cancelledTickets.map(ticket => {
                  const machine = getMachineById(ticket.machineId)
                  const problem = getProblemById(ticket.problemId)
                  const cancelDate = ticket.cancelledAt ? new Date(ticket.cancelledAt) : new Date(ticket.createdAt)
                  return (
                    <tr key={ticket.id} className="hover:bg-muted/50">
                      <td className="p-2 sm:p-3">
                        <div className="text-[10px] sm:text-xs">
                          {cancelDate.toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                          {cancelDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 font-medium">{machine?.name || 'N/A'}</td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell text-muted-foreground">{problem?.name || 'N/A'}</td>
                      <td className="p-2 sm:p-3">
                        <span className="text-red-600">{ticket.cancelledByName || 'Sistema'}</span>
                      </td>
                      <td className="p-2 sm:p-3 hidden md:table-cell">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">
                          {ticket.cancellationReason || 'Não informado'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  </TabsContent>
  
  {/* Tab Cancelados/Rejeitados */}
  <TabsContent value="cancelled" className="mt-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <X className="w-5 h-5 text-red-500" />
          Chamados Cancelados/Rejeitados
        </CardTitle>
        <CardDescription>
          {cancelledTickets.length} chamados cancelados ou rejeitados no período. 
          <span className="text-amber-600 font-medium ml-1">Estes chamados NÃO afetam os cálculos de MTBF, MTTR e Disponibilidade.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {cancelledTickets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <X className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum chamado cancelado no período selecionado.</p>
          </div>
        ) : (
          <>
            {/* Mobile: Lista de Cards */}
            <div className="md:hidden p-3 space-y-3">
              {cancelledTickets.map(ticket => {
                const machine = getMachineById(ticket.machineId)
                const problem = getProblemById(ticket.problemId)
                const cancelDate = ticket.cancelledAt ? new Date(ticket.cancelledAt) : new Date(ticket.createdAt)
                return (
                  <div key={ticket.id} className="border rounded-lg p-4 bg-card shadow-sm">
                    {/* Cabeçalho: Data e Máquina */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {cancelDate.toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cancelDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-semibold text-sm">{machine?.name || 'N/A'}</span>
                    </div>
                    
                    {/* Badge do Problema */}
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {problem?.name || ticket.customProblemName || 'N/A'}
                      </Badge>
                    </div>
                    
                    {/* Quem cancelou */}
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <span className="text-muted-foreground">Cancelado por:</span>
                      <span className="text-red-600 font-medium">{ticket.cancelledByName || 'Sistema'}</span>
                    </div>
                    
                    {/* Motivo do Cancelamento - Destaque Principal */}
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md p-3">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                        Motivo do Cancelamento
                      </p>
                      <p className="text-sm text-red-900 dark:text-red-200">
                        {ticket.cancellationReason || 'Não informado'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: Tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Data</th>
                    <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Máquina</th>
                    <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Problema</th>
                    <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Cancelado por</th>
                    <th className="p-2 sm:p-3 text-left font-medium text-[10px] sm:text-xs">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cancelledTickets.map(ticket => {
                    const machine = getMachineById(ticket.machineId)
                    const problem = getProblemById(ticket.problemId)
                    const cancelDate = ticket.cancelledAt ? new Date(ticket.cancelledAt) : new Date(ticket.createdAt)
                    return (
                      <tr key={ticket.id} className="hover:bg-muted/50">
                        <td className="p-2 sm:p-3">
                          <div className="text-[10px] sm:text-xs">
                            {cancelDate.toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                            {cancelDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 font-medium">{machine?.name || 'N/A'}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{problem?.name || 'N/A'}</td>
                        <td className="p-2 sm:p-3">
                          <span className="text-red-600">{ticket.cancelledByName || 'Sistema'}</span>
                        </td>
                        <td className="p-2 sm:p-3">
                          <span className="text-muted-foreground text-[10px] sm:text-xs">
                            {ticket.cancellationReason || 'Não informado'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  </TabsContent>
  
  {/* Tab MTBF/MTTR */}
  <TabsContent value="metrics" className="mt-4 space-y-4">
          {/* Filtro de Data e Controles */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* DateRangePicker */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Período:</span>
                  </div>
                  <Popover open={metricsCalendarOpen} onOpenChange={handleMetricsCalendarOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[280px] justify-start text-left font-normal",
                          !metricsDateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {metricsDateRange?.from ? (
                          metricsDateRange.to ? (
                            <>
                              {format(metricsDateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                              {format(metricsDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                            </>
                          ) : (
                            format(metricsDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                          )
                        ) : (
                          <span>Selecionar período</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {/* Instruções de uso */}
                      <div className="p-3 bg-muted/50 border-b text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Como selecionar:</p>
                        <p>1º clique = Data inicial | 2º clique = Data final</p>
                      </div>
                      
                      {/* Indicador de seleção atual */}
                      <div className="p-3 border-b flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "px-3 py-1.5 rounded text-sm font-medium border-2",
                            tempMetricsFrom 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted text-muted-foreground border-dashed border-muted-foreground/30"
                          )}>
                            {tempMetricsFrom ? format(tempMetricsFrom, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                          </div>
                          <span className="text-muted-foreground">até</span>
                          <div className={cn(
                            "px-3 py-1.5 rounded text-sm font-medium border-2",
                            tempMetricsTo 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted text-muted-foreground border-dashed border-muted-foreground/30"
                          )}>
                            {tempMetricsTo ? format(tempMetricsTo, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                          </div>
                        </div>
                        {metricsClickCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setTempMetricsFrom(undefined)
                              setTempMetricsTo(undefined)
                              setMetricsClickCount(0)
                            }}
                          >
                            Limpar
                          </Button>
                        )}
                      </div>
                      
                      {/* Calendário único com navegação */}
                      <Calendar
                        mode="single"
                        month={metricsCalendarMonth}
                        onMonthChange={setMetricsCalendarMonth}
                        selected={undefined}
                        onSelect={handleMetricsDateClick}
                        locale={ptBR}
                        className="p-3"
                        modifiers={{
                          selected: (date) => {
                            if (tempMetricsFrom && date.toDateString() === tempMetricsFrom.toDateString()) return true
                            if (tempMetricsTo && date.toDateString() === tempMetricsTo.toDateString()) return true
                            return false
                          },
                          range: (date) => {
                            if (tempMetricsFrom && tempMetricsTo) {
                              return date > tempMetricsFrom && date < tempMetricsTo
                            }
                            return false
                          }
                        }}
                        modifiersStyles={{
                          selected: { 
                            backgroundColor: 'hsl(var(--primary))', 
                            color: 'hsl(var(--primary-foreground))',
                            fontWeight: 'bold'
                          },
                          range: { 
                            backgroundColor: 'hsl(var(--primary) / 0.15)',
                            borderRadius: 0
                          }
                        }}
                      />
                      
                      {/* Atalhos rápidos */}
                      <div className="p-3 border-t flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTempMetricsFrom(startOfMonth(new Date()))
                            setTempMetricsTo(endOfMonth(new Date()))
                            setMetricsClickCount(2)
                          }}
                        >
                          Mês Atual
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const lastMonth = new Date()
                            lastMonth.setMonth(lastMonth.getMonth() - 1)
                            setTempMetricsFrom(startOfMonth(lastMonth))
                            setTempMetricsTo(endOfMonth(lastMonth))
                            setMetricsClickCount(2)
                            setMetricsCalendarMonth(lastMonth)
                          }}
                        >
                          Mês Anterior
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTempMetricsFrom(subDays(new Date(), 7))
                            setTempMetricsTo(new Date())
                            setMetricsClickCount(2)
                          }}
                        >
                          Últimos 7 dias
                        </Button>
                      </div>
                      
                      {/* Botão Aplicar */}
                      <div className="p-3 border-t bg-muted/30">
                        <Button
                          className="w-full"
                          disabled={!tempMetricsFrom || !tempMetricsTo}
                          onClick={applyMetricsDateRange}
                        >
                          Aplicar Período
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Indicador de horas proporcionais */}
                  {metricsDateRange?.from && metricsDateRange?.to && monthlyHours > 0 && (
                    <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      <span className="font-medium">Capacidade proporcional:</span>{" "}
                      {proportionalHours.toFixed(1)}h ({differenceInDays(metricsDateRange.to, metricsDateRange.from) + 1} dias)
                    </div>
                  )}
                </div>
                
                {/* Botão PDF e checkbox */}
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={metricsIncludePaused}
                      onChange={(e) => setMetricsIncludePaused(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="hidden sm:inline">Incluir pausados no PDF</span>
                    <span className="sm:hidden">Pausados</span>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGeneratePDF()}
                    className="gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Gerar PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Configurações Globais - Apenas Admin - Colapsável */}
          {isAdmin && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader 
                className="pb-2 cursor-pointer hover:bg-blue-100/50 transition-colors rounded-t-lg"
                onClick={() => setShowConfigSection(!showConfigSection)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-600" />
                    <div>
                      <CardTitle className="text-blue-900">Configurações Globais</CardTitle>
                      <CardDescription className="text-blue-700/70">
                        Configurações que afetam os cálculos de todo o sistema
                        {monthlyHours > 0 && <span className="ml-2 text-green-600">({monthlyHours}h/mês)</span>}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {showConfigSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showConfigSection && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Capacidade Mensal da Fábrica (Horas)
                    </label>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Total de horas que a empresa opera por mês. Este valor é o denominador para calcular MTBF, MTTR e Disponibilidade.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={tempMonthlyHours}
                        onChange={(e) => setTempMonthlyHours(e.target.value)}
                        className="h-9 text-sm flex-1 bg-background max-w-xs"
                        placeholder="Ex: 720 (24h x 30 dias)"
                        min={0}
                      />
                      <Button 
                        size="sm" 
                        className="h-9 gap-2 min-w-[140px]" 
                        onClick={saveMonthlyHours}
                        disabled={savingHours}
                      >
                        {savingHours ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Aplicando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Aplicar às Métricas
                          </>
                        )}
                      </Button>
                    </div>
                    {monthlyHours > 0 && (
                      <p className="text-[10px] text-green-600 mt-1.5">
                        Valor atual: <strong>{monthlyHours}h/mês</strong>
                      </p>
                    )}
                    {monthlyHours === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1.5">
                        Nenhum valor configurado. Configure para ativar os cálculos de disponibilidade.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              )}
            </Card>
          )}

          {/* Aviso quando horas não configuradas - para não-admins */}
          {!isAdmin && monthlyHours === 0 && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <strong>Atenção:</strong> As horas de operação mensal não estão configuradas. 
              Solicite ao administrador para configurar.
            </div>
          )}

          {/* Detalhamento por Máquina - Expansível (Accordion) */}
          <Card>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="machine-details" className="border-0">
                <CardHeader className="pb-0">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="flex flex-col items-start gap-1 text-left">
                      <CardTitle className="text-base">Ver Detalhamento por Máquina</CardTitle>
                      <CardDescription className="text-xs">
                        Análise com downtime em tempo real - {correctedMachineMetrics.length} máquinas
                      </CardDescription>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2 items-center mb-4">
                      {/* Busca por máquina */}
                      <input
                        type="text"
                        placeholder="Buscar máquina..."
                        className="h-8 px-2 text-xs border rounded-md w-[150px] bg-background"
                        value={metricsSearchMachine}
                        onChange={(e) => setMetricsSearchMachine(e.target.value)}
                      />
                      {/* Botão recarregar */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => loadViewMetrics()}
                        disabled={loadingMetrics}
                      >
                        {loadingMetrics ? 'Carregando...' : 'Atualizar'}
                      </Button>
                    </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium">Máquina</th>
                      <th className="p-3 text-center font-medium">Status Atual</th>
                      <th className="p-3 text-center font-medium">Falhas</th>
                      <th className="p-3 text-center font-medium">Downtime (h)</th>
                      <th className="p-3 text-center font-medium text-blue-600">MTBF (h)</th>
                      <th className="p-3 text-center font-medium text-orange-600">MTTR (h)</th>
                      <th className="p-3 text-center font-medium text-green-600">Disponib.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingMetrics ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Carregando métricas...
                        </td>
                      </tr>
                    ) : metricsError ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-red-500">
                          Erro ao carregar: {metricsError}
                        </td>
                      </tr>
                    ) : (() => {
                      // Filtrar máquinas pela busca usando métricas corrigidas com live downtime
                      const filteredMetrics = correctedMachineMetrics.filter(m => 
                        metricsSearchMachine === '' || 
                        m.machine_name.toLowerCase().includes(metricsSearchMachine.toLowerCase())
                      )
                      
                      if (filteredMetrics.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              Nenhuma máquina encontrada com o filtro atual.
                            </td>
                          </tr>
                        )
                      }
                      
                      // Dados já ordenados por disponibilidade (menor para maior)
                      return filteredMetrics.map(m => {
                        const isCritical = m.hasActiveTicket && m.liveDowntimeHoras >= 48
                        
                        return (
                        <tr 
                          key={m.machine_id} 
                          className={cn(
                            "hover:bg-primary/10 cursor-pointer transition-colors",
                            isCritical && "animate-pulse bg-red-50"
                          )}
                          onClick={() => openMachineHistory(m.machine_id, m.machine_name)}
                        >
                          <td className={cn("p-3 font-medium hover:underline", isCritical ? "text-red-600" : "text-primary")}>
                            {m.machine_name}
                            {isCritical && <AlertTriangle className="inline w-4 h-4 ml-1 text-red-500" />}
                          </td>
                          <td className="p-3 text-center">
                            {m.hasActiveTicket ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge 
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    m.activeTicketStatus === 'open' ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                                    m.activeTicketStatus === 'in_progress' ? "bg-blue-50 text-blue-700 border-blue-300" :
                                    "bg-orange-50 text-orange-700 border-orange-300"
                                  )}
                                >
                                  {m.activeTicketStatus === 'open' ? 'Aberto' : 
                                   m.activeTicketStatus === 'in_progress' ? 'Em Andamento' : 
                                   'Pausado'}
                                </Badge>
                                {m.activeTicketPauseReason && (
                                  <span className="text-[9px] text-muted-foreground max-w-[100px] truncate" title={m.activeTicketPauseReason}>
                                    {m.activeTicketPauseReason}
                                  </span>
                                )}
                                <span className="text-[9px] text-red-500 font-medium">
                                  {m.liveDowntimeHoras.toFixed(0)}h ativo
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300">
                                Operando
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">{m.total_falhas}</td>
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {m.downtime_horas.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-mono text-blue-600 font-semibold">
                            {m.total_falhas === 0 ? (m.capacidadePeriodo > 0 ? m.capacidadePeriodo.toFixed(1) : '-') : m.mtbf.toFixed(1)}
                          </td>
                          <td className="p-3 text-center font-mono text-orange-600 font-semibold">
                            {m.total_falhas === 0 ? '0.00' : m.mttr.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "font-mono",
                                m.disponibilidade >= 95 ? "bg-green-50 text-green-700 border-green-300" :
                                m.disponibilidade >= 85 ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                                "bg-red-50 text-red-700 border-red-300"
                              )}
                            >
                              {m.disponibilidade.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      )})
                    })()}
                  </tbody>
                </table>
                {viewMetrics.length === 0 && !loadingMetrics && !metricsError && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma máquina cadastrada ou View não disponível.
                  </div>
                )}
              </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Explicação dos indicadores - Movido para o final */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Indicadores de Manutenção
              </CardTitle>
              <CardDescription>
                Métricas de confiabilidade e eficiência baseadas na operação das máquinas
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
          
          {/* Sheet de Histórico da Máquina */}
          <Sheet open={machineHistoryOpen} onOpenChange={setMachineHistoryOpen}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Histórico de Manutenções
                </SheetTitle>
                <SheetDescription className="text-base font-semibold text-foreground">
                  {selectedMachineName || 'Máquina'}
                </SheetDescription>
                {metricsDateRange?.from && metricsDateRange?.to && (
                  <p className="text-xs text-muted-foreground">
                    Período: {format(metricsDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(metricsDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto py-4">
                {/* Estado de Loading */}
                {loadingMachineHistory && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Carregando...</span>
                  </div>
                )}
                
                {/* Lista vazia */}
                {!loadingMachineHistory && (machineHistoryTickets || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Nenhum chamado encontrado para esta máquina no período selecionado.</p>
                  </div>
                )}
                
                {/* Lista de chamados */}
                {!loadingMachineHistory && (machineHistoryTickets || []).length > 0 && (
                  <div className="space-y-3">
                    {(machineHistoryTickets || []).map((ticket) => {
                      // Buscar dados com segurança
                      const problem = ticket?.problemId ? getProblemById(ticket.problemId) : null
                      const isCompleted = ticket?.status === 'completed'
                      const isCancelled = ticket?.status === 'cancelled'
                      const isActive = !isCompleted && !isCancelled && ticket?.machineStopped === true
                      
                      // CÁLCULO CORRETO INDUSTRIAL (Machine Downtime Real)
                      // Tempo de parada da produção = created_at até completed_at (ou agora se ainda aberto)
                      let downtimeSeconds = 0
                      
                      if (ticket?.machineStopped) {
                        const startTime = ticket?.createdAt ? new Date(ticket.createdAt).getTime() : 0
                        
                        if (isCompleted && ticket?.completedAt && startTime > 0) {
                          // Máquina parou e já foi consertada (Tempo total da falha)
                          const endTime = new Date(ticket.completedAt).getTime()
                          downtimeSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000))
                          
                        } else if (isActive && startTime > 0) {
                          // Máquina está parada AGORA (Tempo desde a quebra até agora)
                          const nowTime = new Date().getTime()
                          downtimeSeconds = Math.max(0, Math.floor((nowTime - startTime) / 1000))
                        }
                      }
                      
                      const hasDowntime = downtimeSeconds > 0
                      
                      // Buscar técnico: prioriza quem finalizou, depois último operador, depois quem criou
                      const actions = ticket?.actions || []
                      const completeAction = [...actions].reverse().find(a => a.type === 'complete')
                      const lastAction = actions.length > 0 ? actions[actions.length - 1] : null
                      const technicianName = completeAction?.operatorName 
                        || lastAction?.operatorName 
                        || ticket?.createdByName 
                        || 'N/A'
                      
                      return (
                        <div
                          key={ticket?.id || Math.random()}
                          className={cn(
                            "border rounded-lg p-4 transition-colors",
                            isCompleted 
                              ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                              : hasDowntime
                                ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                                : "border-border bg-card"
                          )}
                        >
                          {/* Data e Status */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {ticket?.createdAt ? format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}
                              </span>
                            </div>
                            <Badge 
                              variant={isCompleted ? "default" : "secondary"}
                              className={cn(
                                "text-xs",
                                isCompleted && "bg-green-600 hover:bg-green-700"
                              )}
                            >
                              {isCompleted ? "Concluído" : ticket?.status === 'cancelled' ? "Cancelado" : "Aberto"}
                            </Badge>
                          </div>
                          
                          {/* Problema */}
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs">
                              {problem?.name || ticket?.customProblemName || 'Problema não especificado'}
                            </Badge>
                          </div>
                          
                          {/* Técnico */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <User className="w-4 h-4" />
                            <span>Técnico:</span>
                            <span className="font-medium text-foreground">
                              {technicianName}
                            </span>
                          </div>
                          
                          {/* Downtime */}
                          {hasDowntime && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className={cn("w-4 h-4", isActive ? "text-orange-500 animate-pulse" : "text-red-500")} />
                              <span className={cn("font-medium", isActive ? "text-orange-600" : "text-red-600")}>
                                Downtime: {formatDurationHours(downtimeSeconds).display}
                                {isActive && <span className="ml-1 text-xs">(ativo)</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer com botão Fechar */}
              <SheetFooter className="border-t pt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={closeMachineHistory}
                >
                  <X className="w-4 h-4 mr-2" />
                  Fechar
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>
      </Tabs>
    </div>
  )
}
