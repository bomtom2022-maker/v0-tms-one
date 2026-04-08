import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    const supabase = createAdminClient()
    let query = supabase
      .from('machines')
      .select('*')
      .order('created_at', { ascending: true })
    
    // Por padrão, retorna apenas máquinas ativas (soft delete)
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, sector, status, manufacturer, model, controller } = await request.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('machines')
      .insert({ name, sector, status, manufacturer: manufacturer || null, model: model || null, controller: controller || null })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, sector, status, manufacturer, model, controller } = await request.json()
    const supabase = createAdminClient()
    const { error } = await supabase.from('machines').update({ name, sector, status, manufacturer: manufacturer || null, model: model || null, controller: controller || null }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const supabase = createAdminClient()
    
    // SOFT DELETE: Apenas desativa a máquina, não exclui do banco
    // Os dados históricos de manutenção são preservados
    const { error } = await supabase
      .from('machines')
      .update({ is_active: false })
      .eq('id', id)
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
