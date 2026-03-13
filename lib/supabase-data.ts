'use client'

import { createClient } from '@/lib/supabase/client'
import type { Machine, Problem, Part, Ticket, ScheduledMaintenance, UsedPart, MachineStatus, Priority, MaintenanceAction, TimeSegment } from '@/lib/types'

// ─── MAQUINAS ──────────────────────────────────────────────

export async function fetchMachines(): Promise<Machine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    sector: row.sector,
    status: row.status as MachineStatus,
  }))
}

export async function insertMachine(name: string, sector: string, status: MachineStatus): Promise<Machine> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('machines')
    .insert({ name, sector, status })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, name: data.name, sector: data.sector, status: data.status }
}

export async function updateMachineDb(id: string, name: string, sector: string, status: MachineStatus): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('machines').update({ name, sector, status }).eq('id', id)
  if (error) throw error
}

export async function deleteMachineDb(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('machines').delete().eq('id', id)
  if (error) throw error
}

// ─── PROBLEMAS ─────────────────────────────────────────────

export async function fetchProblems(): Promise<Problem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    defaultPriority: row.default_priority as Priority,
    requiresManualPriority: row.requires_manual_priority ?? false,
  }))
}

export async function insertProblem(name: string, defaultPriority: Priority, requiresManualPriority = false): Promise<Problem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('problems')
    .insert({ name, default_priority: defaultPriority, requires_manual_priority: requiresManualPriority })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, name: data.name, defaultPriority: data.default_priority, requiresManualPriority: data.requires_manual_priority }
}

export async function updateProblemDb(id: string, name: string, defaultPriority: Priority): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('problems').update({ name, default_priority: defaultPriority }).eq('id', id)
  if (error) throw error
}

// ─── PECAS ─────────────────────────────────────────────────

export async function fetchParts(): Promise<Part[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    description: row.description ?? undefined,
    stock: row.stock ?? 0,
  }))
}

export async function insertPart(name: string, price: number, description?: string): Promise<Part> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('parts')
    .insert({ name, price, description: description || null })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, name: data.name, price: Number(data.price), description: data.description }
}

export async function updatePartDb(id: string, name: string, price: number, description?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('parts').update({ name, price, description: description || null }).eq('id', id)
  if (error) throw error
}

// ─── TICKETS ───────────────────────────────────────────────

// Mapeia linha do banco para o tipo Ticket local
function rowToTicket(row: Record<string, unknown>, actions: MaintenanceAction[] = [], usedParts: UsedPart[] = [], timeSegments: TimeSegment[] = []): Ticket {
  return {
    id: row.id as string,
    machineId: row.machine_id as string,
    problemId: row.problem_id as string,
    observation: (row.observation as string) || '',
    priority: row.priority as Priority,
    status: row.status as Ticket['status'],
    createdAt: new Date(row.created_at as string),
    startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    usedParts,
    totalCost: Number(row.total_cost) || 0,
    downtime: Number(row.downtime) || 0,
    accumulatedTime: Number(row.accumulated_time) || 0,
    actions,
    timeSegments,
    completionNotes: (row.completion_notes as string) ?? undefined,
    resolved: row.resolved as boolean | undefined,
    machineStopped: (row.machine_stopped as boolean) || false,
    createdBy: row.created_by as string,
    createdByName: row.created_by_name as string,
  }
}

export async function fetchTickets(): Promise<Ticket[]> {
  const supabase = createClient()

  const [ticketsRes, actionsRes, usedPartsRes, segmentsRes] = await Promise.all([
    supabase.from('tickets').select('*').order('created_at', { ascending: false }),
    supabase.from('ticket_actions').select('*').order('timestamp', { ascending: true }),
    supabase.from('ticket_used_parts').select('*'),
    supabase.from('ticket_time_segments').select('*').order('start_time', { ascending: true }),
  ])

  if (ticketsRes.error) throw ticketsRes.error

  const actionsMap: Record<string, MaintenanceAction[]> = {}
  for (const a of actionsRes.data || []) {
    if (!actionsMap[a.ticket_id]) actionsMap[a.ticket_id] = []
    actionsMap[a.ticket_id].push({
      type: a.type as MaintenanceAction['type'],
      operatorName: a.operator_name,
      timestamp: new Date(a.timestamp),
      reason: a.reason ?? undefined,
    })
  }

  const partsMap: Record<string, UsedPart[]> = {}
  for (const p of usedPartsRes.data || []) {
    if (!partsMap[p.ticket_id]) partsMap[p.ticket_id] = []
    partsMap[p.ticket_id].push({ partId: p.part_id, quantity: p.quantity })
  }

  const segmentsMap: Record<string, TimeSegment[]> = {}
  for (const s of segmentsRes.data || []) {
    if (!segmentsMap[s.ticket_id]) segmentsMap[s.ticket_id] = []
    segmentsMap[s.ticket_id].push({
      operatorName: s.operator_name,
      startTime: new Date(s.start_time),
      endTime: s.end_time ? new Date(s.end_time) : undefined,
      duration: s.duration || 0,
    })
  }

  return (ticketsRes.data || []).map(row =>
    rowToTicket(row, actionsMap[row.id], partsMap[row.id], segmentsMap[row.id])
  )
}

export async function insertTicket(ticketData: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status' | 'timeSegments'>): Promise<Ticket> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      machine_id: ticketData.machineId,
      problem_id: ticketData.problemId,
      observation: ticketData.observation || null,
      priority: ticketData.priority,
      status: 'open',
      machine_stopped: ticketData.machineStopped || false,
      created_by: ticketData.createdBy,
      created_by_name: ticketData.createdByName,
    })
    .select()
    .single()
  if (error) throw error
  return rowToTicket(data)
}

export async function updateTicketDb(id: string, updates: Record<string, unknown>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tickets').update(updates).eq('id', id)
  if (error) throw error
}

export async function insertTicketAction(ticketId: string, type: string, operatorName: string, operatorId: string | null, reason?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('ticket_actions').insert({
    ticket_id: ticketId,
    type,
    operator_id: operatorId,
    operator_name: operatorName,
    reason: reason || null,
  })
  if (error) throw error
}

export async function insertTicketSegment(ticketId: string, operatorName: string, operatorId: string | null, startTime: Date): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.from('ticket_time_segments').insert({
    ticket_id: ticketId,
    operator_name: operatorName,
    operator_id: operatorId,
    start_time: startTime.toISOString(),
    duration: 0,
  }).select().single()
  if (error) throw error
  return data.id
}

export async function closeTicketSegment(ticketId: string, operatorName: string, endTime: Date, duration: number): Promise<void> {
  const supabase = createClient()
  // Fechar o segmento mais recente deste operador neste ticket
  const { data } = await supabase
    .from('ticket_time_segments')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('operator_name', operatorName)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (data?.id) {
    await supabase
      .from('ticket_time_segments')
      .update({ end_time: endTime.toISOString(), duration })
      .eq('id', data.id)
  }
}

export async function insertUsedParts(ticketId: string, usedParts: UsedPart[]): Promise<void> {
  if (!usedParts.length) return
  const supabase = createClient()
  const { error } = await supabase.from('ticket_used_parts').insert(
    usedParts.map(p => ({ ticket_id: ticketId, part_id: p.partId, quantity: p.quantity }))
  )
  if (error) throw error
}

// ─── MANUTENCOES PROGRAMADAS ───────────────────────────────

export async function fetchScheduledMaintenances(): Promise<ScheduledMaintenance[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('scheduled_maintenances')
    .select('*')
    .order('scheduled_date', { ascending: true })
  if (error) throw error
  return (data || []).map(row => ({
    id: row.id,
    machineId: row.machine_id,
    title: row.title,
    description: row.description || '',
    scheduledDate: new Date(row.scheduled_date),
    type: row.type as ScheduledMaintenance['type'],
    status: row.status as ScheduledMaintenance['status'],
    createdAt: new Date(row.created_at),
  }))
}

export async function insertScheduledMaintenance(data: Omit<ScheduledMaintenance, 'id' | 'createdAt' | 'status'>, createdBy: string, createdByName: string): Promise<ScheduledMaintenance> {
  const supabase = createClient()
  const { data: row, error } = await supabase
    .from('scheduled_maintenances')
    .insert({
      machine_id: data.machineId,
      title: data.title,
      description: data.description || null,
      scheduled_date: data.scheduledDate.toISOString(),
      type: data.type,
      status: 'pending',
      created_by: createdBy,
      created_by_name: createdByName,
    })
    .select()
    .single()
  if (error) throw error
  return {
    id: row.id,
    machineId: row.machine_id,
    title: row.title,
    description: row.description || '',
    scheduledDate: new Date(row.scheduled_date),
    type: row.type,
    status: row.status,
    createdAt: new Date(row.created_at),
  }
}

export async function updateScheduledMaintenanceDb(id: string, updates: Partial<ScheduledMaintenance>): Promise<void> {
  const supabase = createClient()
  const dbUpdates: Record<string, unknown> = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate.toISOString()
  if (updates.type !== undefined) dbUpdates.type = updates.type
  if (updates.status !== undefined) dbUpdates.status = updates.status
  const { error } = await supabase.from('scheduled_maintenances').update(dbUpdates).eq('id', id)
  if (error) throw error
}

export async function deleteScheduledMaintenanceDb(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('scheduled_maintenances').delete().eq('id', id)
  if (error) throw error
}

// ─── PROFILES (usuarios) ───────────────────────────────────

export async function fetchProfiles() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, active, created_at')
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createUserInSupabase(name: string, email: string, password: string, role: string): Promise<{ id: string }> {
  // Usar API Route server-side que utiliza o service_role_key
  // Isso contorna a restricao de "Email signups are disabled"
  const response = await fetch('/api/users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Erro ao criar usuario')
  }

  return { id: result.id }
}

export async function updateProfileDb(id: string, updates: { name?: string; email?: string; role?: string; active?: boolean }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  if (error) throw error
}

export async function deactivateUserDb(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update({ active: false }).eq('id', id)
  if (error) throw error
}
