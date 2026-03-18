import { type NextRequest, NextResponse } from 'next/server'

// Middleware passivo — deixa todas as requisicoes passarem sem redirecionamento.
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
