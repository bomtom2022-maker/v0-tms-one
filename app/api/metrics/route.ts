import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Buscar métricas da View v_metricas_reais ou da função RPC fn_metricas_por_periodo
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de data (opcionais)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    
    // Buscar configuração de horas mensais
    const { data: configData } = await supabase
      .from('company_config')
      .select('config_value')
      .eq('config_key', 'monthly_operation_hours')
      .single()
    
    // Se não existir, usar 0 (não configurado)
    const monthlyHours = configData ? parseFloat(configData.config_value) : 0
    
    let metricsData = null
    let metricsError = null
    let usedFallback = false
    
    // Se há datas customizadas, tentar usar a função RPC
    if (fromDate && toDate) {
      const { data, error } = await supabase
        .rpc('fn_metricas_por_periodo', {
          from_date: fromDate,
          to_date: toDate
        })
      
      if (error) {
        console.error('Erro na RPC fn_metricas_por_periodo:', error)
        // Fallback: usar a View padrão se a RPC falhar
        console.log('Usando fallback para View v_metricas_reais')
        const { data: viewData, error: viewError } = await supabase
          .from('v_metricas_reais')
          .select('*')
        metricsData = viewData
        metricsError = viewError
        usedFallback = true
      } else {
        metricsData = data
      }
    } else {
      // Sem datas, usar a View padrão (mês atual)
      const { data, error } = await supabase
        .from('v_metricas_reais')
        .select('*')
      metricsData = data
      metricsError = error
    }
    
    if (metricsError) {
      console.error('Erro ao buscar métricas:', metricsError)
      // Retornar dados vazios em vez de erro 500 para não quebrar a UI
      return NextResponse.json({ 
        monthlyHours,
        metrics: [],
        period: fromDate && toDate ? { from: fromDate, to: toDate } : null,
        error: metricsError.message,
        usedFallback
      })
    }
    
    return NextResponse.json({
      monthlyHours,
      metrics: metricsData || [],
      period: fromDate && toDate ? { from: fromDate, to: toDate } : null,
      usedFallback
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
