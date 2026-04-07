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
      // Se a tabela não existe ou não encontrou registro, retorna 0 (não configurado)
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return NextResponse.json({ 
          config_key: 'monthly_operation_hours',
          config_value: '0',
          description: 'Total de horas de operação da empresa no mês - não configurado'
        })
      }
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar configuração:', error)
    return NextResponse.json({ 
      config_key: 'monthly_operation_hours',
      config_value: '0',
      description: 'Total de horas de operação da empresa no mês - não configurado'
    })
  }
}

// PUT - Atualizar configuração (apenas admin)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { hours } = body
    
    if (!hours || isNaN(Number(hours))) {
      return NextResponse.json({ error: 'Horas inválidas' }, { status: 400 })
    }
    
    // Primeiro tenta atualizar o registro existente
    const { data: existingData, error: selectError } = await supabase
      .from('company_config')
      .select('id')
      .eq('config_key', 'monthly_operation_hours')
      .single()
    
    let data, error
    
    if (existingData) {
      // Atualizar registro existente
      const result = await supabase
        .from('company_config')
        .update({
          config_value: String(hours)
        })
        .eq('config_key', 'monthly_operation_hours')
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Inserir novo registro
      const result = await supabase
        .from('company_config')
        .insert({
          config_key: 'monthly_operation_hours',
          config_value: String(hours),
          description: 'Total de horas de operação da empresa no mês'
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
  }
}
