import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuidOrNull(value: unknown): string | null {
  if (typeof value === 'string' && UUID_REGEX.test(value)) return value
  return null
}

// Inserir action no ticket
export async function POST(request: Request) {
  try {
    const { ticketId, type, operatorName, operatorId, reason } = await request.json()
    const supabase = createAdminClient()
    const { error } = await supabase.from('ticket_actions').insert({
      ticket_id: ticketId,
      type,
      operator_id: toUuidOrNull(operatorId),
      operator_name: operatorName,
      reason: reason || null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
