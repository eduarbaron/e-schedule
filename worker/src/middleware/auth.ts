import type { Context, Next } from 'hono';
import type { AppEnv } from '../types';
import { getSessionToken, hashToken } from '../utils/auth';

// Rutas que NO requieren autenticación
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/health',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const pathname = new URL(c.req.url).pathname;
  if (isPublicPath(pathname)) return next();

  const token = getSessionToken(c.req.header('cookie') ?? null);
  if (!token) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();

  const row = await c.env.e_schedule_db
    .prepare(
      `SELECT s.id, u.id as uid, u.nombre, u.email, u.rol, u.activo
       FROM sesiones s
       JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > ?`
    )
    .bind(tokenHash, now)
    .first<{ id: string; uid: string; nombre: string; email: string; rol: string; activo: number }>();

  if (!row) {
    return c.json({ error: 'Sesión inválida o expirada' }, 401);
  }

  if (!row.activo) {
    return c.json({ error: 'Usuario inactivo' }, 403);
  }

  c.set('user', {
    id: row.uid,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol as 'admin' | 'coordinador',
  });

  return next();
}

export function requireRole(...roles: Array<'admin' | 'coordinador'>) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.rol)) {
      return c.json({ error: 'Acceso no autorizado' }, 403);
    }
    return next();
  };
}
