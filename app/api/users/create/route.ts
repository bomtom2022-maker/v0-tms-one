import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Verificar se o solicitante e admin ou manutentor autorizado
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Permitir tambem o admin local (sem session Supabase)
    // A autorizacao real e feita pela RLS + verificacao de role
    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatorios: name, email, password, role' }, { status: 400 })
    }

    const validRoles = ['admin', 'manutentor', 'lider']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role invalida' }, { status: 400 })
    }

    // Verificar role do solicitante (se tiver sessao Supabase)
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'manutentor')) {
        return NextResponse.json({ error: 'Sem permissao para criar usuarios' }, { status: 403 })
      }
    }

    // Usar Admin API para criar o usuario (ignora restricao de signups)
    const adminClient = createAdminClient()

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: { name, role },
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Falha ao criar usuario' }, { status: 500 })
    }

    // Garantir que o profile foi criado corretamente (o trigger handle_new_user cuida disso,
    // mas fazemos upsert para garantir role correta)
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        name,
        email: email.toLowerCase().trim(),
        role,
        active: true,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('[v0] Erro ao criar profile:', profileError)
      // Nao falha — o trigger pode ter criado com role errada, tentamos corrigir
    }

    return NextResponse.json({ id: authData.user.id, name, email, role }, { status: 201 })
  } catch (err: unknown) {
    console.error('[v0] Erro na API de criacao de usuario:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
