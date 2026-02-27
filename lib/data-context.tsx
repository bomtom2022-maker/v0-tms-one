'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Machine, Problem, Part, Ticket, UsedPart, Priority, MaintenanceAction, MachineStatus } from './types'

// Dados iniciais de maquinas CNC
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

// Problemas pre-cadastrados com prioridade padrao
const INITIAL_PROBLEMS: Problem[] = [
  { id: 'prob-001', name: 'Falha no Spindle', defaultPriority: 'high' },
  { id: 'prob-002', name: 'Erro de Posicionamento', defaultPriority: 'high' },
  { id: 'prob-003', name: 'Vazamento de Oleo', defaultPriority: 'medium' },
  { id: 'prob-004', name: 'Problema no Sistema de Refrigeracao', defaultPriority: 'medium' },
  { id: 'prob-005', name: 'Falha no Magazine de Ferramentas', defaultPriority: 'high' },
  { id: 'prob-006', name: 'Erro no CNC/Controlador', defaultPriority: 'high' },
  { id: 'prob-007', name: 'Problema no Servo Motor', defaultPriority: 'high' },
  { id: 'prob-008', name: 'Desgaste de Guias', defaultPriority: 'medium' },
  { id: 'prob-009', name: 'Falha no Sistema Hidraulico', defaultPriority: 'high' },
  { id: 'prob-010', name: 'Problema no Trocador Automatico', defaultPriority: 'medium' },
  { id: 'prob-011', name: 'Manutencao Preventiva Programada', defaultPriority: 'low' },
  { id: 'prob-012', name: 'Calibracao/Ajuste', defaultPriority: 'low' },
  { id: 'prob-013', name: 'Outros', defaultPriority: 'medium' },
]

// Pecas iniciais
const INITIAL_PARTS: Part[] = [
  { id: 'part-001', name: 'Rolamento SKF 6205', price: 85.00, description: 'Rolamento de esferas para eixo principal' },
  { id: 'part-002', name: 'Correia Dentada HTD 5M', price: 120.00, description: 'Correia de transmissao' },
  { id: 'part-003', name: 'Oleo Hidraulico 20L', price: 280.00, description: 'Oleo para sistema hidraulico' },
  { id: 'part-004', name: 'Filtro de Oleo', price: 65.00, description: 'Filtro para sistema de lubrificacao' },
  { id: 'part-005', name: 'Sensor de Proximidade', price: 450.00, description: 'Sensor indutivo para posicionamento' },
  { id: 'part-006', name: 'Conector Eletrico Industrial', price: 35.00, description: 'Conector para painel eletrico' },
  { id: 'part-007', name: 'Vedacao O-Ring Kit', price: 45.00, description: 'Kit de aneis de vedacao' },
  { id: 'part-008', name: 'Fusivel Industrial 10A', price: 12.00, description: 'Fusivel de protecao' },
  { id: 'part-009', name: 'Graxa Especial 1Kg', price: 95.00, description: 'Graxa para guias lineares' },
  { id: 'part-010', name: 'Bomba de Refrigeracao', price: 1850.00, description: 'Bomba para sistema de refrigeracao' },
]

// Chamados de exemplo para demonstracao
const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'ticket-001',
    machineId: 'cnc-001',
    problemId: 'prob-001',
    observation: 'Spindle apresentando ruido anormal e vibracao excessiva durante operacao em alta rotacao.',
    priority: 'high',
    status: 'open',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
    accumulatedTime: 0,
    actions: [],
  },
  {
    id: 'ticket-002',
    machineId: 'cnc-003',
    problemId: 'prob-004',
    observation: 'Sistema de refrigeracao com baixa pressao. Necessario verificar bomba e filtros.',
    priority: 'medium',
    status: 'open',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
    accumulatedTime: 0,
    actions: [],
  },
  {
    id: 'ticket-003',
    machineId: 'cnc-005',
    problemId: 'prob-011',
    observation: 'Manutencao preventiva mensal programada. Verificar niveis e lubrificacao.',
    priority: 'low',
    status: 'open',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
    accumulatedTime: 0,
    actions: [],
  },
  {
    id: 'ticket-004',
    machineId: 'cnc-006',
    problemId: 'prob-005',
    observation: 'Magazine travando na posicao tres. Verificar sensor e mecanismo.',
    priority: 'high',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    startedAt: new Date(Date.now() - 30 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
    accumulatedTime: 0,
    actions: [{ type: 'start', operatorName: 'Joao Silva', timestamp: new Date(Date.now() - 30 * 60 * 1000) }],
  },
]

interface DataContextType {
  machines: Machine[]
  problems: Problem[]
  parts: Part[]
  tickets: Ticket[]
  addMachine: (name: string, sector: string, status: MachineStatus) => void
  updateMachine: (id: string, name: string, sector: string, status: MachineStatus) => void
  addPart: (name: string, price: number, description?: string) => void
  updatePart: (id: string, name: string, price: number, description?: string) => void
  addProblem: (name: string, defaultPriority: Priority) => void
  updateProblem: (id: string, name: string, defaultPriority: Priority) => void
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status'>) => void
  startMaintenance: (ticketId: string, operatorName: string) => void
  pauseMaintenance: (ticketId: string, operatorName: string, reason: string) => void
  resumeMaintenance: (ticketId: string, operatorName: string) => void
  completeMaintenance: (ticketId: string, usedParts: UsedPart[], operatorName: string, completionNotes?: string) => void
  getTicketById: (id: string) => Ticket | undefined
  getMachineById: (id: string) => Machine | undefined
  getProblemById: (id: string) => Problem | undefined
  getPartById: (id: string) => Part | undefined
  getMaintenanceStats: () => { machineId: string; machineName: string; totalDowntime: number; ticketCount: number }[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES)
  const [problems, setProblems] = useState<Problem[]>(INITIAL_PROBLEMS)
  const [parts, setParts] = useState<Part[]>(INITIAL_PARTS)
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS)

  const addMachine = useCallback((name: string, sector: string, status: MachineStatus) => {
    const newMachine: Machine = {
      id: `machine-${Date.now()}`,
      name,
      sector,
      status,
    }
    setMachines(prev => [...prev, newMachine])
  }, [])

  const updateMachine = useCallback((id: string, name: string, sector: string, status: MachineStatus) => {
    setMachines(prev => prev.map(m => 
      m.id === id ? { ...m, name, sector, status } : m
    ))
  }, [])

  const addPart = useCallback((name: string, price: number, description?: string) => {
    const newPart: Part = {
      id: `part-${Date.now()}`,
      name,
      price,
      description,
    }
    setParts(prev => [...prev, newPart])
  }, [])

  const updatePart = useCallback((id: string, name: string, price: number, description?: string) => {
    setParts(prev => prev.map(p => 
      p.id === id ? { ...p, name, price, description } : p
    ))
  }, [])

  const addProblem = useCallback((name: string, defaultPriority: Priority) => {
    const newProblem: Problem = {
      id: `prob-${Date.now()}`,
      name,
      defaultPriority,
    }
    setProblems(prev => [...prev, newProblem])
  }, [])

  const updateProblem = useCallback((id: string, name: string, defaultPriority: Priority) => {
    setProblems(prev => prev.map(p => 
      p.id === id ? { ...p, name, defaultPriority } : p
    ))
  }, [])

  const addTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status'>) => {
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
    }
    setTickets(prev => [newTicket, ...prev])
  }, [])

  const startMaintenance = useCallback((ticketId: string, operatorName: string) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      const action: MaintenanceAction = {
        type: 'start',
        operatorName,
        timestamp: new Date(),
      }
      return { 
        ...ticket, 
        status: 'in-progress' as const, 
        startedAt: new Date(),
        actions: [...ticket.actions, action],
      }
    }))
  }, [])

  const pauseMaintenance = useCallback((ticketId: string, operatorName: string, reason: string) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      
      const now = new Date()
      const lastStartOrResume = [...ticket.actions]
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
      
      return { 
        ...ticket, 
        status: 'paused' as const,
        accumulatedTime: ticket.accumulatedTime + additionalTime,
        actions: [...ticket.actions, action],
      }
    }))
  }, [])

  const resumeMaintenance = useCallback((ticketId: string, operatorName: string) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      
      const action: MaintenanceAction = {
        type: 'resume',
        operatorName,
        timestamp: new Date(),
      }
      
      return { 
        ...ticket, 
        status: 'in-progress' as const,
        actions: [...ticket.actions, action],
      }
    }))
  }, [])

  const completeMaintenance = useCallback((ticketId: string, usedParts: UsedPart[], operatorName: string, completionNotes?: string) => {
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
      
      const downtime = ticket.accumulatedTime + additionalTime
      
      const totalCost = usedParts.reduce((sum, up) => {
        const part = parts.find(p => p.id === up.partId)
        return sum + (part ? part.price * up.quantity : 0)
      }, 0)

      const action: MaintenanceAction = {
        type: 'complete',
        operatorName,
        timestamp: now,
      }

      return {
        ...ticket,
        status: 'completed' as const,
        completedAt: now,
        usedParts,
        totalCost,
        downtime,
        actions: [...ticket.actions, action],
        completionNotes,
      }
    }))
  }, [parts])

  const getTicketById = useCallback((id: string) => tickets.find(t => t.id === id), [tickets])
  const getMachineById = useCallback((id: string) => machines.find(m => m.id === id), [machines])
  const getProblemById = useCallback((id: string) => problems.find(p => p.id === id), [problems])
  const getPartById = useCallback((id: string) => parts.find(p => p.id === id), [parts])

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
      addMachine,
      updateMachine,
      addPart,
      updatePart,
      addProblem,
      updateProblem,
      addTicket,
      startMaintenance,
      pauseMaintenance,
      resumeMaintenance,
      completeMaintenance,
      getTicketById,
      getMachineById,
      getProblemById,
      getPartById,
      getMaintenanceStats,
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
