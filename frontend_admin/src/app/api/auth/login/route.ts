import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encodeSession, SESSION_COOKIE, type Session } from '@/lib/auth-session';

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ ok: false, error: 'Email and password required.' }, { status: 400 });
  }

  // Forward credentials to the real backend
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Backend unreachable.' }, { status: 502 });
  }

  if (!backendRes.ok) {
    const detail = await backendRes.json().catch(() => ({})) as { detail?: string };
    return NextResponse.json(
      { ok: false, error: detail?.detail ?? 'Invalid credentials.' },
      { status: 401 }
    );
  }

  const { access_token, user } = (await backendRes.json()) as {
    access_token: string;
    user: { id: number; full_name: string; email: string; role: string };
  };

  if (user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Admin access required.' }, { status: 403 });
  }

  // Store JWT in an httpOnly cookie so server-side routes can forward it
  const session: Session = {
    user: {
      id: String(user.id),
      name: user.full_name,
      email: user.email,
      role: 'admin',
    },
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  // Also expose the raw JWT for client-side API calls
  cookieStore.set('token', access_token, {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  });

  return NextResponse.json({ ok: true, access_token, user });
}
