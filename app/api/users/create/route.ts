import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatorios: name, email, password, role' }, { status: 400 })
    }

    const validRoles = ['admin', 'manutentor', 'lider', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role invalida' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })

    let userId: string

    if (authError) {
      if (
        authError.message.toLowerCase().includes('already registered') ||
        authError.message.toLowerCase().includes('already been registered')
      ) {
        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers()
        if (listError) {
          return NextResponse.json({ error: listError.message }, { status: 500 })
        }
        const existingUser = listData.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
        )
        if (!existingUser) {
          return NextResponse.json({ error: 'Email ja cadastrado mas nao encontrado' }, { status: 409 })
        }
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password,
          user_metadata: { name, role },
        })
        userId = existingUser.id
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    } else {
      if (!authData.user) {
        return NextResponse.json({ error: 'Falha ao criar usuario no Auth' }, { status: 500 })
      }
      userId = authData.user.id
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        role,
        active: true,
        password_hash: hashPassword(password),
      }, { onConflict: 'id' })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ id: userId, name, email, role }, { status: 201 })

  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
