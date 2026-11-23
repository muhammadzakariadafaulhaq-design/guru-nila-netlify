import { constantTimeTextEqual, json, makeSessionCookie, sameOrigin } from './_auth.mjs';

export const config = { path: '/api/login' };

// In-memory guard is only a best-effort supplement; configure Netlify Traffic Rules too.
const attemptsByIp = globalThis.__guruNilaLoginAttempts || (globalThis.__guruNilaLoginAttempts = new Map());
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, { Allow: 'POST' });
  if (!sameOrigin(request)) return json({ error: 'Permintaan lintas situs ditolak.' }, 403);

  const ip = request.headers.get('x-nf-client-connection-ip') || (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const attempts = attemptsByIp.get(ip);
  if (attempts && attempts.resetAt > now && attempts.count >= MAX_FAILURES) {
    return json({ error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' }, 429, { 'Retry-After': String(Math.ceil((attempts.resetAt - now) / 1000)) });
  }

  const expected = process.env.GURU_LOGIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) return json({ error: 'Login belum dikonfigurasi di Netlify Environment Variables.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Format permintaan tidak valid.' }, 400); }
  const password = typeof body?.password === 'string' ? body.password.slice(0, 512) : '';
  if (!constantTimeTextEqual(password, expected)) {
    const current = attempts && attempts.resetAt > now ? attempts : { count: 0, resetAt: now + WINDOW_MS };
    current.count += 1;
    attemptsByIp.set(ip, current);
    return json({ error: 'Kata sandi tidak cocok.' }, 401);
  }
  attemptsByIp.delete(ip);

  const isSecure = new URL(request.url).protocol === 'https:';
  return json({ ok: true }, 200, { 'Set-Cookie': makeSessionCookie(secret, isSecure) });
}
