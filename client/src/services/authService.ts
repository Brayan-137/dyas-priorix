import { coreRequest, setToken, clearToken } from '../api/client';

interface LoginPayload { email: string; password: string }

export async function login(email: string, password: string) {
  // El backend espera email y password, y responde con access_token
  const res = await coreRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (res.ok && res.data && res.data.access_token) {
    setToken(res.data.access_token);
  }
  return res;
}

export async function register(payload: Record<string, any>) {
  return coreRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function logout() {
  await coreRequest('/auth/logout', { method: 'POST' });
  clearToken();
}

export async function me() {
  return coreRequest('/auth/me', { method: 'GET' });
}
