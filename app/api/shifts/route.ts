import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Listar todos os turnos
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('hours_per_day', { ascending: true })
    
    if (error) {
      // Se a tabela não existe, retorna array vazio
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

// POST - Criar novo turno
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, hours_per_day, days_per_week, description } = body
    
    if (!name || !hours_per_day || !days_per_week) {
      return NextResponse.json({ error: 'Nome, horas por dia e dias por semana sao obrigatorios' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('shifts')
      .insert({ name, hours_per_day, days_per_week, description })
      .select()
      .single()
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar turno existente
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, hours_per_day, days_per_week, description } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID e obrigatorio' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('shifts')
      .update({ name, hours_per_day, days_per_week, description })
      .eq('id', id)
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover turno
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID e obrigatorio' }, { status: 400 })
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
