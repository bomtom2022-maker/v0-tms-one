import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Buscar configuração
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('company_config')
      .select('*')
      .eq('config_key', 'monthly_operation_hours')
      .single()
    
    if (error) {
      // Se a tabela não existe, retorna valor padrão
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return NextResponse.json({ 
          config_key: 'monthly_operation_hours',
          config_value: '470',
          description: 'Total de horas de operação da empresa no mês'
        })
      }
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar configuração:', error)
    return NextResponse.json({ 
      config_key: 'monthly_operation_hours',
      config_value: '470',
      description: 'Total de horas de operação da empresa no mês'
    })
  }
}

// PUT - Atualizar configuração (apenas admin)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { hours, userId } = body
    
    if (!hours || isNaN(Number(hours))) {
      return NextResponse.json({ error: 'Horas inválidas' }, { status: 400 })
    }
    
    // Tentar atualizar
    const { data, error } = await supabase
      .from('company_config')
      .upsert({
        config_key: 'monthly_operation_hours',
        config_value: String(hours),
        description: 'Total de horas de operação da empresa no mês',
        updated_at: new Date().toISOString(),
        updated_by: userId || null
      }, { onConflict: 'config_key' })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
  }
}
