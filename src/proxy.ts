import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ADMIN = ['/admin/login', '/admin/recuperar', '/admin/redefinir']

// Filtro rápido: só confere se existe cookie. A validação real da sessão acontece no servidor, em cada página e ação.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_ADMIN.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (req.cookies.has('vitrine_sessao')) return NextResponse.next()
  return NextResponse.redirect(new URL('/admin/login', req.url))
}

export const config = { matcher: ['/admin/:path*', '/preview/:path*'] }
