import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    console.log('[v0] /api/users/create chamado para:', email, '| role:', role)

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatorios: name, email, password, role' }, { status: 400 })
    }

    const validRoles = ['admin', 'manutentor', 'lider']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role invalida' }, { status: 400 })
    }

    // Verificar autorizacao: aceita admin Supabase OU admin local (sem sessao)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[v0] Usuario na sessao Supabase:', user?.id ?? 'nenhum (admin local)')

    if (user) {
      // Tem sessao Supabase — verificar se e admin ou manutentor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('[v0] Role do solicitante:', profile?.role)

      if (!profile || !['admin', 'manutentor'].includes(profile.role)) {
        return NextResponse.json({ error: 'Sem permissao para criar usuarios' }, { status: 403 })
      }
    }
    // Se nao tiver sessao Supabase, assume admin local — permitir

    // Usar Admin API para criar o usuario (ignora restricao de signups publicos)
    const adminClient = createAdminClient()

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })

    if (authError) {
      console.error('[v0] Erro ao criar usuario no Auth:', authError.message)
      if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already been registered')) {
        return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Falha ao criar usuario no Auth' }, { status: 500 })
    }

    console.log('[v0] Usuario Auth criado:', authData.user.id)

    // Upsert do profile com role correta (o trigger pode criar com role errada)
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
      console.error('[v0] Erro ao criar profile:', profileError.message)
    } else {
      console.log('[v0] Profile criado/atualizado com sucesso')
    }

    return NextResponse.json({ id: authData.user.id, name, email, role }, { status: 201 })

  } catch (err: unknown) {
    console.error('[v0] Erro inesperado na API create user:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
