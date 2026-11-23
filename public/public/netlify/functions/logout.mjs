import { clearSessionCookie, json, sameOrigin } from './_auth.mjs';

export const config = { path: '/api/logout' };

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, { Allow: 'POST' });
  if (!sameOrigin(request)) return json({ error: 'Permintaan lintas situs ditolak.' }, 403);
  const isSecure = new URL(request.url).protocol === 'https:';
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(isSecure) });
}
