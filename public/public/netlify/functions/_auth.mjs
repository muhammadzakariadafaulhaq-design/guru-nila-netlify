import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'guru_nila_session';
const SESSION_SECONDS = 60 * 60 * 12;

function cookieValue(request) {
  const raw = request.headers.get('cookie') || '';
  const item = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : '';
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function constantTimeTextEqual(a, b) {
  const left = createHash('sha256').update(String(a)).digest();
  const right = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(left, right);
}

export function makeSessionCookie(secret, isSecure = true) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = `${expires}.${sign(String(expires), secret)}`;
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${isSecure ? '; Secure' : ''}`;
}

export function clearSessionCookie(isSecure = true) {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isSecure ? '; Secure' : ''}`;
}

export function verifySession(request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const token = cookieValue(request);
  const [expiresText, suppliedSignature, ...rest] = token.split('.');
  if (!expiresText || !suppliedSignature || rest.length) return false;
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = sign(expiresText, secret);
  return constantTimeTextEqual(suppliedSignature, expected);
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Non-browser clients still require a valid session/password.
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}
