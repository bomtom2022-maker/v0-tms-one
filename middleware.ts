import { type NextRequest, NextResponse } from 'next/server'

// Middleware temporariamente passivo ate a tela de login ser implementada.
// Apenas atualiza cookies de sessao do Supabase sem redirecionar.
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
