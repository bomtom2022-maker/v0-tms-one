import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { ticketId, usedParts } = await request.json()
    if (!usedParts?.length) return NextResponse.json({ success: true })
    const supabase = createAdminClient()
    const { error } = await supabase.from('ticket_used_parts').insert(
      usedParts.map((p: { partId: string; quantity: number }) => ({
        ticket_id: ticketId,
        part_id: p.partId,
        quantity: p.quantity,
      }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
