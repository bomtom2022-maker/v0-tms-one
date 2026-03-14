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
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
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
    const uuidFields = ['started_by', 'completed_by', 'created_by', 'operator_id']
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
