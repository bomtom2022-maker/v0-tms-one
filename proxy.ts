import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// proxy.ts — Next.js 16 (substitui middleware.ts)
export function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
