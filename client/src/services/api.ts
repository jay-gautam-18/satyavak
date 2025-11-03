const BASE_URL = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_BASE_URL : undefined) || 'http://localhost:8080';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const body = await res.json(); msg = body.error || JSON.stringify(body); } catch {}
    throw new Error(msg);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  // @ts-expect-error allow non-json OK responses
  return undefined;
}

export const api = {
  register(input: { email: string; name: string; password: string }) {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
  },
  login(input: { email: string; password: string }) {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
  },
  refresh() {
    return request('/api/auth/refresh', { method: 'POST' });
  },
  logout() {
    return request('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return request('/api/users/me');
  },
};
