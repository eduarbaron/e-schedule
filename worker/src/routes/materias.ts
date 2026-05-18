import { Hono } from 'hono';
import type { Bindings } from '../types';

const materias = new Hono<{ Bindings: Bindings }>();

materias.get('/', async (c) => {
  const result = await c.env.e_schedule_db
    .prepare(`
      SELECT m.*,
        p.nombre as programa_nombre,
        d.nombre as departamento_nombre,
        f.id as facultad_id, f.nombre as facultad_nombre
      FROM materias m
      LEFT JOIN programas p ON m.programa_id = p.id
      LEFT JOIN departamentos d ON m.departamento_id = d.id
      LEFT JOIN facultades f ON d.facultad_id = f.id
      ORDER BY m.programa_id, m.semestre, m.nombre
    `)
    .all();
  return c.json(result.results);
});

materias.get('/:id', async (c) => {
  const { id } = c.req.param();
  const materia = await c.env.e_schedule_db
    .prepare(`
      SELECT m.*, p.nombre as programa_nombre, d.nombre as departamento_nombre, f.id as facultad_id, f.nombre as facultad_nombre
      FROM materias m
      LEFT JOIN programas p ON m.programa_id = p.id
      LEFT JOIN departamentos d ON m.departamento_id = d.id
      LEFT JOIN facultades f ON d.facultad_id = f.id
      WHERE m.id = ?
    `)
    .bind(id)
    .first();
  if (!materia) return c.json({ error: 'Materia no encontrada' }, 404);
  return c.json(materia);
});

materias.post('/', async (c) => {
  const body = await c.req.json();
  const { nombre, horas_semana, programa_id, departamento_id, semestre } = body;
  if (!nombre) return c.json({ error: 'nombre es requerido' }, 400);
  const id = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare('INSERT INTO materias (id, nombre, horas_semana, programa_id, departamento_id, semestre) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, nombre, horas_semana ?? 2, programa_id ?? null, departamento_id ?? null, semestre ?? null)
    .run();
  const created = await c.env.e_schedule_db
    .prepare(`
      SELECT m.*, p.nombre as programa_nombre, d.nombre as departamento_nombre, f.id as facultad_id, f.nombre as facultad_nombre
      FROM materias m
      LEFT JOIN programas p ON m.programa_id = p.id
      LEFT JOIN departamentos d ON m.departamento_id = d.id
      LEFT JOIN facultades f ON d.facultad_id = f.id
      WHERE m.id = ?
    `)
    .bind(id).first();
  return c.json(created, 201);
});

materias.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { nombre, horas_semana, programa_id, departamento_id, semestre } = body;
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM materias WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Materia no encontrada' }, 404);
  await c.env.e_schedule_db
    .prepare('UPDATE materias SET nombre = ?, horas_semana = ?, programa_id = ?, departamento_id = ?, semestre = ? WHERE id = ?')
    .bind(nombre, horas_semana ?? 2, programa_id ?? null, departamento_id ?? null, semestre ?? null, id)
    .run();
  const updated = await c.env.e_schedule_db
    .prepare(`
      SELECT m.*, p.nombre as programa_nombre, d.nombre as departamento_nombre, f.id as facultad_id, f.nombre as facultad_nombre
      FROM materias m
      LEFT JOIN programas p ON m.programa_id = p.id
      LEFT JOIN departamentos d ON m.departamento_id = d.id
      LEFT JOIN facultades f ON d.facultad_id = f.id
      WHERE m.id = ?
    `)
    .bind(id).first();
  return c.json(updated);
});

materias.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM materias WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Materia no encontrada' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM materias WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default materias;
