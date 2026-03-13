import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json()

    if (!name || !password) {
      return NextResponse.json({ error: 'Nome e senha sao obrigatorios' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Buscar o profile pelo nome incluindo password_hash
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, name, email, role, active, created_at, password_hash')
      .ilike('name', name.trim())
      .eq('active', true)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario nao encontrado ou inativo' }, { status: 401 })
    }

    // Verificar senha via hash
    if (!profile.password_hash) {
      return NextResponse.json({ error: 'Senha nao configurada. Peça ao administrador para redefinir.' }, { status: 401 })
    }

    const inputHash = hashPassword(password)
    if (inputHash !== profile.password_hash) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    // Remover password_hash da resposta
    const { password_hash: _, ...safeProfile } = profile

    return NextResponse.json({ profile: safeProfile })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
