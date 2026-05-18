import { Hono } from 'hono';
import type { Bindings } from '../types';

const programas = new Hono<{ Bindings: Bindings }>();

const PROGRAMA_SELECT = `
  SELECT p.*,
    d.nombre as departamento_nombre,
    f.nombre as facultad_nombre
  FROM programas p
  LEFT JOIN departamentos d ON p.departamento_id = d.id
  LEFT JOIN facultades f ON d.facultad_id = f.id
`;

programas.get('/', async (c) => {
  const result = await c.env.e_schedule_db
    .prepare(PROGRAMA_SELECT + ' ORDER BY p.orden_prioridad ASC')
    .all();
  return c.json(result.results);
});

programas.get('/:id', async (c) => {
  const { id } = c.req.param();
  const p = await c.env.e_schedule_db
    .prepare(PROGRAMA_SELECT + ' WHERE p.id = ?')
    .bind(id)
    .first();
  if (!p) return c.json({ error: 'Programa no encontrado' }, 404);
  return c.json(p);
});

programas.get('/:id/materias', async (c) => {
  const { id } = c.req.param();
  const result = await c.env.e_schedule_db
    .prepare('SELECT * FROM materias WHERE programa_id = ? ORDER BY nombre')
    .bind(id)
    .all();
  return c.json(result.results);
});

programas.get('/:id/sedes', async (c) => {
  const { id } = c.req.param();
  const result = await c.env.e_schedule_db
    .prepare(`
      SELECT s.*, c.nombre as celula_nombre, sp.created_at as asignado_at
      FROM sede_programa sp
      JOIN sedes s ON sp.sede_id = s.id
      LEFT JOIN celulas c ON s.celula_id = c.id
      WHERE sp.programa_id = ?
      ORDER BY s.nombre ASC
    `)
    .bind(id)
    .all();
  return c.json(result.results);
});

programas.put('/:id/sedes', async (c) => {
  const { id } = c.req.param();
  const { sede_ids } = await c.req.json();
  if (!Array.isArray(sede_ids)) {
    return c.json({ error: 'sede_ids debe ser una lista' }, 400);
  }

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM programas WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Programa no encontrado' }, 404);

  const uniqueSedeIds = [...new Set(sede_ids.filter((sedeId): sedeId is string => typeof sedeId === 'string' && sedeId.length > 0))];
  if (uniqueSedeIds.length > 0) {
    const placeholders = uniqueSedeIds.map(() => '?').join(',');
    const sedes = await c.env.e_schedule_db
      .prepare(`SELECT id FROM sedes WHERE id IN (${placeholders})`)
      .bind(...uniqueSedeIds)
      .all();
    if (sedes.results.length !== uniqueSedeIds.length) {
      return c.json({ error: 'Una o más sedes no existen' }, 400);
    }
  }

  const statements = [
    c.env.e_schedule_db.prepare('DELETE FROM sede_programa WHERE programa_id = ?').bind(id),
    ...uniqueSedeIds.map(sedeId =>
      c.env.e_schedule_db
        .prepare('INSERT INTO sede_programa (sede_id, programa_id) VALUES (?, ?)')
        .bind(sedeId, id)
    ),
  ];
  await c.env.e_schedule_db.batch(statements);
  return c.json({ success: true, sede_ids: uniqueSedeIds });
});

programas.post('/', async (c) => {
  const body = await c.req.json();
  const { nombre, descripcion, es_prioritario, orden_prioridad, tipo_ciclo, departamento_id, sede_ids } = body;
  if (!nombre) return c.json({ error: 'nombre es requerido' }, 400);
  if (tipo_ciclo && !['semanal', 'quincenal'].includes(tipo_ciclo)) {
    return c.json({ error: 'tipo_ciclo debe ser semanal o quincenal' }, 400);
  }

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM programas WHERE nombre = ?')
    .bind(nombre)
    .first();
  if (existing) return c.json({ error: 'Ya existe un programa con ese nombre' }, 409);

  const id = crypto.randomUUID();
  const uniqueSedeIds = Array.isArray(sede_ids)
    ? [...new Set(sede_ids.filter((sedeId): sedeId is string => typeof sedeId === 'string' && sedeId.length > 0))]
    : [];

  await c.env.e_schedule_db.batch([
    c.env.e_schedule_db
      .prepare('INSERT INTO programas (id, nombre, descripcion, es_prioritario, orden_prioridad, tipo_ciclo, departamento_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, nombre, descripcion ?? null, es_prioritario ? 1 : 0, orden_prioridad ?? 99, tipo_ciclo ?? 'quincenal', departamento_id ?? null),
    ...uniqueSedeIds.map(sedeId =>
      c.env.e_schedule_db
        .prepare('INSERT INTO sede_programa (sede_id, programa_id) VALUES (?, ?)')
        .bind(sedeId, id)
    ),
  ]);
  const created = await c.env.e_schedule_db
    .prepare(PROGRAMA_SELECT + ' WHERE p.id = ?')
    .bind(id)
    .first();
  return c.json(created, 201);
});

programas.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { nombre, descripcion, es_prioritario, orden_prioridad, tipo_ciclo, departamento_id, sede_ids } = body;

  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM programas WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Programa no encontrado' }, 404);

  const statements = [
    c.env.e_schedule_db
      .prepare('UPDATE programas SET nombre = ?, descripcion = ?, es_prioritario = ?, orden_prioridad = ?, tipo_ciclo = ?, departamento_id = ? WHERE id = ?')
      .bind(nombre, descripcion ?? null, es_prioritario ? 1 : 0, orden_prioridad ?? 99, tipo_ciclo ?? 'quincenal', departamento_id ?? null, id),
  ];
  if (Array.isArray(sede_ids)) {
    const uniqueSedeIds = [...new Set(sede_ids.filter((sedeId): sedeId is string => typeof sedeId === 'string' && sedeId.length > 0))];
    statements.push(c.env.e_schedule_db.prepare('DELETE FROM sede_programa WHERE programa_id = ?').bind(id));
    statements.push(...uniqueSedeIds.map(sedeId =>
      c.env.e_schedule_db
        .prepare('INSERT INTO sede_programa (sede_id, programa_id) VALUES (?, ?)')
        .bind(sedeId, id)
    ));
  }
  await c.env.e_schedule_db.batch(statements);

  const updated = await c.env.e_schedule_db
    .prepare(PROGRAMA_SELECT + ' WHERE p.id = ?')
    .bind(id)
    .first();
  return c.json(updated);
});

programas.patch('/:id/prioridad', async (c) => {
  const { id } = c.req.param();
  const { es_prioritario } = await c.req.json();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM programas WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Programa no encontrado' }, 404);

  await c.env.e_schedule_db
    .prepare('UPDATE programas SET es_prioritario = ? WHERE id = ?')
    .bind(es_prioritario ? 1 : 0, id)
    .run();
  return c.json({ success: true });
});

programas.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id FROM programas WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return c.json({ error: 'Programa no encontrado' }, 404);

  await c.env.e_schedule_db.prepare('DELETE FROM programas WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default programas;
