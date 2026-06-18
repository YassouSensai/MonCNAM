const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: Method;
    token?: string;
    body?: unknown;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', token, body } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token: string
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}
