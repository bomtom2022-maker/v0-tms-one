import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Buscar métricas da View v_metricas_reais e configuração de horas mensais
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Buscar configuração de horas mensais
    const { data: configData, error: configError } = await supabase
      .from('company_config')
      .select('config_value')
      .eq('config_key', 'monthly_operation_hours')
      .single()
    
    // Se não existir, usar 0 (não configurado)
    const monthlyHours = configData ? parseFloat(configData.config_value) : 0
    
    // Buscar métricas da View
    const { data: metricsData, error: metricsError } = await supabase
      .from('v_metricas_reais')
      .select('*')
    
    if (metricsError) {
      console.error('Erro ao buscar métricas:', metricsError)
      return NextResponse.json({ 
        error: 'Erro ao buscar métricas',
        details: metricsError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      monthlyHours,
      metrics: metricsData || []
    })
  } catch (error) {
    console.error('Erro na API de métricas:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      monthlyHours: 0,
      metrics: []
    }, { status: 500 })
  }
}

// PUT - Atualizar configuração de horas mensais (apenas admin)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { monthlyHours } = body
    
    if (monthlyHours === undefined || isNaN(Number(monthlyHours)) || Number(monthlyHours) < 0) {
      return NextResponse.json({ error: 'Valor de horas inválido' }, { status: 400 })
    }
    
    // Verificar se já existe o registro
    const { data: existing } = await supabase
      .from('company_config')
      .select('id')
      .eq('config_key', 'monthly_operation_hours')
      .single()
    
    if (existing) {
      // Atualizar registro existente
      const { error } = await supabase
        .from('company_config')
        .update({ config_value: String(monthlyHours) })
        .eq('config_key', 'monthly_operation_hours')
      
      if (error) throw error
    } else {
      // Inserir novo registro
      const { error } = await supabase
        .from('company_config')
        .insert({
          config_key: 'monthly_operation_hours',
          config_value: String(monthlyHours),
          description: 'Total de horas de operação da empresa no mês'
        })
      
      if (error) throw error
    }
    
    return NextResponse.json({ success: true, monthlyHours })
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
  }
}
