import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Atualizar campos de preventiva de uma máquina
export async function PUT(request: Request) {
  try {
    const { machineId, lastPreventiveDate, preventiveIntervalDays } = await request.json()
    
    if (!machineId) {
      return NextResponse.json({ error: 'machineId é obrigatório' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    const updates: Record<string, unknown> = {}
    if (lastPreventiveDate) {
      updates.last_preventive_date = lastPreventiveDate
    }
    if (preventiveIntervalDays !== undefined) {
      updates.preventive_interval_days = preventiveIntervalDays
    }
    
    const { error } = await supabase
      .from('machines')
      .update(updates)
      .eq('id', machineId)
    
    if (error) {
      console.error('Erro ao atualizar preventiva:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
