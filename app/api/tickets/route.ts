import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuidOrNull(value: unknown): string | null {
  if (typeof value === 'string' && UUID_REGEX.test(value)) return value
  return null
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const [ticketsRes, actionsRes, usedPartsRes, segmentsRes] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('ticket_actions').select('*').order('timestamp', { ascending: true }),
      supabase.from('ticket_used_parts').select('*'),
      supabase.from('ticket_time_segments').select('*').order('start_time', { ascending: true }),
    ])
    if (ticketsRes.error) return NextResponse.json({ error: ticketsRes.error.message }, { status: 500 })
    return NextResponse.json({
      tickets: ticketsRes.data || [],
      actions: actionsRes.data || [],
      usedParts: usedPartsRes.data || [],
      segments: segmentsRes.data || [],
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        machine_id: body.machineId,
        problem_id: body.problemId,
        observation: body.observation || null,
        priority: body.priority,
        status: 'open',
        machine_stopped: body.machineStopped || false,
        created_by: toUuidOrNull(body.createdBy),
        created_by_name: body.createdByName,
        // Só incluir se o campo existir no banco (pode não ter rodado a migration ainda)
        ...(body.customProblemName ? { custom_problem_name: body.customProblemName } : {}),
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

// Rejeitar ticket (apenas manutentores podem rejeitar, com justificativa obrigatória)
export async function PATCH(request: Request) {
  try {
    const { ticketId, rejectionReason, rejectedBy, rejectedByName } = await request.json()
    console.log('[v0] PATCH /api/tickets - Rejeitando ticket:', { ticketId, rejectionReason, rejectedBy, rejectedByName })
    
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return NextResponse.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { error, data } = await supabase
      .from('tickets')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: rejectionReason.trim(),
        cancelled_by: toUuidOrNull(rejectedBy),
        cancelled_by_name: rejectedByName,
      })
      .eq('id', ticketId)
      .select()
    
    console.log('[v0] Resultado do update:', { error, data })
    
    if (error) {
      console.error('[v0] Erro ao rejeitar ticket:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[v0] Erro na rota PATCH:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...rawUpdates } = await request.json()
    const supabase = createAdminClient()

    // Sanitizar campos UUID para nao quebrar com IDs locais como "admin-001"
    const updates: Record<string, unknown> = { ...rawUpdates }
    const uuidFields = ['started_by', 'completed_by', 'created_by', 'operator_id', 'accepted_by']
    for (const field of uuidFields) {
      if (field in updates) {
        updates[field] = toUuidOrNull(updates[field])
      }
    }

    const { error } = await supabase.from('tickets').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
