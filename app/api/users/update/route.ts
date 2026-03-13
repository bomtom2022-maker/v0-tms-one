import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: Request) {
  try {
    const { id, name, email, role } = await request.json()

    console.log('[v0] /api/users/update - SUPABASE_URL:', !!process.env.SUPABASE_URL)
    console.log('[v0] /api/users/update - NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[v0] /api/users/update - SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (!id) {
      return NextResponse.json({ error: 'ID do usuario e obrigatorio' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const updates: Record<string, string> = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (role !== undefined) updates.role = role

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
