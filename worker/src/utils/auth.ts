const encoder = new TextEncoder();

export const COOKIE_NAME = 'eschedule_session';
export const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 horas

// ─── helpers hex ────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// ─── password hashing (PBKDF2 + SHA-256) ───────────────────────────────────

export async function generateSalt(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

export async function hashPassword(
  password: string,
  salt: string,
  iterations: number = 210000
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string,
  iterations: number
): Promise<boolean> {
  const hash = await hashPassword(password, salt, iterations);
  // Comparación en tiempo constante para evitar timing attacks
  if (hash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

// ─── token de sesión ─────────────────────────────────────────────────────────

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

export async function hashToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return bytesToHex(new Uint8Array(bytes));
}

// ─── cookies ────────────────────────────────────────────────────────────────

function isSecureRequest(url: string): boolean {
  return url.startsWith('https://');
}

export function buildSetCookieHeader(token: string, requestUrl: string): string {
  const https = isSecureRequest(requestUrl);
  // SameSite=None requiere Secure y solo funciona sobre HTTPS.
  // Cuando el frontend y la API están en dominios distintos (Railway + Cloudflare),
  // el navegador solo enviará la cookie si es SameSite=None;Secure.
  const securePart = https ? '; Secure' : '';
  const sameSite = https ? 'None' : 'Lax';
  return `${COOKIE_NAME}=${token}; HttpOnly${securePart}; SameSite=${sameSite}; Path=/; Max-Age=${SESSION_DURATION_SECONDS}`;
}

export function buildClearCookieHeader(requestUrl: string): string {
  const https = isSecureRequest(requestUrl);
  const securePart = https ? '; Secure' : '';
  const sameSite = https ? 'None' : 'Lax';
  return `${COOKIE_NAME}=; HttpOnly${securePart}; SameSite=${sameSite}; Path=/; Max-Age=0`;
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, value] = part.trim().split('=');
    if (key === COOKIE_NAME && value) return value;
  }
  return null;
}

// ─── validación de password ──────────────────────────────────────────────────

export function validatePassword(password: string): string | null {
  if (typeof password !== 'string' || password.length < 10)
    return 'La contraseña debe tener al menos 10 caracteres';
  if (!/[a-zA-Z]/.test(password))
    return 'La contraseña debe tener al menos una letra';
  if (!/[0-9]/.test(password))
    return 'La contraseña debe tener al menos un número';
  return null;
}
