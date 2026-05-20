import { Hono } from 'hono';
import type { Bindings, UsuarioRow } from '../types';
import {
  generateSalt, hashPassword, verifyPassword,
  generateToken, hashToken,
  buildSetCookieHeader, buildClearCookieHeader,
  getSessionToken, validatePassword,
  SESSION_DURATION_SECONDS,
} from '../utils/auth';

const auth = new Hono<{ Bindings: Bindings }>();

// ─── GET /api/auth/bootstrap-status ─────────────────────────────────────────
// Indica si el sistema necesita crear el primer administrador.

auth.get('/bootstrap-status', async (c) => {
  const row = await c.env.e_schedule_db
    .prepare('SELECT COUNT(*) as total FROM usuarios')
    .first<{ total: number }>();
  return c.json({ needs_bootstrap: (row?.total ?? 0) === 0 });
});

// ─── POST /api/auth/bootstrap-admin ─────────────────────────────────────────
// Crea el primer administrador. Solo funciona si no existe ningún usuario.

auth.post('/bootstrap-admin', async (c) => {
  const row = await c.env.e_schedule_db
    .prepare('SELECT COUNT(*) as total FROM usuarios')
    .first<{ total: number }>();

  if ((row?.total ?? 0) > 0) {
    return c.json({ error: 'El sistema ya tiene usuarios registrados' }, 409);
  }

  const body = await c.req.json().catch(() => null);
  const nombre = String(body?.nombre ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!nombre) return c.json({ error: 'nombre es requerido' }, 400);
  if (!email || !email.includes('@')) return c.json({ error: 'email inválido' }, 400);
  const pwError = validatePassword(password);
  if (pwError) return c.json({ error: pwError }, 400);

  const salt = await generateSalt();
  const hash = await hashPassword(password, salt);
  const id = crypto.randomUUID();

  await c.env.e_schedule_db
    .prepare(
      `INSERT INTO usuarios (id, nombre, email, rol, password_hash, password_salt, password_iterations)
       VALUES (?, ?, ?, 'admin', ?, ?, 210000)`
    )
    .bind(id, nombre, email, hash, salt)
    .run();

  return c.json({ success: true, usuario: { id, nombre, email, rol: 'admin' } }, 201);
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!email || !password) {
    return c.json({ error: 'email y password son requeridos' }, 400);
  }

  const usuario = await c.env.e_schedule_db
    .prepare(
      `SELECT id, nombre, email, rol, password_hash, password_salt,
              password_iterations, activo
       FROM usuarios WHERE email = ?`
    )
    .bind(email)
    .first<UsuarioRow>();

  if (!usuario) {
    return c.json({ error: 'Credenciales incorrectas' }, 401);
  }

  if (!usuario.activo) {
    return c.json({ error: 'Usuario inactivo' }, 403);
  }

  const valid = await verifyPassword(
    password,
    usuario.password_hash,
    usuario.password_salt,
    usuario.password_iterations
  );

  if (!valid) {
    return c.json({ error: 'Credenciales incorrectas' }, 401);
  }

  // Crear sesión
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

  await c.env.e_schedule_db
    .prepare(
      `INSERT INTO sesiones (id, usuario_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(sessionId, usuario.id, tokenHash, expiresAt)
    .run();

  // Actualizar último login
  await c.env.e_schedule_db
    .prepare(`UPDATE usuarios SET ultimo_login_at = datetime('now') WHERE id = ?`)
    .bind(usuario.id)
    .run();

  const setCookie = buildSetCookieHeader(token, c.req.url);

  return new Response(
    JSON.stringify({
      success: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setCookie,
      },
    }
  );
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

auth.post('/logout', async (c) => {
  const token = getSessionToken(c.req.header('cookie') ?? null);

  if (token) {
    const tokenHash = await hashToken(token);
    await c.env.e_schedule_db
      .prepare(`UPDATE sesiones SET revoked_at = datetime('now') WHERE token_hash = ?`)
      .bind(tokenHash)
      .run();
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookieHeader(),
    },
  });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

auth.get('/me', async (c) => {
  const token = getSessionToken(c.req.header('cookie') ?? null);
  if (!token) return c.json({ error: 'No autenticado' }, 401);

  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();

  const row = await c.env.e_schedule_db
    .prepare(
      `SELECT u.id, u.nombre, u.email, u.rol, u.activo
       FROM sesiones s
       JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > ?`
    )
    .bind(tokenHash, now)
    .first<{ id: string; nombre: string; email: string; rol: string; activo: number }>();

  if (!row || !row.activo) return c.json({ error: 'No autenticado' }, 401);

  return c.json({
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
  });
});

export default auth;
