export type Priority = 'high' | 'medium' | 'low'

export interface Machine {
  id: string
  name: string
  sector: string
}

export interface Problem {
  id: string
  name: string
  defaultPriority: Priority
}

export interface Part {
  id: string
  name: string
  price: number
}

export interface UsedPart {
  partId: string
  quantity: number
}

export interface MaintenanceAction {
  type: 'start' | 'pause' | 'resume' | 'complete'
  operatorName: string
  timestamp: Date
}

export interface Ticket {
  id: string
  machineId: string
  problemId: string
  observation: string
  priority: Priority
  status: 'open' | 'in-progress' | 'paused' | 'completed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  usedParts: UsedPart[]
  totalCost: number
  downtime: number // em segundos
  accumulatedTime: number // tempo acumulado durante pausas
  actions: MaintenanceAction[]
}

export interface MaintenanceStats {
  machineId: string
  machineName: string
  totalDowntime: number
  ticketCount: number
}

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
