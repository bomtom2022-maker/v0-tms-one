import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = createAdminClient()
    
    // 1. Criar tabela shifts se não existir
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL UNIQUE,
          hours_per_day INTEGER NOT NULL DEFAULT 8,
          days_per_week INTEGER NOT NULL DEFAULT 5,
          description TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    })
    
    // Se não existe a função rpc, vamos usar uma abordagem alternativa
    // Inserir diretamente na tabela shifts (se já existir)
    
    // 2. Inserir turnos padrão
    const defaultShifts = [
      { name: 'Turno Único (8h)', hours_per_day: 8, days_per_week: 5, description: '1 turno de 8 horas, 5 dias por semana' },
      { name: 'Dois Turnos (16h)', hours_per_day: 16, days_per_week: 5, description: '2 turnos de 8 horas, 5 dias por semana' },
      { name: 'Três Turnos (24h)', hours_per_day: 24, days_per_week: 5, description: '3 turnos de 8 horas, 5 dias por semana' },
      { name: 'Operação Contínua (24/7)', hours_per_day: 24, days_per_week: 7, description: 'Operação contínua 24 horas, 7 dias por semana' },
    ]
    
    const { error: insertError } = await supabase
      .from('shifts')
      .upsert(defaultShifts, { onConflict: 'name' })
    
    if (insertError) {
      console.error('Erro ao inserir turnos:', insertError)
      return NextResponse.json({ 
        error: insertError.message,
        hint: 'A tabela shifts pode não existir. Execute o SQL manualmente no Supabase Dashboard.'
      }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, message: 'Turnos criados com sucesso' })
  } catch (err) {
    console.error('Erro na migração:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('shifts').select('*').order('hours_per_day')
    
    if (error) {
      return NextResponse.json({ 
        error: error.message,
        tableExists: false
      }, { status: 500 })
    }
    
    return NextResponse.json({ shifts: data, tableExists: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
