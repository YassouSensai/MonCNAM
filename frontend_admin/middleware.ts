import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'moncnam_session';

function isPublicPath(pathname: string) {
  if (pathname.startsWith('/auth')) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

function getRoleFromCookie(request: NextRequest): string | undefined {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    // atob produces a binary string; re-encode as UTF-8 bytes to handle accents
    const binary = atob(raw);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(json) as { user?: { role?: string } };
    return parsed.user?.role;
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  if (pathname.startsWith('/dashboard')) {
    const role = getRoleFromCookie(request);
    if (role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*).*)']
};
