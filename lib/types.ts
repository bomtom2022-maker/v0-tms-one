export type Priority = 'high' | 'medium' | 'low'

export type MachineStatus = 'critical' | 'attention' | 'ok'

// Tipos de Usuario
export type UserRole = 'manutentor' | 'lider'

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
  status: MachineStatus
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

export interface Ticket {
  id: string
  machineId: string
  problemId: string
  observation: string
  priority: Priority
  status: 'open' | 'in-progress' | 'paused' | 'completed' | 'cancelled'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  usedParts: UsedPart[]
  totalCost: number
  downtime: number // em segundos
  accumulatedTime: number // tempo acumulado durante pausas
  actions: MaintenanceAction[]
  completionNotes?: string // observacao ao finalizar
  resolved?: boolean // problema foi resolvido?
  machineStopped?: boolean // maquina parada?
  createdBy: string // userId de quem criou o chamado
  createdByName: string // nome de quem criou o chamado
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
    label: 'Inspecao',
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
    label: 'Critica',
    description: 'Nao pode parar',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
    bgLight: 'bg-red-50',
  },
  attention: {
    label: 'Em Observacao',
    description: 'Requer atencao',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
    bgLight: 'bg-orange-50',
  },
  ok: {
    label: 'Normal',
    description: 'Operacao normal',
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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
