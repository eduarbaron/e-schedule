import { Hono } from 'hono';
import type { Bindings } from '../types';

const clases = new Hono<{ Bindings: Bindings }>();

type CalendarioClase = 'A' | 'B' | 'semanal';

async function resolverCalendarioClase(
  db: D1Database,
  periodo: string,
  programaId: string,
  calendarioSolicitado?: unknown
): Promise<{ calendario: CalendarioClase } | { error: string }> {
  const row = await db
    .prepare(`
      SELECT pr.tipo_ciclo
      FROM programas pr
      CROSS JOIN periodos pe
      WHERE pr.id = ? AND pe.id = ?
    `)
    .bind(programaId, periodo)
    .first<{ tipo_ciclo: 'semanal' | 'quincenal' }>();

  if (!row) return { error: 'periodo o programa no encontrado' };
  if (row.tipo_ciclo === 'semanal') return { calendario: 'semanal' };
  if (calendarioSolicitado !== 'A' && calendarioSolicitado !== 'B') {
    return { error: 'calendario debe ser A o B para programas quincenales' };
  }
  return { calendario: calendarioSolicitado };
}

const CLASE_SELECT = `
  SELECT cl.*,
    p.nombre as programa_nombre,
    m.nombre as materia_nombre,
    m.horas_semana,
    m.semestre,
    m.departamento_id,
    s.nombre as sede_nombre,
    s.celula_id,
    c.nombre as celula_nombre
  FROM clases cl
  JOIN programas p ON cl.programa_id = p.id
  JOIN materias m ON cl.materia_id = m.id
  JOIN sedes s ON cl.sede_id = s.id
  LEFT JOIN celulas c ON s.celula_id = c.id
`;

clases.get('/', async (c) => {
  const { periodo, programa_id, sede_id, semestre, estado } = c.req.query();
  let query = `${CLASE_SELECT} WHERE 1=1`;
  const params: string[] = [];

  if (periodo) {
    query += ' AND cl.periodo = ?';
    params.push(periodo);
  }
  if (programa_id) {
    query += ' AND cl.programa_id = ?';
    params.push(programa_id);
  }
  if (sede_id) {
    query += ' AND cl.sede_id = ?';
    params.push(sede_id);
  }
  if (semestre) {
    query += ' AND m.semestre = ?';
    params.push(semestre);
  }
  if (estado) {
    query += ' AND cl.estado = ?';
    params.push(estado);
  }

  query += ' ORDER BY cl.periodo DESC, p.orden_prioridad ASC, cl.dia_semana, cl.hora_inicio, m.nombre';
  const result = await c.env.e_schedule_db.prepare(query).bind(...params).all();
  return c.json(result.results);
});

clases.get('/:id', async (c) => {
  const { id } = c.req.param();
  const clase = await c.env.e_schedule_db
    .prepare(`${CLASE_SELECT} WHERE cl.id = ?`)
    .bind(id)
    .first();
  if (!clase) return c.json({ error: 'Clase no encontrada' }, 404);
  return c.json(clase);
});

clases.post('/', async (c) => {
  const body = await c.req.json();
  const {
    periodo,
    programa_id,
    materia_id,
    sede_id,
    grupo,
    calendario: calendarioSolicitado,
    dia_semana,
    hora_inicio,
    hora_fin,
  } = body;

  if (!periodo || !programa_id || !materia_id || !sede_id || !dia_semana || !hora_inicio || !hora_fin) {
    return c.json({ error: 'periodo, programa_id, materia_id, sede_id, dia_semana, hora_inicio y hora_fin son requeridos' }, 400);
  }
  if (!['L', 'M', 'X', 'J', 'V', 'S'].includes(dia_semana)) {
    return c.json({ error: 'dia_semana inválido' }, 400);
  }
  if (hora_inicio >= hora_fin) {
    return c.json({ error: 'hora_inicio debe ser menor que hora_fin' }, 400);
  }

  const calendarioResult = await resolverCalendarioClase(c.env.e_schedule_db, periodo, programa_id, calendarioSolicitado);
  if ('error' in calendarioResult) {
    return c.json({ error: calendarioResult.error }, 400);
  }
  const { calendario } = calendarioResult;

  const id = crypto.randomUUID();
  await c.env.e_schedule_db
    .prepare(`
      INSERT INTO clases
        (id, periodo, programa_id, materia_id, sede_id, grupo, calendario, dia_semana, hora_inicio, hora_fin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(id, periodo, programa_id, materia_id, sede_id, grupo ?? 1, calendario, dia_semana, hora_inicio, hora_fin)
    .run();

  const created = await c.env.e_schedule_db
    .prepare(`${CLASE_SELECT} WHERE cl.id = ?`)
    .bind(id)
    .first();
  return c.json(created, 201);
});

clases.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const existing = await c.env.e_schedule_db
    .prepare('SELECT id, periodo, programa_id, calendario FROM clases WHERE id = ?')
    .bind(id)
    .first<{ id: string; periodo: string; programa_id: string; calendario: CalendarioClase }>();
  if (!existing) return c.json({ error: 'Clase no encontrada' }, 404);

  const {
    periodo,
    programa_id,
    materia_id,
    sede_id,
    grupo,
    calendario: calendarioSolicitado,
    dia_semana,
    hora_inicio,
    hora_fin,
    estado,
  } = body;

  if (hora_inicio >= hora_fin) {
    return c.json({ error: 'hora_inicio debe ser menor que hora_fin' }, 400);
  }

  const calendarioResult = await resolverCalendarioClase(
    c.env.e_schedule_db,
    periodo ?? existing.periodo,
    programa_id ?? existing.programa_id,
    calendarioSolicitado ?? existing.calendario
  );
  if ('error' in calendarioResult) {
    return c.json({ error: calendarioResult.error }, 400);
  }
  const { calendario } = calendarioResult;

  await c.env.e_schedule_db
    .prepare(`
      UPDATE clases
      SET periodo = ?, programa_id = ?, materia_id = ?, sede_id = ?, grupo = ?,
        calendario = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, estado = ?
      WHERE id = ?
    `)
    .bind(
      periodo,
      programa_id,
      materia_id,
      sede_id,
      grupo ?? 1,
      calendario,
      dia_semana,
      hora_inicio,
      hora_fin,
      estado ?? 'pendiente',
      id
    )
    .run();

  const updated = await c.env.e_schedule_db
    .prepare(`${CLASE_SELECT} WHERE cl.id = ?`)
    .bind(id)
    .first();
  return c.json(updated);
});

clases.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM clases WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Clase no encontrada' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM clases WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default clases;
