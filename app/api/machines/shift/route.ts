import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function PUT(request: Request) {
  try {
    const { machineId, shiftId } = await request.json()
    
    if (!machineId) {
      return NextResponse.json({ error: 'ID da máquina é obrigatório' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('machines')
      .update({ shift_id: shiftId || null })
      .eq('id', machineId)
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
