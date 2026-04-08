'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Machine, Problem, Part, Ticket, UsedPart, Priority, MaintenanceAction, MachineStatus, ScheduledMaintenance, AuditLog, TimeSegment } from './types'
import {
  fetchMachines, insertMachine, updateMachineDb, deleteMachineDb,
  fetchProblems, insertProblem, updateProblemDb,
  fetchParts, insertPart, updatePartDb, deletePartDb,
  fetchTickets, insertTicket, updateTicketDb, insertTicketAction, insertTicketSegment, closeTicketSegment, insertUsedParts, rejectTicketDb,
  fetchScheduledMaintenances, insertScheduledMaintenance, updateScheduledMaintenanceDb, deleteScheduledMaintenanceDb,
  fetchAuditLogs,
} from './supabase-data'

// Callback para notificacoes em tempo real
type NotificationCallback = (title: string, message: string, type?: 'info' | 'warning' | 'success' | 'error') => void

interface DataContextType {
  machines: Machine[]
  problems: Problem[]
  parts: Part[]
  tickets: Ticket[]
  scheduledMaintenances: ScheduledMaintenance[]
  auditLogs: AuditLog[]
  isLoading: boolean
  reloadData: () => Promise<void>
  reloadAuditLogs: () => Promise<void>
  addMachine: (name: string, sector: string, status: MachineStatus, userId: string, userName: string, manufacturer?: string, model?: string, controller?: string) => Promise<void>
  updateMachine: (id: string, name: string, sector: string, status: MachineStatus, userId: string, userName: string, manufacturer?: string, model?: string, controller?: string, preventiveIntervalDays?: number, lastPreventiveDate?: string) => Promise<void>
  deleteMachine: (id: string, userId: string, userName: string) => Promise<void>
  addPart: (name: string, price: number, description: string | undefined, userId: string, userName: string) => Promise<void>
  updatePart: (id: string, name: string, price: number, description: string | undefined, userId: string, userName: string, previousPrice?: number) => Promise<void>
  deletePart: (id: string) => Promise<void>
  addProblem: (name: string, defaultPriority: Priority, userId: string, userName: string) => Promise<void>
  updateProblem: (id: string, name: string, defaultPriority: Priority, userId: string, userName: string) => Promise<void>
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status' | 'timeSegments'>) => Promise<void>
  updateTicketObservation: (ticketId: string, observation: string, userId: string, userName: string) => Promise<void>
  rejectTicket: (ticketId: string, rejectionReason: string, userId: string, userName: string) => Promise<void>
  addScheduledMaintenance: (data: Omit<ScheduledMaintenance, 'id' | 'createdAt' | 'status'>, userId: string, userName: string) => Promise<void>
  updateScheduledMaintenance: (id: string, data: Partial<Omit<ScheduledMaintenance, 'id' | 'createdAt'>>, userId: string, userName: string) => Promise<void>
  deleteScheduledMaintenance: (id: string, userId: string, userName: string) => Promise<void>
  startMaintenance: (ticketId: string, operatorName: string, userId: string) => Promise<void>
  pauseMaintenance: (ticketId: string, operatorName: string, reason: string, userId: string) => Promise<void>
  resumeMaintenance: (ticketId: string, operatorName: string, userId: string) => Promise<void>
  completeMaintenance: (ticketId: string, usedParts: UsedPart[], operatorName: string, completionNotes: string | undefined, resolved: boolean | undefined, userId: string) => Promise<void>
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
  const [machines, setMachines] = useState<Machine[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [scheduledMaintenances, setScheduledMaintenances] = useState<ScheduledMaintenance[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]) // carregados via API
  const [isLoading, setIsLoading] = useState(false)
  const notifyRef = useRef<NotificationCallback | null>(null)

  const setNotificationCallback = useCallback((callback: NotificationCallback | null) => {
    notifyRef.current = callback
  }, [])

  const notify = (title: string, message: string, type?: 'info' | 'warning' | 'success' | 'error') => {
    notifyRef.current?.(title, message, type)
  }

  // Log local (nao persiste — triggers do Supabase cuidam da persistencia)
  const addAuditLog = useCallback((_log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    // Intencional: os triggers do banco ja gravam em audit_logs automaticamente
  }, [])

  const reloadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Carregar dados principais em paralelo — audit logs omitidos aqui
      // pois são pesados e só usados em Relatórios (carregados sob demanda)
      const [m, pr, pa, t, s] = await Promise.all([
        fetchMachines(),
        fetchProblems(),
        fetchParts(),
        fetchTickets(),
        fetchScheduledMaintenances(),
      ])
      setMachines(m)
      setProblems(pr)
      setParts(pa)
      setTickets(t)
      setScheduledMaintenances(s)
    } catch {
      // silencioso quando nao autenticado
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Carrega audit logs sob demanda (apenas quando necessário, ex: tela de relatórios)
  const reloadAuditLogs = useCallback(async () => {
    try {
      const al = await fetchAuditLogs()
      setAuditLogs(al)
    } catch {
      // silencioso
    }
  }, [])



  // ─── MAQUINAS ────────────────────────────────────────────

  const addMachine = useCallback(async (name: string, sector: string, status: MachineStatus, _userId: string, _userName: string, manufacturer?: string, model?: string, controller?: string) => {
    const newMachine = await insertMachine(name, sector, status, manufacturer, model, controller)
    setMachines(prev => [...prev, newMachine])
  }, [])

  const updateMachine = useCallback(async (id: string, name: string, sector: string, status: MachineStatus, _userId: string, _userName: string, manufacturer?: string, model?: string, controller?: string, preventiveIntervalDays?: number, lastPreventiveDate?: string) => {
    await updateMachineDb(id, name, sector, status, manufacturer, model, controller, preventiveIntervalDays, lastPreventiveDate)
    setMachines(prev => prev.map(m => m.id === id ? { 
      ...m, 
      name, 
      sector, 
      status, 
      manufacturer, 
      model, 
      controller,
      preventiveIntervalDays,
      lastPreventiveDate: lastPreventiveDate ? new Date(lastPreventiveDate) : undefined,
    } : m))
  }, [])

  const deleteMachine = useCallback(async (id: string, _userId: string, _userName: string) => {
    await deleteMachineDb(id)
    setMachines(prev => prev.filter(m => m.id !== id))
  }, [])

  // ─── PECAS ───────────────────────────────────────────────

  const addPart = useCallback(async (name: string, price: number, description: string | undefined, _userId: string, _userName: string) => {
    const newPart = await insertPart(name, price, description)
    setParts(prev => [...prev, newPart])
  }, [])

  const updatePart = useCallback(async (id: string, name: string, price: number, description: string | undefined, _userId: string, _userName: string) => {
    await updatePartDb(id, name, price, description)
    setParts(prev => prev.map(p => p.id === id ? { ...p, name, price, description } : p))
  }, [])

  const deletePart = useCallback(async (id: string) => {
    await deletePartDb(id)
    setParts(prev => prev.filter(p => p.id !== id))
  }, [])

  // ─── PROBLEMAS ───────────────────────────────────────────

  const addProblem = useCallback(async (name: string, defaultPriority: Priority, _userId: string, _userName: string) => {
    const newProblem = await insertProblem(name, defaultPriority)
    setProblems(prev => [...prev, newProblem])
  }, [])

  const updateProblem = useCallback(async (id: string, name: string, defaultPriority: Priority, _userId: string, _userName: string) => {
    await updateProblemDb(id, name, defaultPriority)
    setProblems(prev => prev.map(p => p.id === id ? { ...p, name, defaultPriority } : p))
  }, [])

  // ─── TICKETS ─────────────────────────────────────────────

  const addTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status' | 'timeSegments'>) => {
    const newTicket = await insertTicket(ticketData)
    setTickets(prev => [newTicket, ...prev])

    const machine = machines.find(m => m.id === ticketData.machineId)
    const problem = problems.find(p => p.id === ticketData.problemId)
    const problemName = ticketData.customProblemName || problem?.name || 'Problema'
    notify(
      'Novo Chamado Aberto',
      `${machine?.name || 'Maquina'} - ${problemName}`,
      ticketData.priority === 'high' ? 'warning' : 'info'
    )
  }, [machines, problems])

  const updateTicketObservation = useCallback(async (ticketId: string, observation: string, _userId: string, _userName: string) => {
    await updateTicketDb(ticketId, { observation })
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, observation } : t))
  }, [])

  const rejectTicket = useCallback(async (ticketId: string, rejectionReason: string, userId: string, userName: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket) throw new Error('Chamado não encontrado')
    
    await rejectTicketDb(ticketId, rejectionReason, userId, userName)
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { 
        ...t, 
        status: 'cancelled' as const,
        cancelledAt: new Date(),
        cancellationReason: rejectionReason,
        cancelledBy: userId,
        cancelledByName: userName,
      } : t
    ))
  }, [tickets])

  // ─── MANUTENCOES PROGRAMADAS ─────────────────────────────

  const addScheduledMaintenance = useCallback(async (data: Omit<ScheduledMaintenance, 'id' | 'createdAt' | 'status'>, userId: string, userName: string) => {
    const newSched = await insertScheduledMaintenance(data, userId, userName)
    setScheduledMaintenances(prev => [...prev, newSched])
  }, [])

  const updateScheduledMaintenance = useCallback(async (id: string, data: Partial<Omit<ScheduledMaintenance, 'id' | 'createdAt'>>, _userId: string, _userName: string) => {
    await updateScheduledMaintenanceDb(id, data)
    setScheduledMaintenances(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
  }, [])

  const deleteScheduledMaintenance = useCallback(async (id: string, _userId: string, _userName: string) => {
    await deleteScheduledMaintenanceDb(id)
    setScheduledMaintenances(prev => prev.filter(s => s.id !== id))
  }, [])

  // ─── OPERACOES DE MANUTENCAO ─────────────────────────────

  const startMaintenance = useCallback(async (ticketId: string, operatorName: string, userId: string) => {
    const now = new Date()
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null
    const isReopen = ticket?.status === 'unresolved'

    // Executar sequencialmente para evitar race conditions
    await updateTicketDb(ticketId, {
      status: 'in-progress',
      started_at: ticket?.startedAt ? ticket.startedAt.toISOString() : now.toISOString(),
      accepted_by: userId,
      accepted_by_name: operatorName,
    })
    await insertTicketAction(ticketId, isReopen ? 'resume' : 'start', operatorName, userId)
    await insertTicketSegment(ticketId, operatorName, userId, now)

    const newAction: MaintenanceAction = {
      type: isReopen ? 'resume' : 'start',
      operatorName,
      timestamp: now,
    }
    const newSegment: TimeSegment = { operatorName, startTime: now, duration: 0 }

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      return {
        ...t,
        status: 'in-progress' as const,
        startedAt: t.startedAt || now,
        acceptedBy: userId,
        acceptedByName: operatorName,
        actions: [...t.actions, newAction],
        timeSegments: [...(t.timeSegments || []), newSegment],
        // Manter resolved como undefined ao reiniciar
        resolved: undefined,
      }
    }))

    if (machine) notify('Manutencao Iniciada', `${machine.name} - por ${operatorName}`, 'info')
  }, [tickets, machines])

  const pauseMaintenance = useCallback(async (ticketId: string, operatorName: string, reason: string, userId: string) => {
    const now = new Date()
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null

    // Calcular tempo adicional desde o ultimo start/resume
    let additionalTime = 0
    if (ticket) {
      const lastAction = [...ticket.actions].reverse().find(a => a.type === 'start' || a.type === 'resume')
      if (lastAction) {
        additionalTime = Math.floor((now.getTime() - new Date(lastAction.timestamp).getTime()) / 1000)
      }
    }

    // Executar sequencialmente para evitar race conditions
    await updateTicketDb(ticketId, {
      status: 'paused',
      accumulated_time: (ticket?.accumulatedTime || 0) + additionalTime,
    })
    await insertTicketAction(ticketId, 'pause', operatorName, userId, reason)
    // closeTicketSegment pode nao encontrar segmento aberto — ignorar falha silenciosamente
    try { await closeTicketSegment(ticketId, now, additionalTime) } catch { /* sem segmento aberto */ }

    const newAction: MaintenanceAction = { type: 'pause', operatorName, timestamp: now, reason }

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      const updatedSegments = [...(t.timeSegments || [])]
      const lastIdx = updatedSegments.length - 1
      if (lastIdx >= 0 && !updatedSegments[lastIdx].endTime) {
        updatedSegments[lastIdx] = { ...updatedSegments[lastIdx], endTime: now, duration: additionalTime }
      }
      return {
        ...t,
        status: 'paused' as const,
        accumulatedTime: t.accumulatedTime + additionalTime,
        actions: [...t.actions, newAction],
        timeSegments: updatedSegments,
      }
    }))

    if (machine) notify('Manutencao Pausada', `${machine.name} - ${reason}`, 'warning')
  }, [tickets, machines])

  const resumeMaintenance = useCallback(async (ticketId: string, operatorName: string, userId: string) => {
    const now = new Date()
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null

    // Executar sequencialmente para evitar race conditions
    await updateTicketDb(ticketId, {
      status: 'in-progress',
    })
    await insertTicketAction(ticketId, 'resume', operatorName, userId)
    await insertTicketSegment(ticketId, operatorName, userId, now)

    const newAction: MaintenanceAction = { type: 'resume', operatorName, timestamp: now }
    const newSegment: TimeSegment = { operatorName, startTime: now, duration: 0 }

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      return {
        ...t,
        status: 'in-progress' as const,
        actions: [...t.actions, newAction],
        timeSegments: [...(t.timeSegments || []), newSegment],
      }
    }))

    if (machine) notify('Manutencao Retomada', `${machine.name} - por ${operatorName}`, 'info')
  }, [tickets, machines])

  const completeMaintenance = useCallback(async (ticketId: string, usedParts: UsedPart[], operatorName: string, completionNotes: string | undefined, resolved: boolean | undefined, userId: string) => {
    const now = new Date()
    const ticket = tickets.find(t => t.id === ticketId)
    const machine = ticket ? machines.find(m => m.id === ticket.machineId) : null

    let additionalTime = 0
    if (ticket?.status === 'in-progress') {
      const lastAction = [...ticket.actions].reverse().find(a => a.type === 'start' || a.type === 'resume')
      if (lastAction) {
        additionalTime = Math.floor((now.getTime() - new Date(lastAction.timestamp).getTime()) / 1000)
      }
    }

    // Calcular segmentos finais
    const updatedSegments = [...(ticket?.timeSegments || [])]
    const lastIdx = updatedSegments.length - 1
    if (lastIdx >= 0 && !updatedSegments[lastIdx].endTime) {
      updatedSegments[lastIdx] = {
        ...updatedSegments[lastIdx],
        endTime: now,
        duration: updatedSegments[lastIdx].duration + additionalTime,
      }
    }
    const totalDowntime = updatedSegments.reduce((sum, seg) => sum + seg.duration, 0)

    // Combinar pecas anteriores com novas
    const previousParts = ticket?.usedParts || []
    const combinedParts: UsedPart[] = [...previousParts]
    usedParts.forEach(np => {
      const idx = combinedParts.findIndex(p => p.partId === np.partId)
      if (idx >= 0) combinedParts[idx] = { ...combinedParts[idx], quantity: combinedParts[idx].quantity + np.quantity }
      else combinedParts.push(np)
    })

    const totalCost = combinedParts.reduce((sum, up) => {
      const part = parts.find(p => p.id === up.partId)
      return sum + (part ? part.price * up.quantity : 0)
    }, 0)

    const finalStatus = resolved === false ? 'unresolved' : 'completed'
    // Tempo desde que o problema foi reportado (createdAt até agora)
    const reportedDuration = ticket ? Math.floor((now.getTime() - new Date(ticket.createdAt).getTime()) / 1000) : 0

    // Executar sequencialmente para evitar race conditions
    await updateTicketDb(ticketId, {
      status: finalStatus,
      completed_at: resolved === false ? null : now.toISOString(),
      total_cost: totalCost,
      downtime: totalDowntime,
      accumulated_time: totalDowntime,
      completion_notes: completionNotes || null,
      resolved: resolved ?? null,
    })
    await insertTicketAction(ticketId, 'complete', operatorName, userId)
    try { await closeTicketSegment(ticketId, now, additionalTime) } catch { /* sem segmento aberto */ }
    if (usedParts.length > 0) await insertUsedParts(ticketId, usedParts)

    if (resolved === false && machine) {
      await updateMachineDb(machine.id, machine.name, machine.sector, 'attention')
      setMachines(prev => prev.map(m => m.id === machine.id ? { ...m, status: 'attention' as const } : m))
    }

    const newAction: MaintenanceAction = { type: 'complete', operatorName, timestamp: now }

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      return {
        ...t,
        status: finalStatus as Ticket['status'],
        completedAt: resolved === false ? undefined : now,
        usedParts: combinedParts,
        totalCost,
        downtime: totalDowntime,
        accumulatedTime: totalDowntime,
        timeSegments: updatedSegments,
        actions: [...t.actions, newAction],
        completionNotes: resolved === false
          ? (t.completionNotes ? `${t.completionNotes}\n---\n${completionNotes || ''}` : completionNotes)
          : completionNotes,
        resolved,
      }
    }))

    if (machine) notify('Manutencao Finalizada', `${machine.name} - ${resolved ? 'Resolvido' : 'Nao Resolvido'}`, resolved ? 'success' : 'warning')
  }, [tickets, machines, parts])

  // ─── HELPERS ─────────────────────────────────────────────

  const getTicketById = useCallback((id: string) => tickets.find(t => t.id === id), [tickets])
  const getMachineById = useCallback((id: string) => machines.find(m => m.id === id), [machines])
  const getProblemById = useCallback((id: string) => problems.find(p => p.id === id), [problems])
  const getPartById = useCallback((id: string) => parts.find(p => p.id === id), [parts])

  const getLastTicketByUser = useCallback((userId: string) => {
    return tickets
      .filter(t => t.createdBy === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }, [tickets])

  const getMaintenanceStats = useCallback(() => {
    const stats = new Map<string, { totalDowntime: number; ticketCount: number }>()
    tickets.filter(t => t.status === 'completed').forEach(ticket => {
      const cur = stats.get(ticket.machineId) || { totalDowntime: 0, ticketCount: 0 }
      stats.set(ticket.machineId, { totalDowntime: cur.totalDowntime + ticket.downtime, ticketCount: cur.ticketCount + 1 })
    })
    return Array.from(stats.entries()).map(([machineId, data]) => ({
      machineId,
      machineName: machines.find(m => m.id === machineId)?.name || machineId,
      ...data,
    })).sort((a, b) => b.ticketCount - a.ticketCount)
  }, [tickets, machines])

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
      const d = new Date(log.timestamp)
      return d >= startDate && d <= endDate
    })
  }, [auditLogs])

  return (
    <DataContext.Provider value={{
      machines, problems, parts, tickets, scheduledMaintenances, auditLogs,
      isLoading, reloadData, reloadAuditLogs,
      addMachine, updateMachine, deleteMachine,
      addPart, updatePart, deletePart,
      addProblem, updateProblem,
      addTicket, updateTicketObservation, rejectTicket,
      addScheduledMaintenance, updateScheduledMaintenance, deleteScheduledMaintenance,
      startMaintenance, pauseMaintenance, resumeMaintenance, completeMaintenance,
      getTicketById, getMachineById, getProblemById, getPartById,
      getMaintenanceStats, getLastTicketByUser,
      setNotificationCallback, addAuditLog,
      getAuditLogsByEntity, getAuditLogsByUser, getAuditLogsByDateRange,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within a DataProvider')
  return context
}
