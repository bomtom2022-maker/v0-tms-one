import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha sao obrigatorios' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Variaveis de ambiente nao configuradas' }, { status: 500 })
    }

    // Autenticar usando a API REST do Supabase diretamente no servidor
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    })

    const authData = await authResponse.json()

    if (!authResponse.ok || authData.error) {
      const msg = authData.error_description || authData.error || 'Email ou senha incorretos'
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
        return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
      }
      if (msg.includes('Email not confirmed')) {
        return NextResponse.json({ error: 'Email nao confirmado' }, { status: 401 })
      }
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Falha ao autenticar' }, { status: 401 })
    }

    // Buscar perfil via admin client
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, name, email, role, active, created_at')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })
    }

    if (!profile.active) {
      return NextResponse.json({ error: 'Usuario inativo. Contate o administrador.' }, { status: 403 })
    }

    return NextResponse.json({ profile })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
