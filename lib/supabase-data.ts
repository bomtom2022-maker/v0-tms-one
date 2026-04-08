import type { Machine, Problem, Part, Ticket, ScheduledMaintenance, UsedPart, MachineStatus, Priority, MaintenanceAction, TimeSegment, Shift } from '@/lib/types'

// v2 — todas as operacoes via API Routes (sem createClient browser)
const FETCH_TIMEOUT_MS = 15000 // 15s

async function apiFetch(url: string, options?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Timeout ao conectar com ${url} (>${FETCH_TIMEOUT_MS / 1000}s)`)
    }
    throw new Error(`Falha de rede em ${url}: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    clearTimeout(timeoutId)
  }
  // Verificar se a resposta é JSON antes de parsear
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Resposta nao-JSON em ${url} (status ${res.status})`)
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro na requisicao ${url}`)
  return data
}

// ─── MAQUINAS ──────────────────────────────────────────────

export async function fetchMachines(includeInactive = false): Promise<Machine[]> {
  const url = includeInactive ? '/api/machines?includeInactive=true' : '/api/machines'
  const data = await apiFetch(url)
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    sector: row.sector as string,
    manufacturer: (row.manufacturer as string) || undefined,
    model: (row.model as string) || undefined,
    controller: (row.controller as string) || undefined,
    status: row.status as MachineStatus,
    shiftId: (row.shift_id as string) || undefined,
    isActive: row.is_active !== false, // default true se coluna não existir
    preventiveIntervalDays: row.preventive_interval_days ? Number(row.preventive_interval_days) : undefined,
    lastPreventiveDate: row.last_preventive_date ? new Date(row.last_preventive_date as string) : undefined,
  }))
}

// Atualizar campos de preventiva de uma máquina
export async function updateMachinePreventive(machineId: string, lastPreventiveDate: Date): Promise<void> {
  await apiFetch('/api/machines/preventive', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machineId, lastPreventiveDate: lastPreventiveDate.toISOString() }),
  })
}

export async function insertMachine(name: string, sector: string, status: MachineStatus, manufacturer?: string, model?: string, controller?: string): Promise<Machine> {
  const row = await apiFetch('/api/machines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sector, status, manufacturer, model, controller }),
  })
  return { id: row.id, name: row.name, sector: row.sector, status: row.status, manufacturer: row.manufacturer, model: row.model, controller: row.controller }
}

export async function updateMachineDb(id: string, name: string, sector: string, status: MachineStatus, manufacturer?: string, model?: string, controller?: string, preventiveIntervalDays?: number, lastPreventiveDate?: string): Promise<void> {
  await apiFetch('/api/machines', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, sector, status, manufacturer, model, controller, preventiveIntervalDays, lastPreventiveDate }),
  })
}

export async function deleteMachineDb(id: string): Promise<void> {
  await apiFetch('/api/machines', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

// ─── PROBLEMAS ─────────────────────────────────────────────

export async function fetchProblems(): Promise<Problem[]> {
  const data = await apiFetch('/api/problems')
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    defaultPriority: row.default_priority as Priority,
    requiresManualPriority: (row.requires_manual_priority as boolean) ?? false,
  }))
}

export async function insertProblem(name: string, defaultPriority: Priority, requiresManualPriority = false): Promise<Problem> {
  const row = await apiFetch('/api/problems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, default_priority: defaultPriority, requires_manual_priority: requiresManualPriority }),
  })
  return { id: row.id, name: row.name, defaultPriority: row.default_priority, requiresManualPriority: row.requires_manual_priority }
}

export async function updateProblemDb(id: string, name: string, defaultPriority: Priority): Promise<void> {
  await apiFetch('/api/problems', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, default_priority: defaultPriority }),
  })
}

// ─── PECAS ─────────────────────────────────────────────────

export async function fetchParts(): Promise<Part[]> {
  const data = await apiFetch('/api/parts')
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    price: Number(row.price),
    description: (row.description as string) ?? undefined,
    stock: (row.stock as number) ?? 0,
  }))
}

export async function insertPart(name: string, price: number, description?: string): Promise<Part> {
  const row = await apiFetch('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, description }),
  })
  return { id: row.id, name: row.name, price: Number(row.price), description: row.description }
}

export async function updatePartDb(id: string, name: string, price: number, description?: string): Promise<void> {
  await apiFetch('/api/parts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, price, description }),
  })
}

export async function deletePartDb(id: string): Promise<void> {
  await apiFetch('/api/parts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

export async function rejectTicketDb(
  ticketId: string,
  rejectionReason: string,
  rejectedBy: string,
  rejectedByName: string
): Promise<void> {
  await apiFetch('/api/tickets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, rejectionReason, rejectedBy, rejectedByName }),
  })
}

// ─── TICKETS ───────────────────────────────────────────────

function rowToTicket(row: Record<string, unknown>, actions: MaintenanceAction[] = [], usedParts: UsedPart[] = [], timeSegments: TimeSegment[] = []): Ticket {
  const status = row.status as Ticket['status']

  // Calcular downtime real a partir dos segmentos de tempo
  // Segmentos fechados: somar durations. Segmento aberto (in-progress): somar elapsed até agora.
  let calculatedDowntime = timeSegments.reduce((sum, seg) => {
    if (seg.endTime) {
      return sum + (seg.duration || Math.floor((new Date(seg.endTime).getTime() - new Date(seg.startTime).getTime()) / 1000))
    } else if (status === 'in-progress') {
      // Segmento aberto — calcular até agora
      return sum + Math.floor((Date.now() - new Date(seg.startTime).getTime()) / 1000)
    }
    return sum
  }, 0)

  // Se não há segmentos, usar fallback das actions (compatibilidade com dados antigos)
  if (calculatedDowntime === 0 && actions.length > 0) {
    let accumulated = Number(row.accumulated_time) || 0
    // Encontrar último start/resume
    const lastStart = [...actions].reverse().find(a => a.type === 'start' || a.type === 'resume')
    if (lastStart && status === 'in-progress') {
      accumulated += Math.floor((Date.now() - new Date(lastStart.timestamp).getTime()) / 1000)
    }
    calculatedDowntime = accumulated
  }

  // Para tickets finalizados, usar o maior entre banco e calculado (banco pode estar correto)
  const dbDowntime = Number(row.downtime) || 0
  const finalDowntime = status === 'completed' || status === 'unresolved'
    ? Math.max(dbDowntime, calculatedDowntime)
    : calculatedDowntime

  // accumulatedTime: para tickets finalizados usa downtime final; para outros usa accumulated_time do banco
  const dbAccumulated = Number(row.accumulated_time) || 0
  const finalAccumulated = (status === 'completed' || status === 'unresolved')
    ? finalDowntime
    : dbAccumulated

  return {
    id: row.id as string,
    machineId: row.machine_id as string,
    problemId: row.problem_id as string,
    observation: (row.observation as string) || '',
    priority: row.priority as Priority,
    status,
    createdAt: new Date(row.created_at as string),
    startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    usedParts,
    totalCost: Number(row.total_cost) || 0,
    downtime: finalDowntime,
    accumulatedTime: finalAccumulated,
    actions,
    timeSegments,
    completionNotes: (row.completion_notes as string) ?? undefined,
    resolved: row.resolved as boolean | undefined,
    machineStopped: (row.machine_stopped as boolean) || false,
    createdBy: row.created_by as string,
    createdByName: row.created_by_name as string,
    reportedDuration: row.reported_duration ? Number(row.reported_duration) : undefined,
    customProblemName: (row.custom_problem_name as string) ?? undefined,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string) : undefined,
    cancellationReason: (row.cancellation_reason as string) ?? undefined,
    cancelledBy: (row.cancelled_by as string) ?? undefined,
    cancelledByName: (row.cancelled_by_name as string) ?? undefined,
  }
}

export async function fetchTickets(): Promise<Ticket[]> {
  const { tickets, actions, usedParts, segments } = await apiFetch('/api/tickets')

  const actionsMap: Record<string, MaintenanceAction[]> = {}
  for (const a of actions) {
    if (!actionsMap[a.ticket_id]) actionsMap[a.ticket_id] = []
    actionsMap[a.ticket_id].push({
      type: a.type as MaintenanceAction['type'],
      operatorName: a.operator_name,
      timestamp: new Date(a.timestamp),
      reason: a.reason ?? undefined,
    })
  }

  const partsMap: Record<string, UsedPart[]> = {}
  for (const p of usedParts) {
    if (!partsMap[p.ticket_id]) partsMap[p.ticket_id] = []
    partsMap[p.ticket_id].push({ partId: p.part_id, quantity: p.quantity })
  }

  const segmentsMap: Record<string, TimeSegment[]> = {}
  for (const s of segments) {
    if (!segmentsMap[s.ticket_id]) segmentsMap[s.ticket_id] = []
    segmentsMap[s.ticket_id].push({
      operatorName: s.operator_name,
      startTime: new Date(s.start_time),
      endTime: s.end_time ? new Date(s.end_time) : undefined,
      duration: s.duration || 0,
    })
  }

  return tickets.map((row: Record<string, unknown>) =>
    rowToTicket(row, actionsMap[row.id as string], partsMap[row.id as string], segmentsMap[row.id as string])
  )
}

export async function insertTicket(ticketData: Omit<Ticket, 'id' | 'createdAt' | 'usedParts' | 'totalCost' | 'downtime' | 'accumulatedTime' | 'actions' | 'status' | 'timeSegments'>): Promise<Ticket> {
  const row = await apiFetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData),
  })
  return rowToTicket(row)
}

export async function updateTicketDb(id: string, updates: Record<string, unknown>): Promise<void> {
  await apiFetch('/api/tickets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
}

export async function insertTicketAction(ticketId: string, type: string, operatorName: string, operatorId: string | null, reason?: string): Promise<void> {
  await apiFetch('/api/tickets/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, type, operatorName, operatorId, reason }),
  })
}

export async function insertTicketSegment(ticketId: string, operatorName: string, operatorId: string | null, startTime: Date): Promise<string> {
  const data = await apiFetch('/api/tickets/segments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, operatorName, operatorId, startTime: startTime.toISOString() }),
  })
  return data.id
}

export async function closeTicketSegment(ticketId: string, endTime: Date, duration: number): Promise<void> {
  await apiFetch('/api/tickets/segments', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, endTime: endTime.toISOString(), duration }),
  })
}

export async function insertUsedParts(ticketId: string, usedParts: UsedPart[]): Promise<void> {
  if (!usedParts.length) return
  await apiFetch('/api/tickets/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, usedParts }),
  })
}

// ─── MANUTENCOES PROGRAMADAS ───────────────────────────────

export async function fetchScheduledMaintenances(): Promise<ScheduledMaintenance[]> {
  const data = await apiFetch('/api/maintenances')
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    machineId: row.machine_id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    scheduledDate: new Date(row.scheduled_date as string),
    type: row.type as ScheduledMaintenance['type'],
    status: row.status as ScheduledMaintenance['status'],
    createdAt: new Date(row.created_at as string),
  }))
}

export async function insertScheduledMaintenance(data: Omit<ScheduledMaintenance, 'id' | 'createdAt' | 'status'>, createdBy: string, createdByName: string): Promise<ScheduledMaintenance> {
  const row = await apiFetch('/api/maintenances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      machineId: data.machineId,
      title: data.title,
      description: data.description,
      scheduledDate: data.scheduledDate.toISOString(),
      type: data.type,
      createdBy,
      createdByName,
    }),
  })
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
  await apiFetch('/api/maintenances', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.scheduledDate !== undefined && { scheduledDate: updates.scheduledDate.toISOString() }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.status !== undefined && { status: updates.status }),
    }),
  })
}

export async function deleteScheduledMaintenanceDb(id: string): Promise<void> {
  await apiFetch('/api/maintenances', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

// ─── AUDIT LOGS ────────────────────────────────────────────

export async function fetchAuditLogs(): Promise<import('./types').AuditLog[]> {
  const data = await apiFetch('/api/audit')
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    action: row.action as import('./types').AuditLogAction,
    userId: row.userId as string,
    userName: row.userName as string,
    timestamp: new Date(row.timestamp as string),
    entityType: row.entityType as import('./types').AuditLog['entityType'],
    entityId: row.entityId as string,
    entityName: row.entityName as string,
    details: row.details as string,
    metadata: (row.metadata as Record<string, unknown>) || {},
  }))
}

export async function fetchProfiles() {
  return apiFetch('/api/users/list')
}

export async function createUserInSupabase(name: string, email: string, password: string, role: string): Promise<{ id: string }> {
  const result = await apiFetch('/api/users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  })
  return { id: result.id }
}

export async function updateProfileDb(id: string, updates: { name?: string; email?: string; role?: string; active?: boolean; password?: string }): Promise<void> {
  await apiFetch('/api/users/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
}

export async function deactivateUserDb(id: string): Promise<void> {
  await apiFetch('/api/users/delete', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

// ─── TURNOS (SHIFTS) ───────────────────────────────────────

export async function fetchShifts(): Promise<Shift[]> {
  const data = await apiFetch('/api/shifts')
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    hoursPerDay: row.hours_per_day as number,
    daysPerWeek: row.days_per_week as number,
    description: (row.description as string) || undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }))
}

export async function insertShift(name: string, hoursPerDay: number, daysPerWeek: number, description?: string): Promise<Shift> {
  const row = await apiFetch('/api/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, hours_per_day: hoursPerDay, days_per_week: daysPerWeek, description }),
  })
  return {
    id: row.id,
    name: row.name,
    hoursPerDay: row.hours_per_day,
    daysPerWeek: row.days_per_week,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function updateShiftDb(id: string, name: string, hoursPerDay: number, daysPerWeek: number, description?: string): Promise<void> {
  await apiFetch('/api/shifts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, hours_per_day: hoursPerDay, days_per_week: daysPerWeek, description }),
  })
}

export async function deleteShiftDb(id: string): Promise<void> {
  await apiFetch('/api/shifts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

export async function updateMachineShift(machineId: string, shiftId: string | null): Promise<void> {
  await apiFetch('/api/machines/shift', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machineId, shiftId }),
  })
}

// ─── MÉTRICAS POR PERÍODO ──────────────────────────────────

export interface MetricsResponse {
  monthlyHours: number
  metrics: Array<{
    machine_id: string
    machine_name: string
    total_falhas: number
    downtime_horas: number
    uptime_horas: number
    mtbf: number
    mttr: number
    disponibilidade: number
  }>
  period: { from: string; to: string } | null
}

export async function fetchMetricsByPeriod(fromDate?: string, toDate?: string): Promise<MetricsResponse> {
  let url = '/api/metrics'
  
  if (fromDate && toDate) {
    url += `?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
  }
  
  const data = await apiFetch(url)
  return {
    monthlyHours: data.monthlyHours || 0,
    metrics: data.metrics || [],
    period: data.period || null
  }
}
