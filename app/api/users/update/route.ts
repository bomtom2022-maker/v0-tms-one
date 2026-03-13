import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function PUT(request: Request) {
  try {
    const { id, name, email, role, password } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do usuario e obrigatorio' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const updates: Record<string, string> = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (role !== undefined) updates.role = role
    if (password !== undefined) updates.password_hash = hashPassword(password)

    const { error } = await adminClient.from('profiles').update(updates).eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
