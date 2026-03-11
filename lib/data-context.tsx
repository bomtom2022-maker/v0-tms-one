'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Machine, Problem, Part, Ticket, UsedPart, Priority, MaintenanceAction, MachineStatus, ScheduledMaintenance, AuditLog, AuditLogAction, TimeSegment } from './types'

// Dados iniciais de máquinas CNC
const INITIAL_MACHINES: Machine[] = [
  { id: 'cnc-001', name: 'CNC Torno Romi GL-240', sector: 'Usinagem A', status: 'critical' },
  { id: 'cnc-002', name: 'CNC Fresadora Haas VF-2', sector: 'Usinagem A', status: 'ok' },
  { id: 'cnc-003', name: 'CNC Centro de Usinagem Mazak', sector: 'Usinagem B', status: 'attention' },
  { id: 'cnc-004', name: 'CNC Retifica Studer S33', sector: 'Acabamento', status: 'ok' },
  { id: 'cnc-005', name: 'CNC Torno Okuma LB3000', sector: 'Usinagem B', status: 'critical' },
  { id: 'cnc-006', name: 'CNC Fresadora DMG Mori', sector: 'Usinagem C', status: 'ok' },
  { id: 'cnc-007', name: 'CNC Eletroerosao Sodick', sector: 'Especiais', status: 'attention' },
  { id: 'cnc-008', name: 'CNC Torno Traub TNL26', sector: 'Usinagem A', status: 'ok' },
  { id: 'cnc-009', name: 'CNC Centro Vertical Makino', sector: 'Usinagem C', status: 'critical' },
  { id: 'cnc-010', name: 'CNC Mandriladora TOS', sector: 'Usinagem B', status: 'ok' },
]

// Problemas pré-cadastrados com prioridade padrão
const INITIAL_PROBLEMS: Problem[] = [
  { id: 'prob-001', name: 'Falha no Spindle', defaultPriority: 'high' },
  { id: 'prob-002', name: 'Erro de Posicionamento', defaultPriority: 'high' },
  { id: 'prob-003', name: 'Vazamento de Óleo', defaultPriority: 'medium' },
  { id: 'prob-004', name: 'Problema no Sistema de Refrigeração', defaultPriority: 'medium' },
  { id: 'prob-005', name: 'Falha no Magazine de Ferramentas', defaultPriority: 'high' },
  { id: 'prob-006', name: 'Erro no CNC/Controlador', defaultPriority: 'high' },
  { id: 'prob-007', name: 'Problema no Servo Motor', defaultPriority: 'high' },
  { id: 'prob-008', name: 'Desgaste de Guias', defaultPriority: 'medium' },
  { id: 'prob-009', name: 'Falha no Sistema Hidráulico', defaultPriority: 'high' },
  { id: 'prob-010', name: 'Problema no Trocador Automático', defaultPriority: 'medium' },
  { id: 'prob-011', name: 'Manutenção Preventiva Programada', defaultPriority: 'low' },
  { id: 'prob-012', name: 'Calibração/Ajuste', defaultPriority: 'low' },
  { id: 'prob-013', name: 'Outros', defaultPriority: 'medium', requiresManualPriority: true },
]

// Peças iniciais
const INITIAL_PARTS: Part[] = [
  { id: 'part-001', name: 'Rolamento SKF 6205', price: 85.00, description: 'Rolamento de esferas para eixo principal' },
  { id: 'part-002', name: 'Correia Dentada HTD 5M', price: 120.00, description: 'Correia de transmissão' },
  { id: 'part-003', name: 'Óleo Hidráulico 20L', price: 280.00, description: 'Óleo para sistema hidráulico' },
  { id: 'part-004', name: 'Filtro de Óleo', price: 65.00, description: 'Filtro para sistema de lubrificação' },
  { id: 'part-005', name: 'Sensor de Proximidade', price: 450.00, description: 'Sensor indutivo para posicionamento' },
  { id: 'part-006', name: 'Conector Elétrico Industrial', price: 35.00, description: 'Conector para painel elétrico' },
  { id: 'part-007', name: 'Vedação O-Ring Kit', price: 45.00, description: 'Kit de anéis de vedação' },
  { id: 'part-008', name: 'Fusível Industrial 10A', price: 12.00, description: 'Fusível de proteção' },
  { id: 'part-009', name: 'Graxa Especial 1Kg', price: 95.00, description: 'Graxa para guias lineares' },
  { id: 'part-010', name: 'Bomba de Refrigeração', price: 1850.00, description: 'Bomba para sistema de refrigeração' },
]

// Manutenções futuras de exemplo
const INITIAL_SCHEDULED: ScheduledMaintenance[] = [
  {
    id: 'sched-001',
    machineId: 'cnc-001',
    title: 'Troca de Óleo Hidráulico',
    description: 'Troca programada do óleo hidráulico do sistema.',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    type: 'preventive',
    status: 'pending',
    createdAt: new Date(),
  },
  {
    id: 'sched-002',
    machineId: 'cnc-003',
    title: 'Inspeção de Guias Lineares',
    description: 'Verificar desgaste e ajustar folgas das guias.',
    scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    type: 'inspection',
    status: 'pending',
    createdAt: new Date(),
  },
  {
    id: 'sched-003',
    machineId: 'cnc-005',
    title: 'Substituição de Correias',
    description: 'Trocar correias do eixo principal conforme plano de manutenção.',
    scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    type: 'preventive',
    status: 'pending',
    createdAt: new Date(),
  },
]

// Chamados - inicialmente vazio
const INITIAL_TICKETS: Ticket[] = []

// Logs de auditoria - inicialmente vazio
const INITIAL_AUDIT_LOGS: AuditLog[] = []

// Callback para notificações
type NotificationCallback = (title: string, message: string, type?: 'info' | 'warning' | 'success' | 'error') => void

interface DataContextType {
  machines: Machine[]
  problems: Problem[]
  parts: Part[]
  tickets: Ticket[]
  scheduledMaintenances: ScheduledMaintenance[]
  auditLogs: AuditLog[]
  addMachine: (name: string, sector: string, status: MachineStatus, userId: string, userName: string) => void
  updateMachine: (id: string, name: string, sector: string, status: MachineStatus, userId: string, userName: string) => void
  addPart: (name: string, price: number, description: string | undefined, userId: string, userName: string) => void
  updatePart: (id: string, name: string, price: number, description: string | undefined, userId: string, userName: string, previousPrice?: number) => void
  addProblem: (name: string, defaultPriority: Priority, userId: string, userName: string) => void
  updateProblem: (id: string, name: string, defaultPriority: Priority, userId: string, userName: string) => void
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status'>) => void
  updateTicketObservation: (ticketId: string, observation: string, userId: string, userName: string) => void
  cancelTicket: (ticketId: string, userId: string, userName: string) => void
  addScheduledMaintenance: (data: Omit<ScheduledMaintenance, 'id' | 'createdAt' | 'status'>, userId: string, userName: string) => void
  updateScheduledMaintenance: (id: string, data: Partial<Omit<ScheduledMaintenance, 'id' | 'createdAt'>>, userId: string, userName: string) => void
  deleteScheduledMaintenance: (id: string, userId: string, userName: string) => void
  startMaintenance: (ticketId: string, operatorName: string, userId: string) => void
  pauseMaintenance: (ticketId: string, operatorName: string, reason: string, userId: string) => void
  resumeMaintenance: (ticketId: string, operatorName: string, userId: string) => void
  completeMaintenance: (ticketId: string, usedParts: UsedPart[], operatorName: string, completionNotes: string | undefined, resolved: boolean | undefined, userId: string) => void
  getTicketById: (id: string) => Ticket | undefined
  getMachineById: (id: string) => Machine | undefined
  getProblemById: (id: string) => Problem | undefined
  getPartById: (id: string) => Part | undefined
  getMaintenanceStats: () => { machineId: string; machineName: string; totalDowntime: number; ticketCount: number }[]
  getLastTicketByUser: (userId: string) => Ticket | undefined
  setNotificationCallback: (callback: NotificationCallback | null) => void
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void
  getAuditLogsByEntity: (entityType: AuditLog['entityType'], entityId?: string) => AuditLog[]
  getAuditLogsByUser: (userId: string) => AuditLog[]
  getAuditLogsByDateRange: (startDate: Date, endDate: Date) => AuditLog[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES)
  const [problems, setProblems] = useState<Problem[]>(INITIAL_PROBLEMS)
  const [parts, setParts] = useState<Part[]>(INITIAL_PARTS)
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS)
  const [scheduledMaintenances, setScheduledMaintenances] = useState<ScheduledMaintenance[]>(INITIAL_SCHEDULED)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS)
  const [notifyCallback, setNotifyCallback] = useState<NotificationCallback | null>(null)

  const setNotificationCallback = useCallback((callback: NotificationCallback | null) => {
    setNotifyCallback(() => callback)
  }, [])

  // Função para adicionar log de auditoria
  const addAuditLog = useCallback((logData: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    setAuditLogs(prev => [newLog, ...prev])
  }, [])

  // Funções para buscar logs
  const getAuditLogsByEntity = useCallback((entityType: AuditLog['entityType'], entityId?: string) => {
    return auditLogs.filter(log => {
      if (log.entityType !== entityType) return false
      if (entityId && log.entityId !== entityId) return false
      return true
    })
  }, [auditLogs])

  const getAuditLogsByUser = useCallback((userId: string) => {
    return auditLogs.filter(log => log.userId === userId)
  }, [auditLogs])

  const getAuditLogsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return auditLogs.filter(log => {
      const logDate = new Date(log.timestamp)
      return logDate >= startDate && logDate <= endDate
    })
  }, [auditLogs])

  const addMachine = useCallback((name: string, sector: string, status: MachineStatus, userId: string, userName: string) => {
    const newMachine: Machine = {
      id: `machine-${Date.now()}`,
      name,
      sector,
      status,
    }
    setMachines(prev => [...prev, newMachine])
    
    // Log de auditoria
    addAuditLog({
      action: 'machine_created',
      userId,
      userName,
      entityType: 'machine',
      entityId: newMachine.id,
      entityName: name,
      details: `Máquina "${name}" criada no setor "${sector}" com status "${status}"`,
      newValue: JSON.stringify({ name, sector, status }),
    })
  }, [addAuditLog])

  const updateMachine = useCallback((id: string, name: string, sector: string, status: MachineStatus, userId: string, userName: string) => {
    const oldMachine = machines.find(m => m.id === id)
    setMachines(prev => prev.map(m => 
      m.id === id ? { ...m, name, sector, status } : m
    ))
    
    // Log de auditoria
    addAuditLog({
      action: 'machine_updated',
      userId,
      userName,
      entityType: 'machine',
      entityId: id,
      entityName: name,
      details: `Máquina "${oldMachine?.name}" atualizada para "${name}"`,
      previousValue: JSON.stringify(oldMachine),
      newValue: JSON.stringify({ name, sector, status }),
    })
  }, [machines, addAuditLog])

  const addPart = useCallback((name: string, price: number, description: string | undefined, userId: string, userName: string) => {
    const newPart: Part = {
      id: `part-${Date.now()}`,
      name,
      price,
      description,
    }
    setParts(prev => [...prev, newPart])
    
    // Log de auditoria
    addAuditLog({
      action: 'part_created',
      userId,
      userName,
      entityType: 'part',
      entityId: newPart.id,
      entityName: name,
      details: `Peça "${name}" criada com preço R$ ${price.toFixed(2)}`,
      newValue: JSON.stringify({ name, price, description }),
    })
  }, [addAuditLog])

  const updatePart = useCallback((id: string, name: string, price: number, description: string | undefined, userId: string, userName: string, previousPrice?: number) => {
    const oldPart = parts.find(p => p.id === id)
    setParts(prev => prev.map(p => 
      p.id === id ? { ...p, name, price, description } : p
    ))
    
    // Log de auditoria com destaque para mudança de preço
    let details = `Peça "${oldPart?.name}" atualizada`
    if (previousPrice !== undefined && previousPrice !== price) {
      details += ` - Preço alterado de R$ ${previousPrice.toFixed(2)} para R$ ${price.toFixed(2)}`
    }
    
    addAuditLog({
      action: 'part_updated',
      userId,
      userName,
      entityType: 'part',
      entityId: id,
      entityName: name,
      details,
      previousValue: JSON.stringify(oldPart),
      newValue: JSON.stringify({ name, price, description }),
      metadata: previousPrice !== undefined ? { priceChange: { from: previousPrice, to: price } } : undefined,
    })
  }, [parts, addAuditLog])

  const addProblem = useCallback((name: string, defaultPriority: Priority, userId: string, userName: string) => {
    const newProblem: Problem = {
      id: `prob-${Date.now()}`,
      name,
      defaultPriority,
    }
    setProblems(prev => [...prev, newProblem])
    
    // Log de auditoria
    addAuditLog({
      action: 'problem_created',
      userId,
      userName,
      entityType: 'problem',
      entityId: newProblem.id,
      entityName: name,
      details: `Problema "${name}" criado com prioridade padrão "${defaultPriority}"`,
      newValue: JSON.stringify({ name, defaultPriority }),
    })
  }, [addAuditLog])

  const updateProblem = useCallback((id: string, name: string, defaultPriority: Priority, userId: string, userName: string) => {
    const oldProblem = problems.find(p => p.id === id)
    setProblems(prev => prev.map(p => 
      p.id === id ? { ...p, name, defaultPriority } : p
    ))
    
    // Log de auditoria
    addAuditLog({
      action: 'problem_updated',
      userId,
      userName,
      entityType: 'problem',
      entityId: id,
      entityName: name,
      details: `Problema "${oldProblem?.name}" atualizado para "${name}"`,
      previousValue: JSON.stringify(oldProblem),
      newValue: JSON.stringify({ name, defaultPriority }),
    })
  }, [problems, addAuditLog])

const addTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status' | 'timeSegments'>) => {
  const newTicket: Ticket = {
  ...ticketData,
  id: `ticket-${Date.now()}`,
  status: 'open',
  createdAt: new Date(),
  usedParts: [],
  totalCost: 0,
  downtime: 0,
  accumulatedTime: 0,
  actions: [],
  timeSegments: [],
  }
    setTickets(prev => [newTicket, ...prev])
    
    // Buscar nomes para o log
    const machine = machines.find(m => m.id === ticketData.machineId)
    const problem = problems.find(p => p.id === ticketData.problemId)
    
    // Log de auditoria
    addAuditLog({
      action: 'ticket_created',
      userId: ticketData.createdBy,
      userName: ticketData.createdByName,
      entityType: 'ticket',
      entityId: newTicket.id,
      entityName: `${machine?.name || 'Máquina'} - ${problem?.name || 'Problema'}`,
      details: `Chamado aberto para ${machine?.name || 'Máquina'} - Problema: ${problem?.name || 'N/A'} - Prioridade: ${ticketData.priority}${ticketData.machineStopped ? ' - MÁQUINA PARADA' : ''}`,
      newValue: JSON.stringify(ticketData),
      metadata: {
        machineName: machine?.name,
        problemName: problem?.name,
        priority: ticketData.priority,
        machineStopped: ticketData.machineStopped,
      },
    })
    
    // Notificar sobre novo chamado
    if (notifyCallback) {
      notifyCallback(
        'Novo Chamado Aberto',
        `${machine?.name || 'Máquina'} - ${problem?.name || 'Problema'}`,
        ticketData.priority === 'high' ? 'warning' : 'info'
      )
    }
  }, [machines, problems, notifyCallback, addAuditLog])

  const updateTicketObservation = useCallback((ticketId: string, observation: string, userId: string, userName: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null
    
    setTickets(prev => prev.map(t => 
      t.id === ticketId ? { ...t, observation } : t
    ))
    
    // Log de auditoria
    addAuditLog({
      action: 'ticket_edited',
      userId,
      userName,
      entityType: 'ticket',
      entityId: ticketId,
      entityName: machine?.name || 'Chamado',
      details: `Observação do chamado editada`,
      previousValue: ticket?.observation,
      newValue: observation,
    })
  }, [tickets, machines, addAuditLog])

  const cancelTicket = useCallback((ticketId: string, userId: string, userName: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null
    
    setTickets(prev => prev.map(t => 
      t.id === ticketId && t.status === 'open' 
        ? { ...t, status: 'cancelled' as const } 
        : t
    ))
    
    // Log de auditoria
    addAuditLog({
      action: 'ticket_cancelled',
      userId,
      userName,
      entityType: 'ticket',
      entityId: ticketId,
      entityName: machine?.name || 'Chamado',
      details: `Chamado cancelado para ${machine?.name || 'Máquina'}`,
    })
  }, [tickets, machines, addAuditLog])

  const addScheduledMaintenance = useCallback((data: Omit<ScheduledMaintenance, 'id' | 'createdAt' | 'status'>, userId: string, userName: string) => {
    const newScheduled: ScheduledMaintenance = {
      ...data,
      id: `sched-${Date.now()}`,
      status: 'pending',
      createdAt: new Date(),
    }
    setScheduledMaintenances(prev => [...prev, newScheduled])
    
    const machine = machines.find(m => m.id === data.machineId)
    
    // Log de auditoria
    addAuditLog({
      action: 'scheduled_created',
      userId,
      userName,
      entityType: 'scheduled',
      entityId: newScheduled.id,
      entityName: data.title,
      details: `Manutenção programada "${data.title}" criada para ${machine?.name || 'Máquina'} - Tipo: ${data.type}`,
      newValue: JSON.stringify(data),
    })
  }, [machines, addAuditLog])

  const updateScheduledMaintenance = useCallback((id: string, data: Partial<Omit<ScheduledMaintenance, 'id' | 'createdAt'>>, userId: string, userName: string) => {
    const oldScheduled = scheduledMaintenances.find(s => s.id === id)
    const machine = oldScheduled ? machines.find(m => m.id === oldScheduled.machineId) : null
    
    setScheduledMaintenances(prev => prev.map(s => 
      s.id === id ? { ...s, ...data } : s
    ))
    
    // Log de auditoria
    const action = data.status === 'completed' ? 'scheduled_completed' : 'scheduled_updated'
    addAuditLog({
      action,
      userId,
      userName,
      entityType: 'scheduled',
      entityId: id,
      entityName: oldScheduled?.title || 'Manutenção Programada',
      details: data.status === 'completed' 
        ? `Manutenção programada "${oldScheduled?.title}" marcada como concluída`
        : `Manutenção programada "${oldScheduled?.title}" atualizada`,
      previousValue: JSON.stringify(oldScheduled),
      newValue: JSON.stringify(data),
      metadata: { machineName: machine?.name },
    })
  }, [scheduledMaintenances, machines, addAuditLog])

  const deleteScheduledMaintenance = useCallback((id: string, userId: string, userName: string) => {
    const scheduled = scheduledMaintenances.find(s => s.id === id)
    const machine = scheduled ? machines.find(m => m.id === scheduled.machineId) : null
    
    setScheduledMaintenances(prev => prev.filter(s => s.id !== id))
    
    // Log de auditoria
    addAuditLog({
      action: 'scheduled_deleted',
      userId,
      userName,
      entityType: 'scheduled',
      entityId: id,
      entityName: scheduled?.title || 'Manutenção Programada',
      details: `Manutenção programada "${scheduled?.title}" excluída - Máquina: ${machine?.name || 'N/A'}`,
      previousValue: JSON.stringify(scheduled),
    })
  }, [scheduledMaintenances, machines, addAuditLog])

  const startMaintenance = useCallback((ticketId: string, operatorName: string, userId: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null
    
setTickets(prev => {
    const updated = prev.map(t => {
      if (t.id !== ticketId) return t
      const now = new Date()
      const action: MaintenanceAction = {
        type: 'start',
        operatorName,
        timestamp: now,
      }
      // Criar novo segmento de tempo para este manutentor
      const newSegment: TimeSegment = {
        operatorName,
        startTime: now,
        duration: 0,
      }
      return {
        ...t,
        status: 'in-progress' as const,
        startedAt: t.startedAt || now, // Manter data original se existir
        actions: [...t.actions, action],
        timeSegments: [...(t.timeSegments || []), newSegment],
        // Resetar resolved se estava como unresolved (permitir nova tentativa)
        resolved: t.status === 'unresolved' ? undefined : t.resolved,
      }
    })
    return updated
  })
    
    // Log de auditoria
    addAuditLog({
      action: 'ticket_started',
      userId,
      userName: operatorName,
      entityType: 'ticket',
      entityId: ticketId,
      entityName: machine?.name || 'Chamado',
      details: `Manutenção iniciada por ${operatorName} - ${machine?.name || 'Máquina'}`,
      metadata: { machineName: machine?.name },
    })
    
    // Notificar
    if (notifyCallback && machine) {
      notifyCallback(
        'Manutenção Iniciada',
        `${machine.name} - por ${operatorName}`,
        'info'
      )
    }
  }, [tickets, machines, notifyCallback, addAuditLog])

  const pauseMaintenance = useCallback((ticketId: string, operatorName: string, reason: string, userId: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null
    
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      
      const now = new Date()
      const lastStartOrResume = [...t.actions]
        .reverse()
        .find(a => a.type === 'start' || a.type === 'resume')
      
      let additionalTime = 0
      if (lastStartOrResume) {
        additionalTime = Math.floor((now.getTime() - new Date(lastStartOrResume.timestamp).getTime()) / 1000)
      }
      
      const action: MaintenanceAction = {
        type: 'pause',
        operatorName,
        timestamp: now,
        reason,
      }
      
      // Fechar o segmento de tempo atual
      const updatedSegments = [...(t.timeSegments || [])]
      const lastSegmentIndex = updatedSegments.length - 1
      if (lastSegmentIndex >= 0 && !updatedSegments[lastSegmentIndex].endTime) {
        updatedSegments[lastSegmentIndex] = {
          ...updatedSegments[lastSegmentIndex],
          endTime: now,
          duration: additionalTime,
        }
      }
      
      return { 
        ...t, 
        status: 'paused' as const,
        accumulatedTime: t.accumulatedTime + additionalTime,
        actions: [...t.actions, action],
        timeSegments: updatedSegments,
      }
    }))
    
    // Log de auditoria
    addAuditLog({
      action: 'ticket_paused',
      userId,
      userName: operatorName,
      entityType: 'ticket',
      entityId: ticketId,
      entityName: machine?.name || 'Chamado',
      details: `Manutenção pausada por ${operatorName} - Motivo: ${reason}`,
      metadata: { machineName: machine?.name, reason },
    })
  }, [tickets, machines, addAuditLog])

  const resumeMaintenance = useCallback((ticketId: string, operatorName: string, userId: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null
    
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      
      const now = new Date()
      const action: MaintenanceAction = {
        type: 'resume',
        operatorName,
        timestamp: now,
      }
      
      // Criar novo segmento de tempo para este manutentor
      const newSegment: TimeSegment = {
        operatorName,
        startTime: now,
        duration: 0,
      }
      
      return { 
        ...t, 
        status: 'in-progress' as const,
        actions: [...t.actions, action],
        timeSegments: [...(t.timeSegments || []), newSegment],
      }
    }))
    
    // Log de auditoria
    addAuditLog({
      action: 'ticket_resumed',
      userId,
      userName: operatorName,
      entityType: 'ticket',
      entityId: ticketId,
      entityName: machine?.name || 'Chamado',
      details: `Manutenção retomada por ${operatorName} - ${machine?.name || 'Máquina'}`,
      metadata: { machineName: machine?.name },
    })
  }, [tickets, machines, addAuditLog])

  const completeMaintenance = useCallback((ticketId: string, usedParts: UsedPart[], operatorName: string, completionNotes: string | undefined, resolved: boolean | undefined, userId: string) => {
    const ticketToComplete = tickets.find(t => t.id === ticketId)
    const machine = ticketToComplete ? machines.find(m => m.id === ticketToComplete.machineId) : null
    
    let calculatedCost = 0
    let calculatedDowntime = 0
    
    setTickets(prev => prev.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      
      const now = new Date()
      
      // Calcular tempo adicional se estava em progresso
      let additionalTime = 0
      if (ticket.status === 'in-progress') {
        const lastStartOrResume = [...ticket.actions]
          .reverse()
          .find(a => a.type === 'start' || a.type === 'resume')
        
        if (lastStartOrResume) {
          additionalTime = Math.floor((now.getTime() - new Date(lastStartOrResume.timestamp).getTime()) / 1000)
        }
      }
      
      // Fechar o segmento de tempo atual
      const updatedSegments = [...(ticket.timeSegments || [])]
      const lastSegmentIndex = updatedSegments.length - 1
      if (lastSegmentIndex >= 0 && !updatedSegments[lastSegmentIndex].endTime) {
        updatedSegments[lastSegmentIndex] = {
          ...updatedSegments[lastSegmentIndex],
          endTime: now,
          duration: updatedSegments[lastSegmentIndex].duration + additionalTime,
        }
      }
      
      // Calcular downtime total (soma de todos os segmentos)
      const totalDowntime = updatedSegments.reduce((sum, seg) => sum + seg.duration, 0)
      calculatedDowntime = totalDowntime
      
      // Combinar peças anteriores com novas peças
      const previousParts = ticket.usedParts || []
      const combinedParts: UsedPart[] = [...previousParts]
      
      // Para cada peça nova, verificar se já existe e somar quantidades
      usedParts.forEach(newPart => {
        const existingIndex = combinedParts.findIndex(p => p.partId === newPart.partId)
        if (existingIndex >= 0) {
          // Somar quantidade se a peça já existe
          combinedParts[existingIndex] = {
            ...combinedParts[existingIndex],
            quantity: combinedParts[existingIndex].quantity + newPart.quantity
          }
        } else {
          // Adicionar nova peça
          combinedParts.push(newPart)
        }
      })
      
      // Calcular custo total de TODAS as peças (anteriores + novas)
      calculatedCost = combinedParts.reduce((sum, up) => {
        const part = parts.find(p => p.id === up.partId)
        return sum + (part ? part.price * up.quantity : 0)
      }, 0)

      const action: MaintenanceAction = {
        type: 'complete',
        operatorName,
        timestamp: now,
      }

      // Se problema nao foi resolvido, colocar maquina em observacao
      if (resolved === false) {
        setMachines(prevMachines => prevMachines.map(m => 
          m.id === ticket.machineId ? { ...m, status: 'attention' as const } : m
        ))
      }

      return {
        ...ticket,
        // Se não foi resolvido, usar status 'unresolved' para permitir continuidade
        status: resolved === false ? 'unresolved' as const : 'completed' as const,
        completedAt: resolved === false ? undefined : now,
        usedParts: combinedParts, // Usar peças combinadas
        totalCost: calculatedCost,
        downtime: calculatedDowntime,
        accumulatedTime: totalDowntime, // Manter acumulado atualizado
        timeSegments: updatedSegments, // Historico de tempo por manutentor
        actions: [...ticket.actions, action],
        completionNotes: resolved === false 
          ? (ticket.completionNotes ? `${ticket.completionNotes}\n---\n${completionNotes || ''}` : completionNotes) 
          : completionNotes, // Acumular observações quando não resolvido
        resolved,
      }
    }))
    
    // Montar lista de pecas para o log
    const partsUsedList = usedParts.map(up => {
      const part = parts.find(p => p.id === up.partId)
      return `${part?.name || 'Peca'} (x${up.quantity})`
    }).join(', ')
    
    // Log de auditoria
    addAuditLog({
      action: 'ticket_completed',
      userId,
      userName: operatorName,
      entityType: 'ticket',
      entityId: ticketId,
      entityName: machine?.name || 'Chamado',
      details: `Manutenção finalizada por ${operatorName} - ${machine?.name || 'Máquina'} - ${resolved ? 'RESOLVIDO' : 'NÃO RESOLVIDO'} - Custo: R$ ${calculatedCost.toFixed(2)}${partsUsedList ? ` - Peças: ${partsUsedList}` : ''}`,
      metadata: {
        machineName: machine?.name,
        resolved,
        totalCost: calculatedCost,
        downtime: calculatedDowntime,
        usedParts: usedParts.map(up => ({
          partId: up.partId,
          partName: parts.find(p => p.id === up.partId)?.name,
          quantity: up.quantity,
          unitPrice: parts.find(p => p.id === up.partId)?.price,
        })),
        completionNotes,
      },
    })
    
    // Notificar sobre manutenção concluída
    if (notifyCallback && machine) {
      notifyCallback(
        'Manutenção Finalizada',
        `${machine.name} - ${resolved ? 'Resolvido' : 'Não Resolvido'}`,
        resolved ? 'success' : 'warning'
      )
    }
  }, [parts, tickets, machines, notifyCallback, addAuditLog])

  const getTicketById = useCallback((id: string) => tickets.find(t => t.id === id), [tickets])
  const getMachineById = useCallback((id: string) => machines.find(m => m.id === id), [machines])
  const getProblemById = useCallback((id: string) => problems.find(p => p.id === id), [problems])
  const getPartById = useCallback((id: string) => parts.find(p => p.id === id), [parts])
  
  // Retorna o último chamado criado por um usuário (mais recente)
  const getLastTicketByUser = useCallback((userId: string) => {
    const userTickets = tickets
      .filter(t => t.createdBy === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return userTickets[0]
  }, [tickets])

  const getMaintenanceStats = useCallback(() => {
    const stats = new Map<string, { totalDowntime: number; ticketCount: number }>()
    
    tickets
      .filter(t => t.status === 'completed')
      .forEach(ticket => {
        const current = stats.get(ticket.machineId) || { totalDowntime: 0, ticketCount: 0 }
        stats.set(ticket.machineId, {
          totalDowntime: current.totalDowntime + ticket.downtime,
          ticketCount: current.ticketCount + 1,
        })
      })

    return Array.from(stats.entries())
      .map(([machineId, data]) => ({
        machineId,
        machineName: machines.find(m => m.id === machineId)?.name || machineId,
        ...data,
      }))
      .sort((a, b) => b.ticketCount - a.ticketCount)
  }, [tickets, machines])

  return (
    <DataContext.Provider value={{
      machines,
      problems,
      parts,
      tickets,
      scheduledMaintenances,
      auditLogs,
      addMachine,
      updateMachine,
      addPart,
      updatePart,
      addProblem,
      updateProblem,
      addTicket,
      updateTicketObservation,
      cancelTicket,
      addScheduledMaintenance,
      updateScheduledMaintenance,
      deleteScheduledMaintenance,
      startMaintenance,
      pauseMaintenance,
      resumeMaintenance,
      completeMaintenance,
      getTicketById,
      getMachineById,
      getProblemById,
      getPartById,
      getMaintenanceStats,
      getLastTicketByUser,
      setNotificationCallback,
      addAuditLog,
      getAuditLogsByEntity,
      getAuditLogsByUser,
      getAuditLogsByDateRange,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
