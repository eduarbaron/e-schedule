import { Hono } from 'hono';
import type { Bindings } from '../types';

const facultades = new Hono<{ Bindings: Bindings }>();

facultades.get('/', async (c) => {
  const result = await c.env.e_schedule_db
    .prepare('SELECT * FROM facultades ORDER BY nombre')
    .all();
  return c.json(result.results);
});

facultades.get('/:id', async (c) => {
  const { id } = c.req.param();
  const f = await c.env.e_schedule_db
    .prepare('SELECT * FROM facultades WHERE id = ?')
    .bind(id)
    .first();
  if (!f) return c.json({ error: 'Facultad no encontrada' }, 404);
  return c.json(f);
});

facultades.get('/:id/departamentos', async (c) => {
  const { id } = c.req.param();
  const result = await c.env.e_schedule_db
    .prepare('SELECT * FROM departamentos WHERE facultad_id = ? ORDER BY nombre')
    .bind(id)
    .all();
  return c.json(result.results);
});

facultades.post('/', async (c) => {
  const body = await c.req.json();
  const { nombre, descripcion } = body;
  if (!nombre) return c.json({ error: 'nombre es requerido' }, 400);

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM facultades WHERE nombre = ?')
    .bind(nombre)
    .first();
  if (existing) return c.json({ error: 'Ya existe una facultad con ese nombre' }, 409);

  const id = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare('INSERT INTO facultades (id, nombre, descripcion) VALUES (?, ?, ?)')
    .bind(id, nombre, descripcion ?? null)
    .run();
  const created = await c.env.e_schedule_db
    .prepare('SELECT * FROM facultades WHERE id = ?')
    .bind(id)
    .first();
  return c.json(created, 201);
});

facultades.put('/:id', async (c) => {
  const { id } = c.req.param();
  const { nombre, descripcion } = await c.req.json();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM facultades WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Facultad no encontrada' }, 404);
  await c.env.e_schedule_db
    .prepare('UPDATE facultades SET nombre = ?, descripcion = ? WHERE id = ?')
    .bind(nombre, descripcion ?? null, id)
    .run();
  const updated = await c.env.e_schedule_db
    .prepare('SELECT * FROM facultades WHERE id = ?')
    .bind(id)
    .first();
  return c.json(updated);
});

facultades.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM facultades WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Facultad no encontrada' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM facultades WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default facultades;
