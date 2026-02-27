'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Machine, Problem, Part, Ticket, UsedPart } from './types'

// Dados iniciais de máquinas CNC
const INITIAL_MACHINES: Machine[] = [
  { id: 'cnc-001', name: 'CNC Torno Romi GL-240', sector: 'Usinagem A' },
  { id: 'cnc-002', name: 'CNC Fresadora Haas VF-2', sector: 'Usinagem A' },
  { id: 'cnc-003', name: 'CNC Centro de Usinagem Mazak', sector: 'Usinagem B' },
  { id: 'cnc-004', name: 'CNC Retífica Studer S33', sector: 'Acabamento' },
  { id: 'cnc-005', name: 'CNC Torno Okuma LB3000', sector: 'Usinagem B' },
  { id: 'cnc-006', name: 'CNC Fresadora DMG Mori', sector: 'Usinagem C' },
  { id: 'cnc-007', name: 'CNC Eletroerosão Sodick', sector: 'Especiais' },
  { id: 'cnc-008', name: 'CNC Torno Traub TNL26', sector: 'Usinagem A' },
  { id: 'cnc-009', name: 'CNC Centro Vertical Makino', sector: 'Usinagem C' },
  { id: 'cnc-010', name: 'CNC Mandriladora TOS', sector: 'Usinagem B' },
]

// Problemas pré-cadastrados
const INITIAL_PROBLEMS: Problem[] = [
  { id: 'prob-001', name: 'Falha no Spindle' },
  { id: 'prob-002', name: 'Erro de Posicionamento' },
  { id: 'prob-003', name: 'Vazamento de Óleo' },
  { id: 'prob-004', name: 'Problema no Sistema de Refrigeração' },
  { id: 'prob-005', name: 'Falha no Magazine de Ferramentas' },
  { id: 'prob-006', name: 'Erro no CNC/Controlador' },
  { id: 'prob-007', name: 'Problema no Servo Motor' },
  { id: 'prob-008', name: 'Desgaste de Guias' },
  { id: 'prob-009', name: 'Falha no Sistema Hidráulico' },
  { id: 'prob-010', name: 'Problema no Trocador Automático' },
  { id: 'prob-011', name: 'Manutenção Preventiva Programada' },
  { id: 'prob-012', name: 'Calibração/Ajuste' },
  { id: 'prob-013', name: 'Outros' },
]

// Peças iniciais
const INITIAL_PARTS: Part[] = [
  { id: 'part-001', name: 'Rolamento SKF 6205', price: 85.00 },
  { id: 'part-002', name: 'Correia Dentada HTD 5M', price: 120.00 },
  { id: 'part-003', name: 'Óleo Hidráulico 20L', price: 280.00 },
  { id: 'part-004', name: 'Filtro de Óleo', price: 65.00 },
  { id: 'part-005', name: 'Sensor de Proximidade', price: 450.00 },
  { id: 'part-006', name: 'Conector Elétrico Industrial', price: 35.00 },
  { id: 'part-007', name: 'Vedação O-Ring Kit', price: 45.00 },
  { id: 'part-008', name: 'Fusível Industrial 10A', price: 12.00 },
  { id: 'part-009', name: 'Graxa Especial 1Kg', price: 95.00 },
  { id: 'part-010', name: 'Bomba de Refrigeração', price: 1850.00 },
]

// Chamados de exemplo para demonstração
const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'ticket-001',
    machineId: 'cnc-001',
    problemId: 'prob-001',
    observation: 'Spindle apresentando ruído anormal e vibração excessiva durante operação em alta rotação.',
    priority: 'high',
    status: 'open',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
  },
  {
    id: 'ticket-002',
    machineId: 'cnc-003',
    problemId: 'prob-004',
    observation: 'Sistema de refrigeração com baixa pressão. Necessário verificar bomba e filtros.',
    priority: 'medium',
    status: 'open',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
  },
  {
    id: 'ticket-003',
    machineId: 'cnc-005',
    problemId: 'prob-011',
    observation: 'Manutenção preventiva mensal programada. Verificar níveis e lubrificação.',
    priority: 'low',
    status: 'open',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
  },
  {
    id: 'ticket-004',
    machineId: 'cnc-006',
    problemId: 'prob-005',
    observation: 'Magazine travando na posição três. Verificar sensor e mecanismo.',
    priority: 'high',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    startedAt: new Date(Date.now() - 30 * 60 * 1000),
    usedParts: [],
    totalCost: 0,
    downtime: 0,
  },
]

interface DataContextType {
  machines: Machine[]
  problems: Problem[]
  parts: Part[]
  tickets: Ticket[]
  addPart: (name: string, price: number) => void
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'status'>) => void
  startMaintenance: (ticketId: string) => void
  completeMaintenance: (ticketId: string, usedParts: UsedPart[]) => void
  getTicketById: (id: string) => Ticket | undefined
  getMachineById: (id: string) => Machine | undefined
  getProblemById: (id: string) => Problem | undefined
  getPartById: (id: string) => Part | undefined
  getMaintenanceStats: () => { machineId: string; machineName: string; totalDowntime: number; ticketCount: number }[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [machines] = useState<Machine[]>(INITIAL_MACHINES)
  const [problems] = useState<Problem[]>(INITIAL_PROBLEMS)
  const [parts, setParts] = useState<Part[]>(INITIAL_PARTS)
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS)

  const addPart = useCallback((name: string, price: number) => {
    const newPart: Part = {
      id: `part-${Date.now()}`,
      name,
      price,
    }
    setParts(prev => [...prev, newPart])
  }, [])

  const addTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'status'>) => {
    const newTicket: Ticket = {
      ...ticketData,
      id: `ticket-${Date.now()}`,
      status: 'open',
      createdAt: new Date(),
      usedParts: [],
      totalCost: 0,
      downtime: 0,
    }
    setTickets(prev => [newTicket, ...prev])
  }, [])

  const startMaintenance = useCallback((ticketId: string) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { ...ticket, status: 'in-progress' as const, startedAt: new Date() }
        : ticket
    ))
  }, [])

  const completeMaintenance = useCallback((ticketId: string, usedParts: UsedPart[]) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      
      const completedAt = new Date()
      const startedAt = ticket.startedAt || ticket.createdAt
      const downtime = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
      
      const totalCost = usedParts.reduce((sum, up) => {
        const part = parts.find(p => p.id === up.partId)
        return sum + (part ? part.price * up.quantity : 0)
      }, 0)

      return {
        ...ticket,
        status: 'completed' as const,
        completedAt,
        usedParts,
        totalCost,
        downtime,
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
      addPart,
      addTicket,
      startMaintenance,
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
