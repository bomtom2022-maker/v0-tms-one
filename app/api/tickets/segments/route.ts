import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuidOrNull(value: unknown): string | null {
  if (typeof value === 'string' && UUID_REGEX.test(value)) return value
  return null
}

export async function POST(request: Request) {
  try {
    const { ticketId, operatorName, operatorId, startTime } = await request.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('ticket_time_segments').insert({
      ticket_id: ticketId,
      operator_name: operatorName,
      operator_id: toUuidOrNull(operatorId),
      start_time: startTime,
      duration: 0,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { ticketId, operatorName, endTime, duration } = await request.json()
    const supabase = createAdminClient()
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
      await supabase.from('ticket_time_segments').update({ end_time: endTime, duration }).eq('id', data.id)
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
