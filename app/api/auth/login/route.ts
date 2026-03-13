import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json()

    if (!name || !password) {
      return NextResponse.json({ error: 'Nome e senha sao obrigatorios' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Buscar o profile pelo nome
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, name, email, role, active, created_at')
      .ilike('name', name.trim())
      .eq('active', true)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario nao encontrado ou inativo' }, { status: 401 })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('[v0] login - SUPABASE_URL:', !!supabaseUrl)
    console.log('[v0] login - SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY)
    console.log('[v0] login - NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Configuracao do servidor incompleta' }, { status: 500 })
    }

    // Autenticar via REST com email encontrado
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({
        email: profile.email.toLowerCase().trim(),
        password,
      }),
    })

    const authData = await authResponse.json()
    console.log('[v0] login - authResponse.ok:', authResponse.ok)
    console.log('[v0] login - authData.error:', authData.error || 'nenhum')

    if (!authResponse.ok || authData.error) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    return NextResponse.json({ profile })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
