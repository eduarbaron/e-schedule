import { Hono } from 'hono';
import type { Bindings } from '../types';
import { ensureClaseProyeccionesSchema } from '../utils/proyeccionesSchema';

const proyecciones = new Hono<{ Bindings: Bindings }>();

type DiaSemana = 'L' | 'M' | 'X' | 'J' | 'V' | 'S';

type ClaseTemplateRow = {
  id: string;
  nombre: string;
  programa_id: string | null;
  dias_semana_json: string;
  jornadas_json: string;
  dias_config_json?: string | null;
  semestres_json: string;
};

const DIAS_VALIDOS = ['L', 'M', 'X', 'J', 'V', 'S'];

function parseJsonArray(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toMinutes(time: string) {
  const [hours, minutes] = String(time).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
}

function normalizarJornadas(input: unknown) {
  const raw = Array.isArray(input) ? input : [];
  return raw
    .map((j: any) => ({ hora_inicio: String(j?.hora_inicio ?? ''), hora_fin: String(j?.hora_fin ?? '') }))
    .filter(j => Number.isFinite(toMinutes(j.hora_inicio)) && Number.isFinite(toMinutes(j.hora_fin)) && toMinutes(j.hora_inicio) < toMinutes(j.hora_fin))
    .sort((a, b) => toMinutes(a.hora_inicio) - toMinutes(b.hora_inicio));
}

function normalizarDias(input: unknown): DiaSemana[] {
  const raw = Array.isArray(input) ? input : [];
  return [...new Set(raw.map(String).filter((dia): dia is DiaSemana => DIAS_VALIDOS.includes(dia)))];
}

function normalizarSemestres(input: unknown): Array<{ semestre: number; grupos: number }> {
  const raw = Array.isArray(input) ? input : [];
  const bySemestre = new Map<number, number>();
  raw.forEach((item: any) => {
    const semestre = Number(typeof item === 'object' ? item?.semestre : item);
    const grupos = Number(typeof item === 'object' ? item?.grupos : 1);
    if (!Number.isFinite(semestre) || semestre <= 0) return;
    bySemestre.set(semestre, Math.max(1, Math.min(20, Math.floor(Number.isFinite(grupos) ? grupos : 1))));
  });
  return [...bySemestre.entries()]
    .sort(([a], [b]) => a - b)
    .map(([semestre, grupos]) => ({ semestre, grupos }));
}

function normalizarMaxClases(input: unknown): number | null {
  if (input === null || input === undefined || input === '') return null;
  const value = Math.floor(Number(input));
  return Number.isFinite(value) && value > 0 ? Math.min(100, value) : null;
}

function normalizarBreakMinutos(input: unknown): number {
  if (input === null || input === undefined || input === '') return 0;
  const value = Math.floor(Number(input));
  return Number.isFinite(value) && value > 0 ? Math.min(240, value) : 0;
}

function normalizarDiasConfig(input: unknown) {
  const raw = Array.isArray(input) ? input : [];
  const byDia = new Map<DiaSemana, any>();
  raw.forEach((item: any) => {
    const dia = String(item?.dia_semana ?? '');
    if (!DIAS_VALIDOS.includes(dia)) return;
    const jornadas = normalizarJornadas(item?.jornadas);
    if (jornadas.length === 0) return;
    byDia.set(dia as DiaSemana, {
      dia_semana: dia,
      jornadas,
      max_clases: normalizarMaxClases(item?.max_clases),
      break_minutos: normalizarBreakMinutos(item?.break_minutos),
    });
  });
  return DIAS_VALIDOS.filter((dia): dia is DiaSemana => byDia.has(dia as DiaSemana)).map(dia => byDia.get(dia)!);
}

function diasConfigDesdeLegacy(dias: DiaSemana[], jornadas: Array<{ hora_inicio: string; hora_fin: string }>) {
  if (dias.length === 0 || jornadas.length === 0) return [];
  return dias.map(dia_semana => ({ dia_semana, jornadas, max_clases: null, break_minutos: 0 }));
}

function serializarTemplate(row: ClaseTemplateRow) {
  const dias = normalizarDias(parseJsonArray(row.dias_semana_json));
  const jornadas = normalizarJornadas(parseJsonArray(row.jornadas_json));
  const diasConfig = normalizarDiasConfig(parseJsonArray(row.dias_config_json));
  return {
    ...row,
    dias_semana: diasConfig.length > 0 ? diasConfig.map(dia => dia.dia_semana) : dias,
    jornadas,
    dias_config: diasConfig.length > 0 ? diasConfig : diasConfigDesdeLegacy(dias, jornadas),
    semestres: normalizarSemestres(parseJsonArray(row.semestres_json)),
  };
}

proyecciones.get('/', async (c) => {
  await ensureClaseProyeccionesSchema(c.env.e_schedule_db);
  const { periodo, programa_id, celula_id, sede_id, template_id, semestre } = c.req.query();
  let query = `
    SELECT pc.*,
      p.nombre as programa_nombre,
      s.nombre as sede_nombre,
      s.celula_id,
      c.nombre as celula_nombre,
      t.nombre as template_nombre
    FROM clase_proyecciones pc
    JOIN programas p ON pc.programa_id = p.id
    JOIN sedes s ON pc.sede_id = s.id
    LEFT JOIN celulas c ON s.celula_id = c.id
    LEFT JOIN clase_templates t ON pc.template_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (periodo) { query += ' AND pc.periodo = ?'; params.push(periodo); }
  if (programa_id) { query += ' AND pc.programa_id = ?'; params.push(programa_id); }
  if (celula_id) { query += ' AND s.celula_id = ?'; params.push(celula_id); }
  if (sede_id) { query += ' AND pc.sede_id = ?'; params.push(sede_id); }
  if (template_id) { query += ' AND pc.template_id = ?'; params.push(template_id); }
  if (semestre) { query += ' AND pc.semestre = ?'; params.push(Number(semestre)); }
  query += ' ORDER BY p.nombre, c.nombre, s.nombre, pc.semestre';
  const result = await c.env.e_schedule_db.prepare(query).bind(...params).all();
  return c.json(result.results);
});

proyecciones.post('/generar', async (c) => {
  const db = c.env.e_schedule_db;
  await ensureClaseProyeccionesSchema(db);
  const body = await c.req.json();
  const periodo = String(body.periodo ?? '');
  const programaId = String(body.programa_id ?? '');
  const sedeTemplates = Array.isArray(body.sede_templates)
    ? body.sede_templates
      .map((item: any) => ({ sede_id: String(item?.sede_id ?? ''), template_id: String(item?.template_id ?? '') }))
      .filter((item: any) => item.sede_id && item.template_id)
    : [];
  const reemplazarExistentes = Boolean(body.reemplazar_existentes);

  if (!periodo || !programaId) return c.json({ error: 'periodo y programa_id son requeridos' }, 400);
  if (sedeTemplates.length === 0) return c.json({ error: 'Selecciona al menos una sede con plantilla' }, 400);

  const templateIds = Array.from(new Set<string>(sedeTemplates.map((item: any) => item.template_id as string)));
  const templatesResult = await db.prepare(`
    SELECT *
    FROM clase_templates
    WHERE id IN (${templateIds.map(() => '?').join(',')})
  `).bind(...templateIds).all<ClaseTemplateRow>();
  const templates = new Map(templatesResult.results.map(row => [row.id, serializarTemplate(row)]));
  const faltantes = templateIds.filter(id => !templates.has(id));
  if (faltantes.length > 0) return c.json({ error: `No se encontraron plantillas: ${faltantes.join(', ')}` }, 400);

  const sedeIds = Array.from(new Set<string>(sedeTemplates.map((item: any) => item.sede_id as string)));
  const sedesResult = await db.prepare(`
    SELECT s.id, s.celula_id
    FROM sedes s
    JOIN sede_programa sp ON sp.sede_id = s.id
    WHERE sp.programa_id = ?
      AND s.id IN (${sedeIds.map(() => '?').join(',')})
  `).bind(programaId, ...sedeIds).all<{ id: string; celula_id: string | null }>();
  const sedes = new Map(sedesResult.results.map(row => [row.id, row]));
  const sedesInvalidas = sedeIds.filter(id => !sedes.has(id));
  if (sedesInvalidas.length > 0) return c.json({ error: `Estas sedes no ofertan el programa: ${sedesInvalidas.join(', ')}` }, 400);

  const statements: D1PreparedStatement[] = [];
  if (reemplazarExistentes) {
    statements.push(
      db.prepare(`
        DELETE FROM clase_proyecciones
        WHERE periodo = ?
          AND programa_id = ?
          AND sede_id IN (${sedeIds.map(() => '?').join(',')})
      `).bind(periodo, programaId, ...sedeIds)
    );
  }

  let creadas = 0;
  for (const item of sedeTemplates) {
    const template = templates.get(item.template_id)!;
    const sede = sedes.get(item.sede_id)!;
    for (const semestre of template.semestres) {
      statements.push(
        db.prepare(`
          INSERT INTO clase_proyecciones (
            id, periodo, programa_id, celula_id, sede_id, template_id, semestre, grupos,
            dias_semana_json, jornadas_json, dias_config_json, origen, estado
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          periodo,
          programaId,
          sede.celula_id,
          item.sede_id,
          item.template_id,
          semestre.semestre,
          semestre.grupos,
          JSON.stringify(template.dias_semana),
          JSON.stringify(template.jornadas),
          JSON.stringify(template.dias_config),
          'plantilla',
          'borrador'
        )
      );
      creadas++;
    }
  }

  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50));
  }

  return c.json({ success: true, creadas }, 201);
});

proyecciones.put('/:id', async (c) => {
  await ensureClaseProyeccionesSchema(c.env.e_schedule_db);
  const { id } = c.req.param();
  const body = await c.req.json();
  const existing = await c.env.e_schedule_db.prepare('SELECT * FROM clase_proyecciones WHERE id = ?').bind(id).first<any>();
  if (!existing) return c.json({ error: 'Proyección no encontrada' }, 404);

  const grupos = body.grupos === undefined ? existing.grupos : Math.max(1, Math.min(20, Number(body.grupos)));
  const estado = body.estado === undefined ? existing.estado : String(body.estado);
  const diasConfig = body.dias_config === undefined ? existing.dias_config_json : JSON.stringify(normalizarDiasConfig(body.dias_config));
  const diasSemana = body.dias_semana === undefined ? existing.dias_semana_json : JSON.stringify(normalizarDias(body.dias_semana));
  const jornadas = body.jornadas === undefined ? existing.jornadas_json : JSON.stringify(normalizarJornadas(body.jornadas));

  await c.env.e_schedule_db.prepare(`
    UPDATE clase_proyecciones
    SET grupos = ?, dias_semana_json = ?, jornadas_json = ?, dias_config_json = ?, estado = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(grupos, diasSemana, jornadas, diasConfig, estado, id).run();

  const updated = await c.env.e_schedule_db.prepare('SELECT * FROM clase_proyecciones WHERE id = ?').bind(id).first();
  return c.json(updated);
});

proyecciones.delete('/bulk', async (c) => {
  await ensureClaseProyeccionesSchema(c.env.e_schedule_db);
  const { periodo, programa_id, celula_id, sede_id, template_id, semestre } = c.req.query();
  if (!periodo && !programa_id && !celula_id && !sede_id && !template_id && !semestre) {
    return c.json({ error: 'Define al menos un filtro para borrar proyecciones' }, 400);
  }
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (periodo) { where += ' AND periodo = ?'; params.push(periodo); }
  if (programa_id) { where += ' AND programa_id = ?'; params.push(programa_id); }
  if (celula_id) { where += ' AND celula_id = ?'; params.push(celula_id); }
  if (sede_id) { where += ' AND sede_id = ?'; params.push(sede_id); }
  if (template_id) { where += ' AND template_id = ?'; params.push(template_id); }
  if (semestre) { where += ' AND semestre = ?'; params.push(Number(semestre)); }

  const result = await c.env.e_schedule_db.prepare(`
    DELETE FROM clase_proyecciones
    ${where}
  `).bind(...params).run();
  return c.json({ success: true, eliminadas: result.meta.changes ?? 0 });
});

proyecciones.delete('/:id', async (c) => {
  await ensureClaseProyeccionesSchema(c.env.e_schedule_db);
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM clase_proyecciones WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Proyección no encontrada' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM clase_proyecciones WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default proyecciones;
