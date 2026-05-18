import { Hono } from 'hono';
import type { Bindings } from '../types';

const docentes = new Hono<{ Bindings: Bindings }>();

docentes.get('/', async (c) => {
  const result = await c.env.e_schedule_db
    .prepare(`
      SELECT d.*, c.nombre as celula_nombre,
        dep.nombre as departamento_nombre,
        f.nombre as facultad_nombre
      FROM docentes d
      LEFT JOIN celulas c ON d.celula_id = c.id
      LEFT JOIN departamentos dep ON d.departamento_id = dep.id
      LEFT JOIN facultades f ON dep.facultad_id = f.id
      ORDER BY d.nombre
    `)
    .all();
  return c.json(result.results);
});

docentes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const docente = await c.env.e_schedule_db
    .prepare(`
      SELECT d.*, c.nombre as celula_nombre,
        dep.nombre as departamento_nombre,
        f.nombre as facultad_nombre
      FROM docentes d
      LEFT JOIN celulas c ON d.celula_id = c.id
      LEFT JOIN departamentos dep ON d.departamento_id = dep.id
      LEFT JOIN facultades f ON dep.facultad_id = f.id
      WHERE d.id = ?
    `)
    .bind(id)
    .first();
  if (!docente) return c.json({ error: 'Docente no encontrado' }, 404);
  return c.json(docente);
});

docentes.get('/:id/disponibilidad', async (c) => {
  const { id } = c.req.param();
  const result = await c.env.e_schedule_db
    .prepare('SELECT * FROM disponibilidad WHERE docente_id = ? ORDER BY dia_semana, hora_inicio')
    .bind(id)
    .all();
  return c.json(result.results);
});

docentes.get('/:id/asignaciones', async (c) => {
  const { id } = c.req.param();
  const { periodo } = c.req.query();
  let query = `
    SELECT a.*, s.nombre as sede_nombre, s.latitud, s.longitud, m.nombre as materia_nombre
    FROM asignaciones a
    JOIN sedes s ON a.sede_id = s.id
    JOIN materias m ON a.materia_id = m.id
    WHERE a.docente_id = ?
  `;
  const params: string[] = [id];
  if (periodo) {
    query += ' AND a.periodo = ?';
    params.push(periodo);
  }
  query += ' ORDER BY a.dia_semana, a.hora_inicio';
  const result = await c.env.e_schedule_db.prepare(query).bind(...params).all();
  return c.json(result.results);
});

docentes.post('/', async (c) => {
  const body = await c.req.json();
  const { nombre, email, tipo_vinculacion, celula_id, max_horas, departamento_id } = body;
  if (!nombre || !email || !tipo_vinculacion) {
    return c.json({ error: 'nombre, email y tipo_vinculacion son requeridos' }, 400);
  }
  if (!['central', 'celula'].includes(tipo_vinculacion)) {
    return c.json({ error: 'tipo_vinculacion debe ser: central o celula' }, 400);
  }
  if (tipo_vinculacion === 'celula' && !celula_id) {
    return c.json({ error: 'celula_id es requerido para docentes de tipo celula' }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare('INSERT INTO docentes (id, nombre, email, tipo_vinculacion, celula_id, max_horas, departamento_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, nombre, email, tipo_vinculacion, celula_id ?? null, max_horas ?? 19, departamento_id ?? null)
    .run();
  const created = await c.env.e_schedule_db
    .prepare(`
      SELECT d.*, c.nombre as celula_nombre,
        dep.nombre as departamento_nombre, f.nombre as facultad_nombre
      FROM docentes d
      LEFT JOIN celulas c ON d.celula_id = c.id
      LEFT JOIN departamentos dep ON d.departamento_id = dep.id
      LEFT JOIN facultades f ON dep.facultad_id = f.id
      WHERE d.id = ?
    `)
    .bind(id)
    .first();
  return c.json(created, 201);
});

docentes.post('/:id/disponibilidad', async (c) => {
  const { id } = c.req.param();
  const docente = await c.env.e_schedule_db.prepare('SELECT id FROM docentes WHERE id = ?').bind(id).first();
  if (!docente) return c.json({ error: 'Docente no encontrado' }, 404);

  const body = await c.req.json();
  const { dia_semana, hora_inicio, hora_fin } = body;
  if (!dia_semana || !hora_inicio || !hora_fin) {
    return c.json({ error: 'dia_semana, hora_inicio y hora_fin son requeridos' }, 400);
  }
  const dispId = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare('INSERT INTO disponibilidad (id, docente_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)')
    .bind(dispId, id, dia_semana, hora_inicio, hora_fin)
    .run();
  const created = await c.env.e_schedule_db.prepare('SELECT * FROM disponibilidad WHERE id = ?').bind(dispId).first();
  return c.json(created, 201);
});

docentes.patch('/:id/modo-libre', async (c) => {
  const { id } = c.req.param();
  const docente = await c.env.e_schedule_db.prepare('SELECT * FROM docentes WHERE id = ?').bind(id).first() as any;
  if (!docente) return c.json({ error: 'Docente no encontrado' }, 404);
  const nuevoModo = docente.modo_libre === 1 ? 0 : 1;
  await c.env.e_schedule_db
    .prepare('UPDATE docentes SET modo_libre = ? WHERE id = ?')
    .bind(nuevoModo, id)
    .run();
  return c.json({ id, modo_libre: nuevoModo === 1 });
});

docentes.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { nombre, email, tipo_vinculacion, celula_id, max_horas } = body;
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM docentes WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Docente no encontrado' }, 404);
  await c.env.e_schedule_db
    .prepare('UPDATE docentes SET nombre = ?, email = ?, tipo_vinculacion = ?, celula_id = ?, max_horas = ? WHERE id = ?')
    .bind(nombre, email, tipo_vinculacion, celula_id ?? null, max_horas ?? 19, id)
    .run();
  const updated = await c.env.e_schedule_db
    .prepare(`SELECT d.*, c.nombre as celula_nombre FROM docentes d LEFT JOIN celulas c ON d.celula_id = c.id WHERE d.id = ?`)
    .bind(id)
    .first();
  return c.json(updated);
});

docentes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM docentes WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Docente no encontrado' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM docentes WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

docentes.delete('/:id/disponibilidad/:dispId', async (c) => {
  const { id, dispId } = c.req.param();
  await c.env.e_schedule_db
    .prepare('DELETE FROM disponibilidad WHERE id = ? AND docente_id = ?')
    .bind(dispId, id)
    .run();
  return c.json({ success: true });
});

export default docentes;
