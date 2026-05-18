import { Hono } from 'hono';
import type { Bindings } from '../types';

const sedes = new Hono<{ Bindings: Bindings }>();

sedes.get('/', async (c) => {
  const result = await c.env.e_schedule_db
    .prepare(`SELECT s.*, c.nombre as celula_nombre FROM sedes s LEFT JOIN celulas c ON s.celula_id = c.id ORDER BY s.nombre`)
    .all();
  return c.json(result.results);
});

sedes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const sede = await c.env.e_schedule_db
    .prepare(`SELECT s.*, c.nombre as celula_nombre FROM sedes s LEFT JOIN celulas c ON s.celula_id = c.id WHERE s.id = ?`)
    .bind(id)
    .first();
  if (!sede) return c.json({ error: 'Sede no encontrada' }, 404);
  return c.json(sede);
});

sedes.post('/', async (c) => {
  const body = await c.req.json();
  const { nombre, tipo, celula_id, latitud, longitud, direccion } = body;
  if (!nombre || !tipo || latitud === undefined || longitud === undefined) {
    return c.json({ error: 'nombre, tipo, latitud y longitud son requeridos' }, 400);
  }
  if (!['central', 'celula', 'municipal', 'rural'].includes(tipo)) {
    return c.json({ error: 'tipo debe ser: central, celula, municipal o rural' }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare('INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud, direccion) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, nombre, tipo, celula_id ?? null, latitud, longitud, direccion ?? null)
    .run();
  const created = await c.env.e_schedule_db
    .prepare(`SELECT s.*, c.nombre as celula_nombre FROM sedes s LEFT JOIN celulas c ON s.celula_id = c.id WHERE s.id = ?`)
    .bind(id)
    .first();
  return c.json(created, 201);
});

sedes.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { nombre, tipo, celula_id, latitud, longitud, direccion } = body;
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM sedes WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Sede no encontrada' }, 404);
  await c.env.e_schedule_db
    .prepare('UPDATE sedes SET nombre = ?, tipo = ?, celula_id = ?, latitud = ?, longitud = ?, direccion = ? WHERE id = ?')
    .bind(nombre, tipo, celula_id ?? null, latitud, longitud, direccion ?? null, id)
    .run();
  const updated = await c.env.e_schedule_db
    .prepare(`SELECT s.*, c.nombre as celula_nombre FROM sedes s LEFT JOIN celulas c ON s.celula_id = c.id WHERE s.id = ?`)
    .bind(id)
    .first();
  return c.json(updated);
});

sedes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM sedes WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Sede no encontrada' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM sedes WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

sedes.get('/:id/programas', async (c) => {
  const { id } = c.req.param();
  const result = await c.env.e_schedule_db
    .prepare(`
      SELECT p.*, sp.created_at as asignado_at
      FROM sede_programa sp
      JOIN programas p ON sp.programa_id = p.id
      WHERE sp.sede_id = ?
      ORDER BY p.orden_prioridad ASC
    `)
    .bind(id)
    .all();
  return c.json(result.results);
});

sedes.post('/:id/programas', async (c) => {
  const { id } = c.req.param();
  const { programa_id } = await c.req.json();
  if (!programa_id) return c.json({ error: 'programa_id es requerido' }, 400);

  const [sede, programa] = await Promise.all([
    c.env.e_schedule_db.prepare('SELECT id FROM sedes WHERE id = ?').bind(id).first(),
    c.env.e_schedule_db.prepare('SELECT id FROM programas WHERE id = ?').bind(programa_id).first(),
  ]);
  if (!sede) return c.json({ error: 'Sede no encontrada' }, 404);
  if (!programa) return c.json({ error: 'Programa no encontrado' }, 404);

  const existing = await c.env.e_schedule_db
    .prepare('SELECT sede_id FROM sede_programa WHERE sede_id = ? AND programa_id = ?')
    .bind(id, programa_id)
    .first();
  if (existing) return c.json({ error: 'El programa ya está asignado a esta sede' }, 409);

  await c.env.e_schedule_db
    .prepare('INSERT INTO sede_programa (sede_id, programa_id) VALUES (?, ?)')
    .bind(id, programa_id)
    .run();
  return c.json({ success: true }, 201);
});

sedes.delete('/:id/programas/:programaId', async (c) => {
  const { id, programaId } = c.req.param();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT sede_id FROM sede_programa WHERE sede_id = ? AND programa_id = ?')
    .bind(id, programaId)
    .first();
  if (!existing) return c.json({ error: 'Relación no encontrada' }, 404);
  await c.env.e_schedule_db
    .prepare('DELETE FROM sede_programa WHERE sede_id = ? AND programa_id = ?')
    .bind(id, programaId)
    .run();
  return c.json({ success: true });
});

export default sedes;
