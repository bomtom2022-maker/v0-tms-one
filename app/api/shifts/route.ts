import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// API para gerenciar turnos de trabalho (shifts) - v2
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('hours_per_day', { ascending: true })
    
    if (error) {
      // Se a tabela não existe, retornar array vazio
      if (error.code === '42P01') {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, hours_per_day, days_per_week, description } = await request.json()
    
    if (!name || !hours_per_day || !days_per_week) {
      return NextResponse.json({ error: 'Nome, horas por dia e dias por semana são obrigatórios' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        name,
        hours_per_day,
        days_per_week,
        description,
      })
      .select()
      .single()
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, hours_per_day, days_per_week, description } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('shifts')
      .update({
        name,
        hours_per_day,
        days_per_week,
        description,
      })
      .eq('id', id)
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
