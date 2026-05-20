import { Hono } from 'hono';
import type { AppEnv, UsuarioRow } from '../types';
import {
  generateSalt, hashPassword, validatePassword,
} from '../utils/auth';

const usuarios = new Hono<AppEnv>();

// ─── GET /api/usuarios ───────────────────────────────────────────────────────

usuarios.get('/', async (c) => {
  const rows = await c.env.e_schedule_db
    .prepare(
      `SELECT id, nombre, email, rol, activo, ultimo_login_at, created_at, updated_at
       FROM usuarios ORDER BY created_at ASC`
    )
    .all<Omit<UsuarioRow, 'password_hash' | 'password_salt' | 'password_iterations'>>();
  return c.json(rows.results);
});

// ─── POST /api/usuarios ──────────────────────────────────────────────────────
// Solo crea coordinadores (el admin se crea vía bootstrap).

usuarios.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const nombre = String(body?.nombre ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!nombre) return c.json({ error: 'nombre es requerido' }, 400);
  if (!email || !email.includes('@')) return c.json({ error: 'email inválido' }, 400);
  const pwError = validatePassword(password);
  if (pwError) return c.json({ error: pwError }, 400);

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM usuarios WHERE email = ?')
    .bind(email)
    .first();
  if (existing) return c.json({ error: 'Ya existe un usuario con ese email' }, 409);

  const salt = await generateSalt();
  const hash = await hashPassword(password, salt);
  const id = crypto.randomUUID();

  await c.env.e_schedule_db
    .prepare(
      `INSERT INTO usuarios (id, nombre, email, rol, password_hash, password_salt, password_iterations)
       VALUES (?, ?, ?, 'coordinador', ?, ?, 210000)`
    )
    .bind(id, nombre, email, hash, salt)
    .run();

  return c.json({ id, nombre, email, rol: 'coordinador', activo: 1 }, 201);
});

// ─── PATCH /api/usuarios/:id/activo ─────────────────────────────────────────

usuarios.patch('/:id/activo', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => null);
  const activo = body?.activo === true || body?.activo === 1 ? 1 : 0;

  // No permitir desactivar al propio usuario
  const caller = c.get('user');
  if (caller.id === id) {
    return c.json({ error: 'No puedes desactivar tu propio usuario' }, 400);
  }

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM usuarios WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Usuario no encontrado' }, 404);

  await c.env.e_schedule_db
    .prepare(`UPDATE usuarios SET activo = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(activo, id)
    .run();

  return c.json({ success: true, activo: activo === 1 });
});

// ─── PATCH /api/usuarios/:id/password ───────────────────────────────────────

usuarios.patch('/:id/password', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => null);
  const password = String(body?.password ?? '');

  const pwError = validatePassword(password);
  if (pwError) return c.json({ error: pwError }, 400);

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM usuarios WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Usuario no encontrado' }, 404);

  const salt = await generateSalt();
  const hash = await hashPassword(password, salt);

  await c.env.e_schedule_db
    .prepare(
      `UPDATE usuarios
       SET password_hash = ?, password_salt = ?, password_iterations = 210000,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(hash, salt, id)
    .run();

  // Revocar todas las sesiones activas del usuario (forzar re-login)
  await c.env.e_schedule_db
    .prepare(`UPDATE sesiones SET revoked_at = datetime('now') WHERE usuario_id = ? AND revoked_at IS NULL`)
    .bind(id)
    .run();

  return c.json({ success: true });
});

export default usuarios;
