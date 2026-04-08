export type Priority = 'high' | 'medium' | 'low'

export type MachineStatus = 'critical' | 'attention' | 'ok'

// Tipos de Usuario
export type UserRole = 'manutentor' | 'lider' | 'viewer'

// Tipos de Log de Auditoria
export type AuditLogAction = 
  | 'ticket_created'
  | 'ticket_started'
  | 'ticket_paused'
  | 'ticket_resumed'
  | 'ticket_completed'
  | 'ticket_cancelled'
  | 'ticket_edited'
  | 'machine_created'
  | 'machine_updated'
  | 'part_created'
  | 'part_updated'
  | 'problem_created'
  | 'problem_updated'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'scheduled_created'
  | 'scheduled_updated'
  | 'scheduled_deleted'
  | 'scheduled_completed'

export interface AuditLog {
  id: string
  action: AuditLogAction
  userId: string
  userName: string
  timestamp: Date
  entityType: 'ticket' | 'machine' | 'part' | 'problem' | 'user' | 'scheduled'
  entityId: string
  entityName: string
  details: string
  previousValue?: string
  newValue?: string
  metadata?: Record<string, unknown>
}

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  createdAt: Date
  isAdmin?: boolean // admin oculto com acesso total
}

export interface AuthSession {
  user: Omit<User, 'password'>
  isAuthenticated: boolean
}

export interface Machine {
  id: string
  name: string
  sector: string
  manufacturer?: string
  model?: string
  controller?: string
  status: MachineStatus
  shiftId?: string // referência ao turno de trabalho
  isActive?: boolean // soft delete - máquinas inativas não aparecem nos seletores
  preventiveIntervalDays?: number // periodicidade da preventiva em dias
  lastPreventiveDate?: Date // data da última preventiva realizada
}

export interface Problem {
  id: string
  name: string
  defaultPriority: Priority
  requiresManualPriority?: boolean
}

export interface Part {
  id: string
  name: string
  price: number
  description?: string
}

export interface UsedPart {
  partId: string
  quantity: number
}

export interface MaintenanceAction {
  type: 'start' | 'pause' | 'resume' | 'complete'
  operatorName: string
  timestamp: Date
  reason?: string // motivo da pausa
}

// Segmento de tempo de cada manutentor
export interface TimeSegment {
  operatorName: string
  startTime: Date
  endTime?: Date
  duration: number // em segundos
}

export interface Ticket {
  id: string
  machineId: string
  problemId: string
  observation: string
  priority: Priority
  status: 'open' | 'in-progress' | 'paused' | 'completed' | 'cancelled' | 'unresolved'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  usedParts: UsedPart[]
  totalCost: number
  downtime: number // tempo total em segundos (soma de todos os segmentos)
  accumulatedTime: number // tempo acumulado durante pausas
  actions: MaintenanceAction[]
  timeSegments: TimeSegment[] // historico de tempo por manutentor
  completionNotes?: string // observacao ao finalizar
  resolved?: boolean // problema foi resolvido?
  machineStopped?: boolean // maquina parada?
  createdBy: string // userId de quem criou o chamado
  createdByName: string // nome de quem criou o chamado
  reportedAt?: Date // quando o problema foi reportado (= createdAt, para calculo de tempo total desde abertura)
  reportedDuration?: number // tempo total desde reportado até resolução final (em segundos)
  customProblemName?: string // nome do problema personalizado (quando selecionado "Outro")
  cancelledAt?: Date // quando o chamado foi cancelado
  cancellationReason?: string // justificativa do cancelamento
  cancelledBy?: string // id de quem cancelou
  cancelledByName?: string // nome de quem cancelou
}

export interface ScheduledMaintenance {
  id: string
  machineId: string
  title: string
  description: string
  scheduledDate: Date
  type: 'preventive' | 'corrective' | 'inspection'
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: Date
}

// Turno de trabalho para cálculo de MTBF/MTTR
export interface Shift {
  id: string
  name: string
  hoursPerDay: number
  daysPerWeek: number
  description?: string
  createdAt: Date
  updatedAt: Date
}

// Dados retornados pela View v_metricas_reais do Supabase
export interface ViewMetricasReais {
  machine_id: string
  machine_name: string
  total_falhas: number
  downtime_horas: number
  uptime_horas: number
  mtbf: number
  mttr: number
  disponibilidade: number
}

// Estatísticas MTBF/MTTR por máquina
export interface MachineMetrics {
  machineId: string
  machineName: string
  shiftName: string
  periodDays: number
  expectedHours: number // horas esperadas de operação
  totalFailures: number // número de falhas (tickets)
  totalRepairTime: number // tempo total de reparo em segundos
  totalDowntime: number // tempo total parado em segundos
  mtbf: number // Mean Time Between Failures (em horas)
  mttr: number // Mean Time To Repair (em horas)
  availability: number // Disponibilidade (%)
}

export const MAINTENANCE_TYPE_CONFIG = {
  preventive: {
    label: 'Preventiva',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
  },
  corrective: {
    label: 'Corretiva',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
  },
  inspection: {
    label: 'Inspeção',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgLight: 'bg-green-50',
  },
} as const

export interface MaintenanceStats {
  machineId: string
  machineName: string
  totalDowntime: number
  ticketCount: number
}

export const MACHINE_STATUS_CONFIG = {
  critical: {
    label: 'Crítica',
    description: 'Não pode parar',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
    bgLight: 'bg-red-50',
  },
  attention: {
    label: 'Em Observação',
    description: 'Requer atenção',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
    bgLight: 'bg-orange-50',
  },
  ok: {
    label: 'Normal',
    description: 'Operação normal',
    color: 'bg-green-500',
    textColor: 'text-green-500',
    borderColor: 'border-green-500',
    bgLight: 'bg-green-50',
  },
} as const

export const PRIORITY_CONFIG = {
  high: {
    label: 'Prioridade Alta',
    description: 'Máquina Parada',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
    bgLight: 'bg-red-50',
  },
  medium: {
    label: 'Prioridade Média',
    description: 'Atenção Necessária',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
    bgLight: 'bg-orange-50',
  },
  low: {
    label: 'Sem Prioridade',
    description: 'Preventiva',
    color: 'bg-green-500',
    textColor: 'text-green-500',
    borderColor: 'border-green-500',
    bgLight: 'bg-green-50',
  },
} as const

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Formata duração longa: "X dias" como destaque + "HH:MM" abaixo
// Quando < 24h retorna só HH:MM:SS
export function formatDurationLong(seconds: number): { days: number; hhmm: string; full: string } {
  const days = Math.floor(seconds / 86400)
  const remaining = seconds % 86400
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const secs = remaining % 60
  const hhmm = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  const full = days > 0
    ? `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    : hhmm
  return { days, hhmm, full }
}

// Formata duração em horas (sem conversão para dias)
// Retorna objeto com horas totais e formato HH:MM:SS
export function formatDurationHours(seconds: number): { totalHours: number; hhmm: string; display: string } {
  const totalHours = seconds / 3600
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const hhmm = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  const display = `${totalHours.toFixed(1)}h`
  return { totalHours, hhmm, display }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
