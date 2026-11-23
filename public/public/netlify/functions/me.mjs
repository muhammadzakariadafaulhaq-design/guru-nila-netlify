import { json, verifySession } from './_auth.mjs';

export const config = { path: '/api/me' };

export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'Metode tidak diizinkan.' }, 405, { Allow: 'GET' });
  return json({ authenticated: verifySession(request) });
}
