export const CORE_BASE = import.meta.env.VITE_API_CORE_URL ?? 'http://localhost:8000/api';
export const GAMIFICATION_BASE = import.meta.env.VITE_API_GAMIFICATION_URL ?? 'http://localhost:8001/api';

const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY ?? 'PRI_TOKEN';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {}
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

async function request(base: string, path: string, options: RequestInit = {}) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(options.headers as any || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, { ...options, headers });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null } } catch (e) { return { ok: res.ok, status: res.status, data: text } }
}

export const coreRequest = (path: string, options?: RequestInit) => request(CORE_BASE, path, options);
export const gamificationRequest = (path: string, options?: RequestInit) => request(GAMIFICATION_BASE, path, options);
