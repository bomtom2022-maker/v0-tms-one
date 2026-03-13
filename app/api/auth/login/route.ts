import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json()

    if (!name || !password) {
      return NextResponse.json({ error: 'Nome e senha sao obrigatorios' }, { status: 400 })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Variaveis de ambiente nao configuradas' }, { status: 500 })
    }

    // Buscar o profile pelo nome via admin client
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, name, email, role, active, created_at')
      .ilike('name', name.trim())
      .eq('active', true)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario nao encontrado ou inativo' }, { status: 401 })
    }

    // Autenticar com o email encontrado via API REST do Supabase
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ email: profile.email.toLowerCase().trim(), password }),
    })

    const authData = await authResponse.json()

    if (!authResponse.ok || authData.error) {
      const msg = authData.error_description || authData.error || ''
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
      }
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
