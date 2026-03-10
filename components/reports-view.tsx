'use client'

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
import { formatDuration, formatCurrency, PRIORITY_CONFIG, type AuditLog } from '@/lib/types'
import { 
  FileText, 
  Clock, 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  Download,
  Calendar as CalendarIcon,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  X,
  Package,
  Settings,
  History,
  Printer,
  Shield,
  CalendarDays
} from 'lucide-react'
import { format, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

type ReportType = 'general' | 'machines' | 'users' | 'parts' | 'audit' | 'daily'
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
  data: Array<Record<string, string | number | boolean | undefined>>,
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right' }[],
  summary?: { label: string; value: string }[]
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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A4;
          margin: 15mm 10mm;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #1a1a1a;
          background: white;
        }
        
        .page {
          max-width: 100%;
          margin: 0 auto;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 15px;
          border-bottom: 2px solid #1a1a1a;
          margin-bottom: 20px;
        }
        
        .header-left h1 {
          font-size: 18pt;
          font-weight: bold;
          color: #1a1a1a;
          margin-bottom: 4px;
        }
        
        .header-left p {
          font-size: 9pt;
          color: #666;
        }
        
        .header-right {
          text-align: right;
          font-size: 8pt;
          color: #666;
        }
        
        .header-right .brand {
          font-size: 12pt;
          font-weight: bold;
          color: #1a1a1a;
        }
        
        .subtitle {
          font-size: 11pt;
          color: #444;
          margin-bottom: 20px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        
        .summary {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .summary-item {
          flex: 1;
          min-width: 120px;
          padding: 10px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }
        
        .summary-item .label {
          font-size: 8pt;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-item .value {
          font-size: 14pt;
          font-weight: bold;
          color: #1a1a1a;
          margin-top: 4px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9pt;
        }
        
        th {
          background: #1a1a1a;
          color: white;
          padding: 10px 8px;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 8pt;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 8px;
          border-bottom: 1px solid #e0e0e0;
          vertical-align: top;
        }
        
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        tr:hover {
          background: #f0f0f0;
        }
        
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          color: #1a1a1a;
          margin: 25px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #ddd;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 8pt;
          color: #666;
          display: flex;
          justify-content: space-between;
        }
        
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 8pt;
          font-weight: 500;
        }
        
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
        
        .text-muted { color: #666; }
        .text-success { color: #28a745; }
        .text-danger { color: #dc3545; }
        .text-warning { color: #ffc107; }
        
        .machine-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .machine-header {
          background: #f0f0f0;
          padding: 12px;
          margin-bottom: 10px;
          border-radius: 4px;
          border-left: 4px solid #1a1a1a;
        }
        
        .machine-header h3 {
          font-size: 11pt;
          margin-bottom: 4px;
        }
        
        .machine-header p {
          font-size: 9pt;
          color: #666;
        }
        
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .page { page-break-after: auto; }
          .machine-section { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-left">
            <h1>${title}</h1>
            <p>Relatorio gerado automaticamente pelo sistema</p>
          </div>
          <div class="header-right">
            <div class="brand">TMS ONE</div>
            <div>Tool Manager System</div>
            <div style="margin-top: 8px;">${currentDate}</div>
          </div>
        </div>
        
        <div class="subtitle">${subtitle}</div>
        
        ${summary ? `
          <div class="summary">
            ${summary.map(s => `
              <div class="summary-item">
                <div class="label">${s.label}</div>
                <div class="value">${s.value}</div>
              </div>
            `).join('')}
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
        ` : '<p style="text-align: center; padding: 40px; color: #666;">Nenhum dado encontrado para os filtros selecionados.</p>'}
        
        <div class="footer">
          <div>TMS ONE - Tool Manager System | Todos os direitos reservados</div>
          <div>Pagina 1</div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

// Funcao para gerar PDF diario completo (TISAX)
function generateDailyPDF(
  date: Date,
  data: {
    ticketsCreated: Array<{ time: string; machine: string; problem: string; priority: string; createdBy: string }>
    ticketsStarted: Array<{ time: string; machine: string; operator: string }>
    ticketsPaused: Array<{ time: string; machine: string; operator: string; reason: string }>
    ticketsCompleted: Array<{ time: string; machine: string; operator: string; resolved: boolean; duration: string; cost: string; parts: string }>
    machineChanges: Array<{ time: string; machine: string; action: string; user: string; details: string }>
    partChanges: Array<{ time: string; part: string; action: string; user: string; oldPrice?: string; newPrice?: string }>
    problemChanges: Array<{ time: string; problem: string; action: string; user: string }>
    userChanges: Array<{ time: string; targetUser: string; action: string; user: string }>
    scheduledChanges: Array<{ time: string; maintenance: string; action: string; user: string }>
    allLogs: Array<{ time: string; user: string; action: string; entity: string; details: string }>
  },
  summary: {
    totalTicketsCreated: number
    totalTicketsCompleted: number
    totalDowntime: string
    totalCost: string
    totalLogs: number
  }
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups para gerar o PDF')
    return
  }

  const formattedDate = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const currentDateTime = format(new Date(), "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR })

  const renderSection = (title: string, rows: string[][], headers: string[]) => {
    if (rows.length === 0) return `<p style="color: #666; padding: 10px 0;">Nenhum registro</p>`
    return `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatorio Diario TISAX - ${formattedDate} - TMS ONE</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 12mm 10mm; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 9pt;
          line-height: 1.3;
          color: #1a1a1a;
        }
        .header {
          display: flex;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 3px solid #1a1a1a;
          margin-bottom: 15px;
        }
        .header-left h1 { font-size: 16pt; margin-bottom: 2px; }
        .header-left .subtitle { font-size: 10pt; color: #444; }
        .header-left .tisax { 
          font-size: 8pt; 
          color: #0066cc; 
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .header-right { text-align: right; font-size: 8pt; color: #666; }
        .header-right .brand { font-size: 11pt; font-weight: bold; color: #1a1a1a; }
        
        .summary-box {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .summary-item {
          flex: 1;
          text-align: center;
          padding: 8px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }
        .summary-item .label { font-size: 7pt; color: #666; text-transform: uppercase; }
        .summary-item .value { font-size: 12pt; font-weight: bold; margin-top: 2px; }
        
        .section { margin-bottom: 15px; page-break-inside: avoid; }
        .section-header {
          background: #1a1a1a;
          color: white;
          padding: 8px 12px;
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .section-content { padding: 0 5px; }
        
        table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 5px; }
        th { background: #f0f0f0; padding: 6px 8px; text-align: left; font-weight: 600; border-bottom: 1px solid #ddd; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        tr:hover { background: #fafafa; }
        
        .badge { 
          display: inline-block; 
          padding: 1px 6px; 
          border-radius: 3px; 
          font-size: 7pt; 
          font-weight: 500;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-info { background: #cce5ff; color: #004085; }
        
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 2px solid #1a1a1a;
          font-size: 7pt;
          color: #666;
          display: flex;
          justify-content: space-between;
        }
        .footer-center {
          text-align: center;
          font-size: 8pt;
          color: #0066cc;
        }
        
        .audit-log { background: #fafafa; padding: 8px; margin-top: 10px; border-radius: 4px; }
        .audit-log h4 { font-size: 9pt; margin-bottom: 8px; color: #333; }
        
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .section { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>Relatorio Diario de Operacoes</h1>
          <div class="subtitle">${formattedDate}</div>
          <div class="tisax">Preparado para conformidade TISAX</div>
        </div>
        <div class="header-right">
          <div class="brand">TMS ONE</div>
          <div>Tool Manager System</div>
          <div style="margin-top: 6px;">Gerado em: ${currentDateTime}</div>
        </div>
      </div>
      
      <div class="summary-box">
        <div class="summary-item">
          <div class="label">Chamados Abertos</div>
          <div class="value">${summary.totalTicketsCreated}</div>
        </div>
        <div class="summary-item">
          <div class="label">Chamados Finalizados</div>
          <div class="value">${summary.totalTicketsCompleted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Tempo Total Parado</div>
          <div class="value">${summary.totalDowntime}</div>
        </div>
        <div class="summary-item">
          <div class="label">Custo em Pecas</div>
          <div class="value">${summary.totalCost}</div>
        </div>
        <div class="summary-item">
          <div class="label">Registros de Auditoria</div>
          <div class="value">${summary.totalLogs}</div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-header">CHAMADOS ABERTOS</div>
        <div class="section-content">
          ${renderSection('', 
            data.ticketsCreated.map(t => [t.time, t.machine, t.problem, t.priority, t.createdBy]),
            ['Hora', 'Maquina', 'Problema', 'Prioridade', 'Aberto por']
          )}
        </div>
      </div>
      
      <div class="section">
        <div class="section-header">MANUTENCOES INICIADAS</div>
        <div class="section-content">
          ${renderSection('',
            data.ticketsStarted.map(t => [t.time, t.machine, t.operator]),
            ['Hora', 'Maquina', 'Operador']
          )}
        </div>
      </div>
      
      <div class="section">
        <div class="section-header">MANUTENCOES PAUSADAS</div>
        <div class="section-content">
          ${renderSection('',
            data.ticketsPaused.map(t => [t.time, t.machine, t.operator, t.reason]),
            ['Hora', 'Maquina', 'Operador', 'Motivo']
          )}
        </div>
      </div>
      
      <div class="section">
        <div class="section-header">MANUTENCOES FINALIZADAS</div>
        <div class="section-content">
          ${renderSection('',
            data.ticketsCompleted.map(t => [
              t.time, 
              t.machine, 
              t.operator, 
              t.resolved ? '<span class="badge badge-success">Resolvido</span>' : '<span class="badge badge-warning">Nao Resolvido</span>',
              t.duration,
              t.cost,
              t.parts || '-'
            ]),
            ['Hora', 'Maquina', 'Operador', 'Status', 'Duracao', 'Custo', 'Pecas']
          )}
        </div>
      </div>
      
      ${data.machineChanges.length > 0 ? `
        <div class="section">
          <div class="section-header">ALTERACOES EM MAQUINAS</div>
          <div class="section-content">
            ${renderSection('',
              data.machineChanges.map(m => [m.time, m.machine, m.action, m.user, m.details]),
              ['Hora', 'Maquina', 'Acao', 'Usuario', 'Detalhes']
            )}
          </div>
        </div>
      ` : ''}
      
      ${data.partChanges.length > 0 ? `
        <div class="section">
          <div class="section-header">ALTERACOES EM PECAS</div>
          <div class="section-content">
            ${renderSection('',
              data.partChanges.map(p => [
                p.time, 
                p.part, 
                p.action, 
                p.user, 
                p.oldPrice && p.newPrice ? \`\${p.oldPrice} → \${p.newPrice}\` : '-'
              ]),
              ['Hora', 'Peca', 'Acao', 'Usuario', 'Alteracao Preco']
            )}
          </div>
        </div>
      ` : ''}
      
      ${data.userChanges.length > 0 ? `
        <div class="section">
          <div class="section-header">ALTERACOES EM USUARIOS</div>
          <div class="section-content">
            ${renderSection('',
              data.userChanges.map(u => [u.time, u.targetUser, u.action, u.user]),
              ['Hora', 'Usuario Afetado', 'Acao', 'Realizado por']
            )}
          </div>
        </div>
      ` : ''}
      
      <div class="section">
        <div class="section-header">LOG COMPLETO DE AUDITORIA</div>
        <div class="section-content">
          ${renderSection('',
            data.allLogs.map(l => [l.time, l.user, l.action, l.entity, l.details.substring(0, 60) + (l.details.length > 60 ? '...' : '')]),
            ['Hora', 'Usuario', 'Acao', 'Entidade', 'Detalhes']
          )}
        </div>
      </div>
      
      <div class="footer">
        <div>TMS ONE - Tool Manager System v1.0</div>
        <div class="footer-center">Documento gerado automaticamente para fins de auditoria e conformidade TISAX</div>
        <div>Todos os direitos reservados</div>
      </div>
      
      <script>window.onload = function() { window.print(); }</script>
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
    totalDowntime: number
    totalCost: number
    tickets: Array<{
      date: string
      problem: string
      priority: string
      resolved: boolean
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
      <title>Relatorio por Maquina - TMS ONE</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 15mm 10mm; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #1a1a1a;
        }
        .header {
          display: flex;
          justify-content: space-between;
          padding-bottom: 15px;
          border-bottom: 2px solid #1a1a1a;
          margin-bottom: 20px;
        }
        .header h1 { font-size: 18pt; }
        .header-right { text-align: right; font-size: 8pt; color: #666; }
        .header-right .brand { font-size: 12pt; font-weight: bold; color: #1a1a1a; }
        .machine-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .machine-header {
          background: #1a1a1a;
          color: white;
          padding: 12px;
          margin-bottom: 10px;
        }
        .machine-header h3 { font-size: 12pt; margin-bottom: 4px; }
        .machine-header p { font-size: 9pt; opacity: 0.8; }
        .machine-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
          padding: 10px;
          background: #f5f5f5;
        }
        .machine-stats div {
          flex: 1;
          text-align: center;
        }
        .machine-stats .label { font-size: 8pt; color: #666; }
        .machine-stats .value { font-size: 12pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 8pt; }
        th { background: #f0f0f0; padding: 8px; text-align: left; font-weight: 600; }
        td { padding: 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 7pt; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 8pt;
          color: #666;
        }
        @media print {
          .machine-section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Relatorio Detalhado por Maquina</h1>
          <p style="font-size: 9pt; color: #666; margin-top: 4px;">Historico completo de manutencoes</p>
        </div>
        <div class="header-right">
          <div class="brand">TMS ONE</div>
          <div>Tool Manager System</div>
          <div style="margin-top: 8px;">${currentDate}</div>
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
              <div class="label">Total de Chamados</div>
              <div class="value">${machine.tickets.length}</div>
            </div>
            <div>
              <div class="label">Tempo Parado</div>
              <div class="value">${formatDuration(machine.totalDowntime)}</div>
            </div>
            <div>
              <div class="label">Custo Total</div>
              <div class="value">${formatCurrency(machine.totalCost)}</div>
            </div>
          </div>
          ${machine.tickets.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Problema</th>
                  <th>Status</th>
                  <th>Tempo</th>
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
                    <td><span class="badge ${t.resolved ? 'badge-success' : 'badge-warning'}">${t.resolved ? 'Resolvido' : 'Nao Resolvido'}</span></td>
                    <td>${formatDuration(t.downtime)}</td>
                    <td>${formatCurrency(t.cost)}</td>
                    <td>${t.operator}</td>
                    <td>${t.parts || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="padding: 20px; text-align: center; color: #666;">Nenhuma manutencao registrada</p>'}
        </div>
      `).join('')}
      
      <div class="footer">
        TMS ONE - Tool Manager System | Todos os direitos reservados
      </div>
      
      <script>window.onload = function() { window.print(); }</script>
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
  const [dailyDate, setDailyDate] = useState<Date>(new Date())
  const [dailyCalendarOpen, setDailyCalendarOpen] = useState(false)

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

  // Filtrar tickets completados
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.status !== 'completed' || !t.completedAt) return false

      // Filtro de data
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const ticketDate = new Date(t.completedAt)
        if (!isWithinInterval(ticketDate, {
          start: startOfDay(filters.dateRange.from),
          end: endOfDay(filters.dateRange.to)
        })) return false
      }

      // Filtro de maquina
      if (filters.machineId !== 'all' && t.machineId !== filters.machineId) return false

      // Filtro de usuario (quem finalizou)
      if (filters.userId !== 'all') {
        const lastAction = t.actions[t.actions.length - 1]
        const operatorMatch = lastAction?.operatorName === users.find(u => u.id === filters.userId)?.name
        if (!operatorMatch) return false
      }

      // Filtro de pecas
      if (filters.partId !== 'all') {
        const hasPart = t.usedParts.some(up => up.partId === filters.partId)
        if (!hasPart) return false
      }

      // Filtro de resolvido
      if (filters.resolved !== 'all') {
        if (filters.resolved === 'yes' && !t.resolved) return false
        if (filters.resolved === 'no' && t.resolved) return false
      }

      // Filtro de prioridade
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false

      return true
    })
  }, [tickets, filters, users])

  // Estatisticas gerais
  const stats = useMemo(() => {
    const totalDowntime = filteredTickets.reduce((sum, t) => sum + t.downtime, 0)
    const totalCost = filteredTickets.reduce((sum, t) => sum + t.totalCost, 0)
    const resolved = filteredTickets.filter(t => t.resolved).length
    const notResolved = filteredTickets.filter(t => !t.resolved).length
    const uniqueMachines = new Set(filteredTickets.map(t => t.machineId)).size

    return {
      total: filteredTickets.length,
      totalDowntime,
      totalCost,
      resolved,
      notResolved,
      uniqueMachines
    }
  }, [filteredTickets])

  // Dados por maquina
  const machineData = useMemo(() => {
    const data = new Map<string, { 
      totalDowntime: number
      totalCost: number
      ticketCount: number
      tickets: typeof filteredTickets
    }>()

    filteredTickets.forEach(ticket => {
      const current = data.get(ticket.machineId) || { 
        totalDowntime: 0, 
        totalCost: 0, 
        ticketCount: 0,
        tickets: []
      }
      data.set(ticket.machineId, {
        totalDowntime: current.totalDowntime + ticket.downtime,
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
      .sort((a, b) => b.totalDowntime - a.totalDowntime)
  }, [filteredTickets, getMachineById])

  // Dados por usuario
  const userData = useMemo(() => {
    const data = new Map<string, {
      ticketCount: number
      totalDowntime: number
      totalCost: number
      resolvedCount: number
    }>()

    filteredTickets.forEach(ticket => {
      const lastAction = ticket.actions[ticket.actions.length - 1]
      if (!lastAction) return

      const operatorName = lastAction.operatorName
      const current = data.get(operatorName) || {
        ticketCount: 0,
        totalDowntime: 0,
        totalCost: 0,
        resolvedCount: 0
      }

      data.set(operatorName, {
        ticketCount: current.ticketCount + 1,
        totalDowntime: current.totalDowntime + ticket.downtime,
        totalCost: current.totalCost + ticket.totalCost,
        resolvedCount: current.resolvedCount + (ticket.resolved ? 1 : 0)
      })
    })

    return Array.from(data.entries())
      .map(([userName, d]) => ({ userName, ...d }))
      .sort((a, b) => b.ticketCount - a.ticketCount)
  }, [filteredTickets])

  // Dados por peca
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
          'Relatorio Geral de Manutencoes',
          `Periodo: ${dateLabel}`,
          filteredTickets.map(t => {
            const machine = getMachineById(t.machineId)
            const problem = getProblemById(t.problemId)
            const lastAction = t.actions[t.actions.length - 1]
            return {
              data: format(t.completedAt!, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
              maquina: machine?.name || '-',
              problema: problem?.name || '-',
              prioridade: PRIORITY_CONFIG[t.priority].label,
              status: t.resolved ? 'Resolvido' : 'Nao Resolvido',
              tempo: formatDuration(t.downtime),
              custo: formatCurrency(t.totalCost),
              operador: lastAction?.operatorName || '-'
            }
          }),
          [
            { key: 'data', label: 'Data' },
            { key: 'maquina', label: 'Maquina' },
            { key: 'problema', label: 'Problema' },
            { key: 'prioridade', label: 'Prioridade', align: 'center' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'tempo', label: 'Tempo', align: 'right' },
            { key: 'custo', label: 'Custo', align: 'right' },
            { key: 'operador', label: 'Operador' }
          ],
          [
            { label: 'Total de Manutencoes', value: String(stats.total) },
            { label: 'Tempo Total Parado', value: formatDuration(stats.totalDowntime) },
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
            totalDowntime: m.totalDowntime,
            totalCost: m.totalCost,
            tickets: m.tickets.map(t => {
              const problem = getProblemById(t.problemId)
              const lastAction = t.actions[t.actions.length - 1]
              const partsUsed = t.usedParts.map(up => {
                const part = getPartById(up.partId)
                return `${part?.name} (x${up.quantity})`
              }).join(', ')

              return {
                date: format(t.completedAt!, 'dd/MM/yyyy', { locale: ptBR }),
                problem: problem?.name || '-',
                priority: PRIORITY_CONFIG[t.priority].label,
                resolved: t.resolved ?? true,
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
          'Relatorio por Manutentor',
          `Periodo: ${dateLabel}`,
          userData.map(u => ({
            nome: u.userName,
            chamados: String(u.ticketCount),
            resolvidos: `${u.resolvedCount} (${Math.round(u.resolvedCount / u.ticketCount * 100)}%)`,
            tempo: formatDuration(u.totalDowntime),
            custo: formatCurrency(u.totalCost),
            media: formatDuration(Math.round(u.totalDowntime / u.ticketCount))
          })),
          [
            { key: 'nome', label: 'Manutentor' },
            { key: 'chamados', label: 'Chamados', align: 'center' },
            { key: 'resolvidos', label: 'Resolvidos', align: 'center' },
            { key: 'tempo', label: 'Tempo Total', align: 'right' },
            { key: 'custo', label: 'Custo Total', align: 'right' },
            { key: 'media', label: 'Media/Chamado', align: 'right' }
          ],
          [
            { label: 'Total de Manutentores', value: String(userData.length) },
            { label: 'Total de Chamados', value: String(stats.total) }
          ]
        )
        break

      case 'parts':
        generatePDF(
          'Relatorio de Pecas Utilizadas',
          `Periodo: ${dateLabel}`,
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
          `Periodo: ${dateLabel}`,
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

  // Gerar relatorio diario completo (TISAX)
  const handleGenerateDailyPDF = () => {
    const dayStart = startOfDay(dailyDate)
    const dayEnd = endOfDay(dailyDate)

    // Filtrar logs do dia
    const dayLogs = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp)
      return isWithinInterval(logDate, { start: dayStart, end: dayEnd })
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Categorizar logs
    const ticketsCreated = dayLogs
      .filter(l => l.action === 'ticket_created')
      .map(l => {
        const machine = getMachineById(l.metadata?.machineId as string)
        const problem = getProblemById(l.metadata?.problemId as string)
        return {
          time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
          machine: machine?.name || l.entityName,
          problem: problem?.name || '-',
          priority: (l.metadata?.priority as string) || '-',
          createdBy: l.userName
        }
      })

    const ticketsStarted = dayLogs
      .filter(l => l.action === 'ticket_started')
      .map(l => {
        const machine = getMachineById(l.metadata?.machineId as string)
        return {
          time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
          machine: machine?.name || l.entityName,
          operator: l.userName
        }
      })

    const ticketsPaused = dayLogs
      .filter(l => l.action === 'ticket_paused')
      .map(l => {
        const machine = getMachineById(l.metadata?.machineId as string)
        return {
          time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
          machine: machine?.name || l.entityName,
          operator: l.userName,
          reason: (l.metadata?.reason as string) || '-'
        }
      })

    const ticketsCompleted = dayLogs
      .filter(l => l.action === 'ticket_completed')
      .map(l => {
        const machine = getMachineById(l.metadata?.machineId as string)
        const partsUsed = (l.metadata?.partsUsed as Array<{name: string; quantity: number}>) || []
        return {
          time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
          machine: machine?.name || l.entityName,
          operator: l.userName,
          resolved: l.metadata?.resolved as boolean ?? true,
          duration: formatDuration((l.metadata?.downtime as number) || 0),
          cost: formatCurrency((l.metadata?.totalCost as number) || 0),
          parts: partsUsed.map(p => `${p.name} (x${p.quantity})`).join(', ')
        }
      })

    const machineChanges = dayLogs
      .filter(l => l.action.startsWith('machine_'))
      .map(l => ({
        time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
        machine: l.entityName,
        action: l.action === 'machine_created' ? 'Criada' : 'Atualizada',
        user: l.userName,
        details: l.details
      }))

    const partChanges = dayLogs
      .filter(l => l.action.startsWith('part_'))
      .map(l => ({
        time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
        part: l.entityName,
        action: l.action === 'part_created' ? 'Criada' : 'Atualizada',
        user: l.userName,
        oldPrice: l.previousValue ? formatCurrency(parseFloat(l.previousValue)) : undefined,
        newPrice: l.newValue ? formatCurrency(parseFloat(l.newValue)) : undefined
      }))

    const userChanges = dayLogs
      .filter(l => l.action.startsWith('user_'))
      .map(l => ({
        time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
        targetUser: l.entityName,
        action: l.action === 'user_created' ? 'Criado' : l.action === 'user_updated' ? 'Atualizado' : 'Excluido',
        user: l.userName
      }))

    const scheduledChanges = dayLogs
      .filter(l => l.action.startsWith('scheduled_'))
      .map(l => ({
        time: format(l.timestamp, 'HH:mm', { locale: ptBR }),
        maintenance: l.entityName,
        action: getActionLabel(l.action),
        user: l.userName
      }))

    // Calcular totais
    const completedTicketsData = tickets.filter(t => {
      if (t.status !== 'completed' || !t.completedAt) return false
      const completedDate = new Date(t.completedAt)
      return isWithinInterval(completedDate, { start: dayStart, end: dayEnd })
    })

    const totalDowntime = completedTicketsData.reduce((sum, t) => sum + t.downtime, 0)
    const totalCost = completedTicketsData.reduce((sum, t) => sum + t.totalCost, 0)

    generateDailyPDF(
      dailyDate,
      {
        ticketsCreated,
        ticketsStarted,
        ticketsPaused,
        ticketsCompleted,
        machineChanges,
        partChanges,
        problemChanges: [],
        userChanges,
        scheduledChanges,
        allLogs: dayLogs.map(l => ({
          time: format(l.timestamp, 'HH:mm:ss', { locale: ptBR }),
          user: l.userName,
          action: getActionLabel(l.action),
          entity: l.entityName,
          details: l.details
        }))
      },
      {
        totalTicketsCreated: ticketsCreated.length,
        totalTicketsCompleted: ticketsCompleted.length,
        totalDowntime: formatDuration(totalDowntime),
        totalCost: formatCurrency(totalCost),
        totalLogs: dayLogs.length
      }
    )
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'ticket_created': 'Chamado Criado',
      'ticket_started': 'Manutencao Iniciada',
      'ticket_paused': 'Manutencao Pausada',
      'ticket_resumed': 'Manutencao Retomada',
      'ticket_completed': 'Manutencao Finalizada',
      'ticket_cancelled': 'Chamado Cancelado',
      'ticket_edited': 'Chamado Editado',
      'machine_created': 'Maquina Criada',
      'machine_updated': 'Maquina Atualizada',
      'part_created': 'Peca Criada',
      'part_updated': 'Peca Atualizada',
      'problem_created': 'Problema Criado',
      'problem_updated': 'Problema Atualizado',
      'user_created': 'Usuario Criado',
      'user_updated': 'Usuario Atualizado',
      'user_deleted': 'Usuario Excluido',
      'scheduled_created': 'Programada Criada',
      'scheduled_updated': 'Programada Atualizada',
      'scheduled_deleted': 'Programada Excluida',
      'scheduled_completed': 'Programada Concluida',
    }
    return labels[action] || action
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
            Analise completa de manutencoes e auditoria
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Periodo */}
            <div className="space-y-2">
              <Label className="text-xs">Periodo</Label>
              <div className="flex gap-1">
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
                  Mes
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
            <div className="space-y-2">
              <Label className="text-xs">Maquina</Label>
              <Select 
                value={filters.machineId} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, machineId: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Maquinas</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usuario/Manutentor */}
            <div className="space-y-2">
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
            <div className="space-y-2">
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
                  <SelectItem value="no">Nao Resolvidos</SelectItem>
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
                <p className="text-xs text-muted-foreground">Total Manutencoes</p>
                <p className="text-xl font-bold">{stats.total}</p>
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
                <p className="text-xs text-muted-foreground">Tempo Parado</p>
                <p className="text-xl font-bold">{formatDuration(stats.totalDowntime)}</p>
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
                <p className="text-xl font-bold">{formatCurrency(stats.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Resolucao</p>
                <p className="text-xl font-bold">
                  {stats.total > 0 ? Math.round(stats.resolved / stats.total * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Relatorios */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="general" className="text-xs sm:text-sm">
            <FileText className="w-4 h-4 mr-1 hidden sm:inline" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="machines" className="text-xs sm:text-sm">
            <Settings className="w-4 h-4 mr-1 hidden sm:inline" />
            Maquinas
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">
            <User className="w-4 h-4 mr-1 hidden sm:inline" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="parts" className="text-xs sm:text-sm">
            <Package className="w-4 h-4 mr-1 hidden sm:inline" />
            Pecas
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm">
            <History className="w-4 h-4 mr-1 hidden sm:inline" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="daily" className="text-xs sm:text-sm">
            <Shield className="w-4 h-4 mr-1 hidden sm:inline" />
            Diario
          </TabsTrigger>
        </TabsList>

        {/* Tab Geral */}
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Manutencoes</CardTitle>
              <CardDescription>
                {filteredTickets.length} manutencoes encontradas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium">Data</th>
                      <th className="p-3 text-left font-medium">Maquina</th>
                      <th className="p-3 text-left font-medium">Problema</th>
                      <th className="p-3 text-center font-medium">Status</th>
                      <th className="p-3 text-right font-medium">Tempo</th>
                      <th className="p-3 text-right font-medium">Custo</th>
                      <th className="p-3 text-left font-medium">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTickets.slice(0, 50).map((ticket) => {
                      const machine = getMachineById(ticket.machineId)
                      const problem = getProblemById(ticket.problemId)
                      const lastAction = ticket.actions[ticket.actions.length - 1]
                      
                      return (
                        <tr key={ticket.id} className="hover:bg-muted/50">
                          <td className="p-3 whitespace-nowrap">
                            {format(ticket.completedAt!, 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </td>
                          <td className="p-3">{machine?.name || '-'}</td>
                          <td className="p-3">{problem?.name || '-'}</td>
                          <td className="p-3 text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                ticket.resolved 
                                  ? "bg-green-50 text-green-600 border-green-200" 
                                  : "bg-orange-50 text-orange-600 border-orange-200"
                              )}
                            >
                              {ticket.resolved ? 'Resolvido' : 'Nao Resolvido'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatDuration(ticket.downtime)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatCurrency(ticket.totalCost)}
                          </td>
                          <td className="p-3">{lastAction?.operatorName || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredTickets.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma manutencao encontrada para os filtros selecionados.
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
              <CardTitle>Ranking por Maquina</CardTitle>
              <CardDescription>
                Ordenado por tempo parado (maior para menor)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {machineData.map((m, index) => (
                  <div key={m.machineId} className="p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                        index < 3 ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.machineName}</p>
                        <p className="text-xs text-muted-foreground">{m.sector}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatDuration(m.totalDowntime)}</p>
                        <p className="text-xs text-muted-foreground">{m.ticketCount} chamados</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="font-medium text-green-600">{formatCurrency(m.totalCost)}</p>
                        <p className="text-xs text-muted-foreground">em pecas</p>
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
                Ordenado por quantidade de chamados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {userData.map((u) => (
                  <div key={u.userName} className="p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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
                        <p className="font-medium">{formatDuration(u.totalDowntime)}</p>
                        <p className="text-xs text-muted-foreground">tempo total</p>
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
              <CardTitle>Pecas Utilizadas</CardTitle>
              <CardDescription>
                Ordenado por valor total (maior para menor)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium">Peca</th>
                      <th className="p-3 text-center font-medium">Quantidade</th>
                      <th className="p-3 text-right font-medium">Preco Unit.</th>
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
                    Nenhuma peca utilizada no periodo selecionado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Auditoria */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Log de Auditoria</CardTitle>
              <CardDescription>
                Historico de todas as alteracoes no sistema ({filteredLogs.length} registros)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredLogs.slice(0, 100).map((log) => (
                  <div key={log.id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <History className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {getActionLabel(log.action)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.details}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(log.timestamp, "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum registro de auditoria encontrado.
                  </div>
                )}
                {filteredLogs.length > 100 && (
                  <div className="p-4 text-center text-muted-foreground text-sm border-t">
                    Mostrando 100 de {filteredLogs.length} registros. Gere o PDF para ver todos.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Diario - TISAX */}
        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Relatorio Diario - TISAX</CardTitle>
                  <CardDescription>
                    Gere um relatorio completo de todas as atividades de um dia especifico para auditoria
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Preparado para TISAX</p>
                    <p className="text-blue-700 mt-1">
                      Este relatorio foi desenvolvido para atender aos requisitos de auditoria e rastreabilidade 
                      exigidos pela certificacao TISAX (Trusted Information Security Assessment Exchange) 
                      da industria automotiva.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selecione a Data do Relatorio</Label>
                  <Popover open={dailyCalendarOpen} onOpenChange={setDailyCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[280px] justify-start text-left font-normal",
                          !dailyDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dailyDate ? format(dailyDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dailyDate}
                        onSelect={(date) => {
                          if (date) {
                            setDailyDate(date)
                            setDailyCalendarOpen(false)
                          }
                        }}
                        disabled={(date) => date > new Date()}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">O relatorio incluira:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Todos os chamados abertos no dia
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Manutencoes iniciadas, pausadas e finalizadas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Alteracoes em maquinas, pecas e usuarios
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Log completo de auditoria com horarios
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Resumo com totais de tempo parado e custos
                    </li>
                  </ul>
                </div>

                <Button 
                  onClick={handleGenerateDailyPDF} 
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Gerar Relatorio Diario em PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
