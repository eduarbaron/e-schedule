import { Hono } from 'hono';
import type { Bindings, Periodo } from '../types';

const periodos = new Hono<{ Bindings: Bindings }>();

periodos.get('/', async (c) => {
  const result = await c.env.e_schedule_db
    .prepare('SELECT * FROM periodos ORDER BY fecha_inicio DESC')
    .all();
  return c.json(result.results);
});

periodos.get('/activo', async (c) => {
  const periodo = await c.env.e_schedule_db
    .prepare('SELECT * FROM periodos WHERE activo = 1 LIMIT 1')
    .first();
  return c.json(periodo ?? null);
});

periodos.get('/:id', async (c) => {
  const { id } = c.req.param();
  const periodo = await c.env.e_schedule_db
    .prepare('SELECT * FROM periodos WHERE id = ?')
    .bind(id)
    .first();
  if (!periodo) return c.json({ error: 'Período no encontrado' }, 404);
  return c.json(periodo);
});

periodos.post('/', async (c) => {
  const body = await c.req.json();
  const { id, nombre, fecha_inicio, calendario_inicio, activo } = body;
  if (!id || !nombre || !fecha_inicio || !calendario_inicio) {
    return c.json({ error: 'id, nombre, fecha_inicio y calendario_inicio son requeridos' }, 400);
  }
  if (!['A', 'B'].includes(calendario_inicio)) {
    return c.json({ error: 'calendario_inicio debe ser A o B' }, 400);
  }

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM periodos WHERE id = ?')
    .bind(id)
    .first();
  if (existing) return c.json({ error: 'Ya existe un período con ese id' }, 409);

  // Si se marca como activo, desactivar los demás
  if (activo) {
    await c.env.e_schedule_db
      .prepare('UPDATE periodos SET activo = 0')
      .run();
  }

  await c.env.e_schedule_db
    .prepare('INSERT INTO periodos (id, nombre, fecha_inicio, calendario_inicio, activo) VALUES (?, ?, ?, ?, ?)')
    .bind(id, nombre, fecha_inicio, calendario_inicio, activo ? 1 : 0)
    .run();

  const created = await c.env.e_schedule_db
    .prepare('SELECT * FROM periodos WHERE id = ?')
    .bind(id)
    .first();
  return c.json(created, 201);
});

periodos.patch('/:id/activar', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM periodos WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Período no encontrado' }, 404);

  await c.env.e_schedule_db.batch([
    c.env.e_schedule_db.prepare('UPDATE periodos SET activo = 0').run() as any,
    c.env.e_schedule_db.prepare('UPDATE periodos SET activo = 1 WHERE id = ?').bind(id),
  ]);
  return c.json({ success: true });
});

periodos.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { nombre, fecha_inicio, calendario_inicio } = body;
  if (!nombre || !fecha_inicio || !calendario_inicio) {
    return c.json({ error: 'nombre, fecha_inicio y calendario_inicio son requeridos' }, 400);
  }
  if (!['A', 'B'].includes(calendario_inicio)) {
    return c.json({ error: 'calendario_inicio debe ser A o B' }, 400);
  }

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM periodos WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Período no encontrado' }, 404);

  await c.env.e_schedule_db
    .prepare('UPDATE periodos SET nombre = ?, fecha_inicio = ?, calendario_inicio = ? WHERE id = ?')
    .bind(nombre, fecha_inicio, calendario_inicio, id)
    .run();

  const updated = await c.env.e_schedule_db
    .prepare('SELECT * FROM periodos WHERE id = ?')
    .bind(id)
    .first();
  return c.json(updated);
});

periodos.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT * FROM periodos WHERE id = ?')
    .bind(id)
    .first() as unknown as Periodo | null;
  if (!existing) return c.json({ error: 'Período no encontrado' }, 404);
  if (existing.activo === 1) return c.json({ error: 'No se puede eliminar el período activo' }, 400);

  await c.env.e_schedule_db.prepare('DELETE FROM periodos WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default periodos;
