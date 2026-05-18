import { Hono } from 'hono';
import type { Bindings } from '../types';

const celulas = new Hono<{ Bindings: Bindings }>();

celulas.get('/', async (c) => {
  const result = await c.env.e_schedule_db.prepare('SELECT * FROM celulas ORDER BY nombre').all();
  return c.json(result.results);
});

celulas.get('/:id', async (c) => {
  const { id } = c.req.param();
  const celula = await c.env.e_schedule_db.prepare('SELECT * FROM celulas WHERE id = ?').bind(id).first();
  if (!celula) return c.json({ error: 'Célula no encontrada' }, 404);
  return c.json(celula);
});

celulas.get('/:id/sedes', async (c) => {
  const { id } = c.req.param();
  const result = await c.env.e_schedule_db
    .prepare('SELECT * FROM sedes WHERE celula_id = ? ORDER BY nombre')
    .bind(id)
    .all();
  return c.json(result.results);
});

celulas.post('/', async (c) => {
  const body = await c.req.json();
  const { nombre, municipio } = body;
  if (!nombre || !municipio) return c.json({ error: 'nombre y municipio son requeridos' }, 400);
  const id = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare('INSERT INTO celulas (id, nombre, municipio) VALUES (?, ?, ?)')
    .bind(id, nombre, municipio)
    .run();
  const created = await c.env.e_schedule_db.prepare('SELECT * FROM celulas WHERE id = ?').bind(id).first();
  return c.json(created, 201);
});

celulas.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { nombre, municipio } = body;
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM celulas WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Célula no encontrada' }, 404);
  await c.env.e_schedule_db
    .prepare('UPDATE celulas SET nombre = ?, municipio = ? WHERE id = ?')
    .bind(nombre, municipio, id)
    .run();
  const updated = await c.env.e_schedule_db.prepare('SELECT * FROM celulas WHERE id = ?').bind(id).first();
  return c.json(updated);
});

celulas.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM celulas WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Célula no encontrada' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM celulas WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default celulas;
