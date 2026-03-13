import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Inserir action no ticket
export async function POST(request: Request) {
  try {
    const { ticketId, type, operatorName, operatorId, reason } = await request.json()
    const supabase = createAdminClient()
    const { error } = await supabase.from('ticket_actions').insert({
      ticket_id: ticketId,
      type,
      operator_id: operatorId || null,
      operator_name: operatorName,
      reason: reason || null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
