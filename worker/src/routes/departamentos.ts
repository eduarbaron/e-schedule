import { Hono } from 'hono';
import type { Bindings } from '../types';

const departamentos = new Hono<{ Bindings: Bindings }>();

departamentos.get('/', async (c) => {
  const result = await c.env.e_schedule_db
    .prepare(`
      SELECT d.*, f.nombre as facultad_nombre
      FROM departamentos d
      JOIN facultades f ON d.facultad_id = f.id
      ORDER BY f.nombre, d.nombre
    `)
    .all();
  return c.json(result.results);
});

departamentos.get('/:id', async (c) => {
  const { id } = c.req.param();
  const d = await c.env.e_schedule_db
    .prepare(`
      SELECT d.*, f.nombre as facultad_nombre
      FROM departamentos d
      JOIN facultades f ON d.facultad_id = f.id
      WHERE d.id = ?
    `)
    .bind(id)
    .first();
  if (!d) return c.json({ error: 'Departamento no encontrado' }, 404);
  return c.json(d);
});

departamentos.post('/', async (c) => {
  const body = await c.req.json();
  const { nombre, facultad_id, descripcion } = body;
  if (!nombre || !facultad_id) return c.json({ error: 'nombre y facultad_id son requeridos' }, 400);

  const facultad = await c.env.e_schedule_db
    .prepare('SELECT id FROM facultades WHERE id = ?')
    .bind(facultad_id)
    .first();
  if (!facultad) return c.json({ error: 'Facultad no encontrada' }, 404);

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM departamentos WHERE nombre = ? AND facultad_id = ?')
    .bind(nombre, facultad_id)
    .first();
  if (existing) return c.json({ error: 'Ya existe ese departamento en esta facultad' }, 409);

  const id = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare('INSERT INTO departamentos (id, nombre, facultad_id, descripcion) VALUES (?, ?, ?, ?)')
    .bind(id, nombre, facultad_id, descripcion ?? null)
    .run();
  const created = await c.env.e_schedule_db
    .prepare(`
      SELECT d.*, f.nombre as facultad_nombre
      FROM departamentos d JOIN facultades f ON d.facultad_id = f.id
      WHERE d.id = ?
    `)
    .bind(id)
    .first();
  return c.json(created, 201);
});

departamentos.put('/:id', async (c) => {
  const { id } = c.req.param();
  const { nombre, facultad_id, descripcion } = await c.req.json();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM departamentos WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Departamento no encontrado' }, 404);
  await c.env.e_schedule_db
    .prepare('UPDATE departamentos SET nombre = ?, facultad_id = ?, descripcion = ? WHERE id = ?')
    .bind(nombre, facultad_id, descripcion ?? null, id)
    .run();
  const updated = await c.env.e_schedule_db
    .prepare(`
      SELECT d.*, f.nombre as facultad_nombre
      FROM departamentos d JOIN facultades f ON d.facultad_id = f.id
      WHERE d.id = ?
    `)
    .bind(id)
    .first();
  return c.json(updated);
});

departamentos.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM departamentos WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Departamento no encontrado' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM departamentos WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default departamentos;
