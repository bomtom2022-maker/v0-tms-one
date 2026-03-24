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
        custom_problem_name: body.customProblemName || null,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

// Cancelar ticket (apenas o dono do chamado pode cancelar)
export async function PATCH(request: Request) {
  try {
    const { ticketId, cancellationReason, cancelledBy, cancelledByName, createdBy } = await request.json()
    
    // Verificar se quem está cancelando é o dono do chamado
    if (cancelledBy !== createdBy) {
      return NextResponse.json({ error: 'Apenas o criador do chamado pode cancelá-lo' }, { status: 403 })
    }
    
    if (!cancellationReason || cancellationReason.trim().length === 0) {
      return NextResponse.json({ error: 'Justificativa de cancelamento é obrigatória' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationReason.trim(),
        cancelled_by: toUuidOrNull(cancelledBy),
        cancelled_by_name: cancelledByName,
      })
      .eq('id', ticketId)
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
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
