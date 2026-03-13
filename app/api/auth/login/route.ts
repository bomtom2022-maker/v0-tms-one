import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

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

    // Autenticar usando o cliente Supabase com a anon key no servidor
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: signInError } = await authClient.auth.signInWithPassword({
      email: profile.email.toLowerCase().trim(),
      password,
    })

    if (signInError) {
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
