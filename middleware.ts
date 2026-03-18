import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export { proxy as middleware }

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
