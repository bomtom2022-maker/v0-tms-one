import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT - Atualizar o turno de uma maquina
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { machineId, shiftId } = body
    
    if (!machineId) {
      return NextResponse.json({ error: 'ID da maquina e obrigatorio' }, { status: 400 })
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
