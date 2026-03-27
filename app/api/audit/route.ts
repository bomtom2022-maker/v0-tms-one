import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Buscar tickets com suas actions para derivar logs de auditoria
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id, created_at, machine_id, problem_id, status, priority,
        created_by, created_by_name, completed_at, downtime, total_cost,
        completion_notes, resolved, observation,
        ticket_actions ( id, ticket_id, type, operator_name, operator_id, reason, timestamp ),
        ticket_used_parts ( part_id, quantity )
      `)
      .order('created_at', { ascending: false })

    if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 })

    // Buscar máquinas e problemas para enriquecer os logs
    const { data: machines } = await supabase.from('machines').select('id, name, sector')
    const { data: problems } = await supabase.from('problems').select('id, name')
    const { data: parts } = await supabase.from('parts').select('id, name, price')

    const machineMap: Record<string, string> = {}
    const problemMap: Record<string, string> = {}
    const partMap: Record<string, { name: string; price: number }> = {}

    for (const m of machines || []) machineMap[m.id] = m.name
    for (const p of problems || []) problemMap[p.id] = p.name
    for (const p of parts || []) partMap[p.id] = { name: p.name, price: p.price }

    // Derivar logs de auditoria a partir das actions dos tickets
    const logs: Array<{
      id: string
      action: string
      userId: string
      userName: string
      timestamp: string
      entityType: string
      entityId: string
      entityName: string
      details: string
      metadata: Record<string, unknown>
    }> = []

    for (const ticket of tickets || []) {
      const machineName = machineMap[ticket.machine_id] || 'Desconhecida'
      const problemName = problemMap[ticket.problem_id] || 'Desconhecido'

      // Log de criação do ticket
      logs.push({
        id: `${ticket.id}-created`,
        action: 'ticket_created',
        userId: ticket.created_by || '',
        userName: ticket.created_by_name || 'Sistema',
        timestamp: ticket.created_at,
        entityType: 'ticket',
        entityId: ticket.id,
        entityName: machineName,
        details: `Chamado criado: ${machineName} — ${problemName}`,
        metadata: {
          machineId: ticket.machine_id,
          problemId: ticket.problem_id,
          priority: ticket.priority,
        }
      })

      // Logs das actions
      for (const action of (ticket.ticket_actions || []) as Array<{id: string; type: string; operator_name: string; operator_id: string; reason?: string; timestamp: string}>) {
        const actionTypeMap: Record<string, string> = {
          start: 'ticket_started',
          pause: 'ticket_paused',
          resume: 'ticket_resumed',
          complete: 'ticket_completed',
          cancel: 'ticket_cancelled',
        }
        const auditAction = actionTypeMap[action.type] || `ticket_${action.type}`

        const partsUsed = action.type === 'complete'
          ? (ticket.ticket_used_parts || []).map((up: {part_id: string; quantity: number}) => ({
              name: partMap[up.part_id]?.name || 'Peça',
              quantity: up.quantity,
              price: partMap[up.part_id]?.price || 0,
            }))
          : []

        logs.push({
          id: action.id,
          action: auditAction,
          userId: action.operator_id || '',
          userName: action.operator_name || 'Manutentor',
          timestamp: action.timestamp,
          entityType: 'ticket',
          entityId: ticket.id,
          entityName: machineName,
          details: action.type === 'pause'
            ? `Pausado: ${action.reason || 'sem motivo'}`
            : action.type === 'complete'
              ? `Finalizado — ${ticket.resolved ? 'Resolvido' : 'Não Resolvido'}`
              : `${action.type} — ${machineName}`,
          metadata: {
            machineId: ticket.machine_id,
            problemId: ticket.problem_id,
            priority: ticket.priority,
            reason: action.reason,
            resolved: ticket.resolved,
            downtime: ticket.downtime,
            totalCost: ticket.total_cost,
            partsUsed,
          }
        })
      }

      // Log de cancelamento se status = cancelled sem action
      if (ticket.status === 'cancelled') {
        const hasCancelLog = logs.some(l => l.entityId === ticket.id && l.action === 'ticket_cancelled')
        if (!hasCancelLog) {
          logs.push({
            id: `${ticket.id}-cancelled`,
            action: 'ticket_cancelled',
            userId: ticket.created_by || '',
            userName: ticket.created_by_name || 'Sistema',
            timestamp: ticket.completed_at || ticket.created_at,
            entityType: 'ticket',
            entityId: ticket.id,
            entityName: machineName,
            details: `Chamado cancelado: ${machineName}`,
            metadata: { machineId: ticket.machine_id }
          })
        }
      }
    }

    // Ordenar por timestamp desc
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(logs)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
