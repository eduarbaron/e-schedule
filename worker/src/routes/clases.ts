import { Hono } from 'hono';
import type { Bindings } from '../types';

const clases = new Hono<{ Bindings: Bindings }>();

type CalendarioClase = 'A' | 'B' | 'semanal';
type DiaSemana = 'L' | 'M' | 'X' | 'J' | 'V' | 'S';

type JornadaGeneracion = {
  hora_inicio: string;
  hora_fin: string;
};

type SemestreGeneracion = {
  semestre: number;
  grupos: number;
};

type ConfiguracionSedeGeneracion = {
  dias_semana?: unknown;
  jornadas?: unknown;
  dias_config?: unknown;
  semestres?: unknown;
};

type ClaseTemplateRow = {
  id: string;
  nombre: string;
  programa_id: string | null;
  dias_semana_json: string;
  jornadas_json: string;
  dias_config_json?: string | null;
  semestres_json: string;
  created_at: string;
};

type ClaseTemplate = {
  id: string;
  nombre: string;
  programa_id: string | null;
  dias_semana: DiaSemana[];
  jornadas: unknown[];
  dias_config: DiaConfigGeneracion[];
  semestres: unknown[];
  created_at: string;
};

type SedeTemplateInput = {
  sede_id: string;
  template_id: string;
};

type FranjaGeneracion = JornadaGeneracion & {
  dia_semana: DiaSemana;
  max_clases?: number | null;
  break_minutos?: number;
};

type CursorHorario = {
  jornada: number;
  minutos: number;
  clasesPorDia: Record<string, number>;
};

type BloqueHorarioGenerado = {
  calendario: CalendarioClase;
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
};

type HorarioCompactado = {
  horario: {
    dia_semana: DiaSemana;
    hora_inicio: string;
    hora_fin: string;
  };
  laneIndex: number;
};

const DIAS_VALIDOS = ['L', 'M', 'X', 'J', 'V', 'S'];

function toMinutes(time: string) {
  const [hours, minutes] = String(time).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function normalizarJornadas(input: unknown): JornadaGeneracion[] {
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

type DiaConfigGeneracion = {
  dia_semana: DiaSemana;
  jornadas: JornadaGeneracion[];
  max_clases: number | null;
  break_minutos: number;
};

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

function normalizarDiasConfig(input: unknown): DiaConfigGeneracion[] {
  const raw = Array.isArray(input) ? input : [];
  const byDia = new Map<DiaSemana, DiaConfigGeneracion>();

  raw.forEach((item: any) => {
    const dia = String(item?.dia_semana ?? '');
    if (!DIAS_VALIDOS.includes(dia)) return;
    const jornadas = normalizarJornadas(item?.jornadas);
    if (jornadas.length === 0) return;
    byDia.set(dia as DiaSemana, {
      dia_semana: dia as DiaSemana,
      jornadas,
      max_clases: normalizarMaxClases(item?.max_clases),
      break_minutos: normalizarBreakMinutos(item?.break_minutos),
    });
  });

  return DIAS_VALIDOS
    .filter((dia): dia is DiaSemana => byDia.has(dia as DiaSemana))
    .map(dia => byDia.get(dia)!);
}

function diasConfigDesdeLegacy(dias: DiaSemana[], jornadas: JornadaGeneracion[]): DiaConfigGeneracion[] {
  if (dias.length === 0 || jornadas.length === 0) return [];
  return dias.map(dia_semana => ({ dia_semana, jornadas, max_clases: null, break_minutos: 0 }));
}

function expandirFranjasDesdeDiasConfig(diasConfig: DiaConfigGeneracion[]): FranjaGeneracion[] {
  return diasConfig.flatMap(diaConfig =>
    diaConfig.jornadas.map(jornada => ({
      ...jornada,
      dia_semana: diaConfig.dia_semana,
      max_clases: diaConfig.max_clases,
      break_minutos: diaConfig.break_minutos,
    }))
  );
}

function expandirFranjas(dias: DiaSemana[], jornadas: JornadaGeneracion[]): FranjaGeneracion[] {
  return expandirFranjasDesdeDiasConfig(diasConfigDesdeLegacy(dias, jornadas));
}

function totalMinutosJornadas(jornadas: FranjaGeneracion[]) {
  return jornadas.reduce((total, jornada) => total + toMinutes(jornada.hora_fin) - toMinutes(jornada.hora_inicio), 0);
}

function crearCursor(jornadas: FranjaGeneracion[]): CursorHorario {
  return { jornada: 0, minutos: toMinutes(jornadas[0].hora_inicio), clasesPorDia: {} };
}

function crearCursorDesdeBanda(jornadas: FranjaGeneracion[], banda: number): CursorHorario {
  const bandaNormalizada = Math.max(0, Math.min(2, banda));
  const totalMinutos = totalMinutosJornadas(jornadas);
  let objetivo = Math.floor((totalMinutos * bandaNormalizada) / 3);

  for (let i = 0; i < jornadas.length; i++) {
    const jornada = jornadas[i];
    const duracion = toMinutes(jornada.hora_fin) - toMinutes(jornada.hora_inicio);
    if (objetivo < duracion) {
      const inicioJornada = toMinutes(jornada.hora_inicio);
      const offsetHora = Math.min(duracion, Math.round(objetivo / 60) * 60);
      return { jornada: i, minutos: inicioJornada + offsetHora, clasesPorDia: {} };
    }
    objetivo -= duracion;
  }

  const ultima = jornadas[jornadas.length - 1];
  return { jornada: jornadas.length - 1, minutos: toMinutes(ultima.hora_inicio), clasesPorDia: {} };
}

function clonarCursor(cursor: CursorHorario): CursorHorario {
  return {
    jornada: cursor.jornada,
    minutos: cursor.minutos,
    clasesPorDia: { ...cursor.clasesPorDia },
  };
}

function copiarCursor(origen: CursorHorario, destino: CursorHorario) {
  destino.jornada = origen.jornada;
  destino.minutos = origen.minutos;
  destino.clasesPorDia = { ...origen.clasesPorDia };
}

function siguienteHorario(cursor: CursorHorario, jornadas: FranjaGeneracion[], horas: number) {
  const duracion = horas * 60;
  while (cursor.jornada < jornadas.length) {
    const jornada = jornadas[cursor.jornada];
    const clasesDia = cursor.clasesPorDia[jornada.dia_semana] ?? 0;
    if (jornada.max_clases !== null && jornada.max_clases !== undefined && clasesDia >= jornada.max_clases) {
      cursor.jornada++;
      if (cursor.jornada < jornadas.length) {
        cursor.minutos = toMinutes(jornadas[cursor.jornada].hora_inicio);
      }
      continue;
    }
    const finJornada = toMinutes(jornada.hora_fin);
    if (cursor.minutos + duracion <= finJornada) {
      const inicio = cursor.minutos;
      cursor.minutos += duracion + (jornada.break_minutos ?? 0);
      cursor.clasesPorDia[jornada.dia_semana] = clasesDia + 1;
      return { dia_semana: jornada.dia_semana, hora_inicio: toTime(inicio), hora_fin: toTime(inicio + duracion) };
    }
    cursor.jornada++;
    if (cursor.jornada < jornadas.length) {
      cursor.minutos = toMinutes(jornadas[cursor.jornada].hora_inicio);
    }
  }
  return null;
}

function calendariosClaseSeCruzan(a: CalendarioClase, b: CalendarioClase) {
  return a === 'semanal' || b === 'semanal' || a === b;
}

function bloqueChocaConGrupo(bloque: BloqueHorarioGenerado, bloquesGrupo: BloqueHorarioGenerado[]) {
  return bloquesGrupo.some(existing =>
    existing.dia_semana === bloque.dia_semana &&
    calendariosClaseSeCruzan(existing.calendario, bloque.calendario) &&
    toMinutes(bloque.hora_inicio) < toMinutes(existing.hora_fin) &&
    toMinutes(existing.hora_inicio) < toMinutes(bloque.hora_fin)
  );
}

function costoCompactacionGrupo(bloque: BloqueHorarioGenerado, bloquesGrupo: BloqueHorarioGenerado[]) {
  const compatiblesMismoDia = bloquesGrupo
    .filter(existing =>
      existing.dia_semana === bloque.dia_semana &&
      calendariosClaseSeCruzan(existing.calendario, bloque.calendario)
    )
    .map(existing => ({
      inicio: toMinutes(existing.hora_inicio),
      fin: toMinutes(existing.hora_fin),
    }));

  const inicio = toMinutes(bloque.hora_inicio);
  const fin = toMinutes(bloque.hora_fin);
  const anterior = compatiblesMismoDia
    .filter(existing => existing.fin <= inicio)
    .sort((a, b) => b.fin - a.fin)[0];
  const siguiente = compatiblesMismoDia
    .filter(existing => existing.inicio >= fin)
    .sort((a, b) => a.inicio - b.inicio)[0];

  if (anterior || siguiente) {
    return Math.min(
      anterior ? inicio - anterior.fin : Number.POSITIVE_INFINITY,
      siguiente ? siguiente.inicio - fin : Number.POSITIVE_INFINITY
    );
  }

  return inicio;
}

function siguienteHorarioSinChoqueGrupo(
  cursor: CursorHorario,
  jornadas: FranjaGeneracion[],
  horas: number,
  calendario: CalendarioClase,
  bloquesGrupo: BloqueHorarioGenerado[]
) {
  const duracion = horas * 60;
  while (cursor.jornada < jornadas.length) {
    const jornada = jornadas[cursor.jornada];
    const clasesDia = cursor.clasesPorDia[jornada.dia_semana] ?? 0;
    if (jornada.max_clases !== null && jornada.max_clases !== undefined && clasesDia >= jornada.max_clases) {
      cursor.jornada++;
      if (cursor.jornada < jornadas.length) {
        cursor.minutos = toMinutes(jornadas[cursor.jornada].hora_inicio);
      }
      continue;
    }

    const finJornada = toMinutes(jornada.hora_fin);
    if (cursor.minutos + duracion <= finJornada) {
      const inicio = cursor.minutos;
      const horario = {
        dia_semana: jornada.dia_semana,
        hora_inicio: toTime(inicio),
        hora_fin: toTime(inicio + duracion),
      };
      cursor.minutos += duracion + (jornada.break_minutos ?? 0);
      if (bloqueChocaConGrupo({ ...horario, calendario }, bloquesGrupo)) {
        continue;
      }
      cursor.clasesPorDia[jornada.dia_semana] = clasesDia + 1;
      return horario;
    }

    cursor.jornada++;
    if (cursor.jornada < jornadas.length) {
      cursor.minutos = toMinutes(jornadas[cursor.jornada].hora_inicio);
    }
  }
  return null;
}

function buscarHorarioCompactado(
  lanes: CursorHorario[],
  jornadas: FranjaGeneracion[],
  horas: number,
  calendario: CalendarioClase,
  bloquesGrupo: BloqueHorarioGenerado[],
  bandaPreferida?: number
): HorarioCompactado | null {
  const candidatos: Array<{
    horario: { dia_semana: DiaSemana; hora_inicio: string; hora_fin: string };
    cursor: CursorHorario;
    laneIndex: number;
    nuevoLane: boolean;
    costo: number;
  }> = [];

  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
    const cursorPrueba = clonarCursor(lanes[laneIndex]);
    const horario = siguienteHorarioSinChoqueGrupo(cursorPrueba, jornadas, horas, calendario, bloquesGrupo);
    if (horario) {
      candidatos.push({
        horario,
        cursor: cursorPrueba,
        laneIndex,
        nuevoLane: false,
        costo: costoCompactacionGrupo({ ...horario, calendario }, bloquesGrupo),
      });
    }
  }

  if (candidatos.length === 0) {
    const cursoresIniciales = bandaPreferida === undefined
      ? [crearCursor(jornadas)]
      : [crearCursorDesdeBanda(jornadas, bandaPreferida), crearCursor(jornadas)];

    for (const nuevoCursor of cursoresIniciales) {
      const horario = siguienteHorarioSinChoqueGrupo(nuevoCursor, jornadas, horas, calendario, bloquesGrupo);
      if (horario) {
        candidatos.push({
          horario,
          cursor: nuevoCursor,
          laneIndex: lanes.length,
          nuevoLane: true,
          costo: costoCompactacionGrupo({ ...horario, calendario }, bloquesGrupo),
        });
        break;
      }
    }
  }

  const mejor = candidatos.sort((a, b) =>
    a.costo - b.costo ||
    toMinutes(a.horario.hora_inicio) - toMinutes(b.horario.hora_inicio)
  )[0];
  if (!mejor) return null;

  if (mejor.nuevoLane) {
    lanes.push(mejor.cursor);
  } else {
    copiarCursor(mejor.cursor, lanes[mejor.laneIndex]);
  }
  return { horario: mejor.horario, laneIndex: mejor.laneIndex };
}

function escogerCalendario(
  usadas: Record<'A' | 'B', number>,
  horas: number,
  capacidadHoras: number,
  preferida: 'A' | 'B'
): 'A' | 'B' | null {
  return ordenarCalendariosDisponibles(usadas, horas, capacidadHoras, preferida)[0] ?? null;
}

function ordenarCalendariosDisponibles(
  usadas: Record<'A' | 'B', number>,
  horas: number,
  capacidadHoras: number,
  preferida: 'A' | 'B'
): ('A' | 'B')[] {
  const secundaria: 'A' | 'B' = preferida === 'A' ? 'B' : 'A';
  const opciones: ('A' | 'B')[] = usadas.A === usadas.B
    ? [preferida, secundaria]
    : usadas.A < usadas.B ? ['A', 'B'] : ['B', 'A'];
  return opciones.filter(calendario => usadas[calendario] + horas <= capacidadHoras);
}

function buildClaseId(input: {
  periodo: string;
  programaId: string;
  sedeId: string;
  semestre: number;
  grupo: number;
  materiaId: string;
  calendario: CalendarioClase;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}) {
  const franja = `${input.diaSemana}-${input.calendario}-${input.horaInicio}-${input.horaFin}`.replace(/[:]/g, '');
  return `gen-clase-${input.periodo}-${input.programaId}-${input.sedeId}-sem${input.semestre}-g${input.grupo}-${input.materiaId}-${franja}`;
}

function departamentoKey(materia: { departamento_id?: string | null }) {
  return materia.departamento_id ?? '__sin_departamento__';
}

function ordenarUnidadesDepartamento<T extends { semestre: number; grupo: number; materia: { nombre: string; horas_semana: number } }>(
  unidades: T[]
) {
  return [...unidades].sort((a, b) =>
    a.grupo - b.grupo ||
    a.semestre - b.semestre ||
    Number(b.materia.horas_semana) - Number(a.materia.horas_semana) ||
    String(a.materia.nombre).localeCompare(String(b.materia.nombre))
  );
}

function normalizarSemestresGeneracion(
  input: unknown,
  semestresDefault: number[],
  gruposDefault: number
): SemestreGeneracion[] {
  const raw = Array.isArray(input) && input.length > 0
    ? input
    : semestresDefault.map(semestre => ({ semestre, grupos: gruposDefault }));

  const bySemestre = new Map<number, number>();
  raw.forEach((item: any) => {
    const semestre = Number(typeof item === 'object' ? item?.semestre : item);
    const grupos = Number(typeof item === 'object' ? item?.grupos : gruposDefault);
    if (!Number.isFinite(semestre) || semestre <= 0) return;
    bySemestre.set(semestre, Math.max(0, Math.min(20, Math.floor(Number.isFinite(grupos) ? grupos : gruposDefault))));
  });

  return [...bySemestre.entries()]
    .filter(([, grupos]) => grupos > 0)
    .sort(([a], [b]) => a - b)
    .map(([semestre, grupos]) => ({ semestre, grupos }));
}

function parseJsonArray(value: string | null) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializarTemplate(row: ClaseTemplateRow): ClaseTemplate {
  const diasSemana = normalizarDias(parseJsonArray(row.dias_semana_json));
  const jornadas = normalizarJornadas(parseJsonArray(row.jornadas_json));
  const diasConfig = normalizarDiasConfig(parseJsonArray(row.dias_config_json ?? null));
  return {
    id: row.id,
    nombre: row.nombre,
    programa_id: row.programa_id,
    dias_semana: diasConfig.length > 0 ? diasConfig.map(dia => dia.dia_semana) : diasSemana,
    jornadas: jornadas,
    dias_config: diasConfig.length > 0 ? diasConfig : diasConfigDesdeLegacy(diasSemana, jornadas),
    semestres: parseJsonArray(row.semestres_json),
    created_at: row.created_at,
  };
}

async function validarSemestresTemplate(db: D1Database, programaId: string | null, semestres: SemestreGeneracion[]) {
  if (!programaId) return null;
  const programa = await db.prepare('SELECT numero_semestres FROM programas WHERE id = ?')
    .bind(programaId)
    .first<{ numero_semestres: number }>();
  if (!programa) return 'Programa no encontrado';
  const maxSemestre = Number(programa.numero_semestres ?? 10);
  const fueraDeRango = semestres.find(item => item.semestre > maxSemestre);
  if (fueraDeRango) return `El programa solo tiene ${maxSemestre} semestre(s)`;
  return null;
}

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

clases.get('/templates', async (c) => {
  const { programa_id } = c.req.query();
  let query = 'SELECT * FROM clase_templates';
  const params: string[] = [];
  if (programa_id) {
    query += ' WHERE programa_id = ? OR programa_id IS NULL';
    params.push(programa_id);
  }
  query += ' ORDER BY programa_id IS NULL ASC, nombre';
  const result = await c.env.e_schedule_db.prepare(query).bind(...params).all<ClaseTemplateRow>();
  return c.json(result.results.map(serializarTemplate));
});

clases.post('/templates', async (c) => {
  const body = await c.req.json();
  const nombre = String(body.nombre ?? '').trim();
  const programaId = body.programa_id ? String(body.programa_id) : null;
  const jornadasLegacy = normalizarJornadas(body.jornadas);
  const diasConfigBody = normalizarDiasConfig(body.dias_config);
  const diasSemanaLegacy = normalizarDias(body.dias_semana);
  const diasConfig = diasConfigBody.length > 0 ? diasConfigBody : diasConfigDesdeLegacy(diasSemanaLegacy, jornadasLegacy);
  const diasSemana = diasConfig.map(dia => dia.dia_semana);
  const jornadas = jornadasLegacy.length > 0 ? jornadasLegacy : diasConfig[0]?.jornadas ?? [];
  const semestres = normalizarSemestresGeneracion(body.semestres, [], 1);

  if (!nombre) return c.json({ error: 'nombre es requerido' }, 400);
  if (diasSemana.length === 0) return c.json({ error: 'Selecciona al menos un día de clase' }, 400);
  if (diasConfig.some(dia => dia.jornadas.length === 0)) return c.json({ error: 'Define al menos una jornada valida por dia' }, 400);
  if (semestres.length === 0) return c.json({ error: 'Define al menos un semestre con grupos' }, 400);
  const semestresError = await validarSemestresTemplate(c.env.e_schedule_db, programaId, semestres);
  if (semestresError) return c.json({ error: semestresError }, 400);

  const id = crypto.randomUUID();
  await c.env.e_schedule_db.prepare(`
    INSERT INTO clase_templates (id, nombre, programa_id, dias_semana_json, jornadas_json, dias_config_json, semestres_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, nombre, programaId, JSON.stringify(diasSemana), JSON.stringify(jornadas), JSON.stringify(diasConfig), JSON.stringify(semestres)).run();

  const created = await c.env.e_schedule_db.prepare('SELECT * FROM clase_templates WHERE id = ?').bind(id).first<ClaseTemplateRow>();
  return c.json(created ? serializarTemplate(created) : { id }, 201);
});

clases.put('/templates/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const existing = await c.env.e_schedule_db.prepare('SELECT * FROM clase_templates WHERE id = ?').bind(id).first<ClaseTemplateRow>();
  if (!existing) return c.json({ error: 'Plantilla no encontrada' }, 404);

  const nombre = String(body.nombre ?? existing.nombre).trim();
  const programaId = body.programa_id === undefined ? existing.programa_id : (body.programa_id ? String(body.programa_id) : null);
  const jornadasLegacy = normalizarJornadas(body.jornadas ?? parseJsonArray(existing.jornadas_json));
  const diasSemanaLegacy = normalizarDias(body.dias_semana ?? parseJsonArray(existing.dias_semana_json));
  const diasConfigExisting = normalizarDiasConfig(parseJsonArray(existing.dias_config_json ?? null));
  const diasConfigBody = body.dias_config === undefined ? [] : normalizarDiasConfig(body.dias_config);
  const diasConfig = body.dias_config === undefined
    ? (diasConfigExisting.length > 0 ? diasConfigExisting : diasConfigDesdeLegacy(diasSemanaLegacy, jornadasLegacy))
    : diasConfigBody.length > 0 ? diasConfigBody : diasConfigDesdeLegacy(diasSemanaLegacy, jornadasLegacy);
  const diasSemana = diasConfig.map(dia => dia.dia_semana);
  const jornadas = jornadasLegacy.length > 0 ? jornadasLegacy : diasConfig[0]?.jornadas ?? [];
  const semestres = normalizarSemestresGeneracion(body.semestres ?? parseJsonArray(existing.semestres_json), [], 1);

  if (!nombre) return c.json({ error: 'nombre es requerido' }, 400);
  if (diasSemana.length === 0) return c.json({ error: 'Selecciona al menos un día de clase' }, 400);
  if (diasConfig.some(dia => dia.jornadas.length === 0)) return c.json({ error: 'Define al menos una jornada valida por dia' }, 400);
  if (semestres.length === 0) return c.json({ error: 'Define al menos un semestre con grupos' }, 400);
  const semestresError = await validarSemestresTemplate(c.env.e_schedule_db, programaId, semestres);
  if (semestresError) return c.json({ error: semestresError }, 400);

  await c.env.e_schedule_db.prepare(`
    UPDATE clase_templates
    SET nombre = ?, programa_id = ?, dias_semana_json = ?, jornadas_json = ?, dias_config_json = ?, semestres_json = ?
    WHERE id = ?
  `).bind(nombre, programaId, JSON.stringify(diasSemana), JSON.stringify(jornadas), JSON.stringify(diasConfig), JSON.stringify(semestres), id).run();

  const updated = await c.env.e_schedule_db.prepare('SELECT * FROM clase_templates WHERE id = ?').bind(id).first<ClaseTemplateRow>();
  return c.json(updated ? serializarTemplate(updated) : { id });
});

clases.delete('/templates/:id', async (c) => {
  const { id } = c.req.param();
  const existing = await c.env.e_schedule_db.prepare('SELECT id FROM clase_templates WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Plantilla no encontrada' }, 404);
  await c.env.e_schedule_db.prepare('DELETE FROM clase_templates WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

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

async function deleteClasesPorFiltro(
  db: D1Database,
  filtro: { periodo?: string; programa_id?: string; sede_ids?: string[]; semestre?: string }
) {
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (filtro.periodo) {
    where += ' AND cl.periodo = ?';
    params.push(filtro.periodo);
  }
  if (filtro.programa_id) {
    where += ' AND cl.programa_id = ?';
    params.push(filtro.programa_id);
  }
  if (filtro.sede_ids && filtro.sede_ids.length > 0) {
    where += ` AND cl.sede_id IN (${filtro.sede_ids.map(() => '?').join(',')})`;
    params.push(...filtro.sede_ids);
  }
  if (filtro.semestre) {
    where += ' AND m.semestre = ?';
    params.push(Number(filtro.semestre));
  }

  const clasesResult = await db.prepare(`
    SELECT cl.id, cl.periodo, cl.materia_id, cl.sede_id, cl.grupo, cl.calendario, m.horas_semana
    FROM clases cl
    JOIN materias m ON cl.materia_id = m.id
    ${where}
  `).bind(...params).all<{
    id: string;
    periodo: string;
    materia_id: string;
    sede_id: string;
    grupo: number;
    calendario: CalendarioClase;
    horas_semana: number;
  }>();
  const clasesAEliminar = clasesResult.results;
  if (clasesAEliminar.length === 0) return { clases_eliminadas: 0, asignaciones_eliminadas: 0 };

  const cargaPorDocente = new Map<string, number>();
  let asignacionesEliminadas = 0;

  for (const clase of clasesAEliminar) {
    const asignaciones = await db.prepare(`
      SELECT docente_id
      FROM asignaciones
      WHERE periodo = ?
        AND materia_id = ?
        AND sede_id = ?
        AND grupo = ?
        AND calendario = ?
    `).bind(clase.periodo, clase.materia_id, clase.sede_id, clase.grupo, clase.calendario).all<{ docente_id: string }>();
    asignacionesEliminadas += asignaciones.results.length;
    asignaciones.results.forEach(asignacion => {
      cargaPorDocente.set(asignacion.docente_id, (cargaPorDocente.get(asignacion.docente_id) ?? 0) + clase.horas_semana);
    });
  }

  const statements: D1PreparedStatement[] = [];
  cargaPorDocente.forEach((horas, docenteId) => {
    statements.push(
      db.prepare('UPDATE docentes SET horas_asignadas = max(0, horas_asignadas - ?) WHERE id = ?').bind(horas, docenteId)
    );
  });
  clasesAEliminar.forEach(clase => {
    statements.push(
      db.prepare(`
        DELETE FROM asignaciones
        WHERE periodo = ?
          AND materia_id = ?
          AND sede_id = ?
          AND grupo = ?
          AND calendario = ?
      `).bind(clase.periodo, clase.materia_id, clase.sede_id, clase.grupo, clase.calendario)
    );
    statements.push(db.prepare('DELETE FROM clases WHERE id = ?').bind(clase.id));
  });

  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50));
  }

  return { clases_eliminadas: clasesAEliminar.length, asignaciones_eliminadas: asignacionesEliminadas };
}

clases.post('/generar', async (c) => {
  const db = c.env.e_schedule_db;
  const body = await c.req.json();
  const periodo = String(body.periodo ?? '');
  const programaId = String(body.programa_id ?? '');
  const diasSemana = normalizarDias(body.dias_semana);
  const gruposPorSemestre = Math.max(1, Math.min(20, Number(body.grupos_por_semestre ?? 1)));
  const reemplazarExistentes = Boolean(body.reemplazar_existentes);
  const jornadas = normalizarJornadas(body.jornadas);
  const semestresPorSede = (body.semestres_por_sede ?? {}) as Record<string, unknown>;
  const configuracionSedes = (body.configuracion_sedes ?? {}) as Record<string, ConfiguracionSedeGeneracion>;
  const sedeTemplates: SedeTemplateInput[] = Array.isArray(body.sede_templates)
    ? body.sede_templates
      .map((item: any) => ({ sede_id: String(item?.sede_id ?? ''), template_id: String(item?.template_id ?? '') }))
      .filter((item: SedeTemplateInput) => item.sede_id && item.template_id)
    : [];
  const sedeIdsSolicitadas = Array.isArray(body.sede_ids) ? body.sede_ids.map(String).filter(Boolean) : [];

  if (!periodo || !programaId) return c.json({ error: 'periodo y programa_id son requeridos' }, 400);
  if ((diasSemana.length === 0 || jornadas.length === 0) && sedeTemplates.length === 0) {
    return c.json({ error: 'Define días y jornadas válidas o usa plantillas por sede' }, 400);
  }

  const programa = await db.prepare('SELECT id, nombre, tipo_ciclo FROM programas WHERE id = ?')
    .bind(programaId)
    .first<{ id: string; nombre: string; tipo_ciclo: 'semanal' | 'quincenal' }>();
  if (!programa) return c.json({ error: 'Programa no encontrado' }, 404);

  const materiasResult = await db.prepare(`
    SELECT *
    FROM materias
    WHERE programa_id = ? AND semestre IS NOT NULL
    ORDER BY semestre, nombre
  `).bind(programaId).all<any>();
  const materias = materiasResult.results;
  if (materias.length === 0) return c.json({ error: 'El programa no tiene materias parametrizadas por semestre' }, 400);

  let sedesQuery = `
    SELECT s.*
    FROM sede_programa sp
    JOIN sedes s ON sp.sede_id = s.id
    WHERE sp.programa_id = ?
  `;
  const sedesParams: any[] = [programaId];
  if (sedeIdsSolicitadas.length > 0) {
    sedesQuery += ` AND s.id IN (${sedeIdsSolicitadas.map(() => '?').join(',')})`;
    sedesParams.push(...sedeIdsSolicitadas);
  }
  sedesQuery += ' ORDER BY s.nombre';
  const sedesResult = await db.prepare(sedesQuery).bind(...sedesParams).all<any>();
  const sedes = sedesResult.results;
  if (sedes.length === 0) return c.json({ error: 'El programa no tiene sedes ofertadas para generar clases' }, 400);

  const templateIds: string[] = [...new Set(sedeTemplates.map((item: SedeTemplateInput) => item.template_id))];
  const templatesPorId = new Map<string, ClaseTemplate>();
  if (templateIds.length > 0) {
    const templatesResult = await db.prepare(`
      SELECT *
      FROM clase_templates
      WHERE id IN (${templateIds.map(() => '?').join(',')})
    `).bind(...templateIds).all<ClaseTemplateRow>();
    templatesResult.results.forEach(row => templatesPorId.set(row.id, serializarTemplate(row)));
    const faltantes = templateIds.filter(id => !templatesPorId.has(id));
    if (faltantes.length > 0) return c.json({ error: `No se encontraron plantillas: ${faltantes.join(', ')}` }, 400);
  }
  const templatePorSede = new Map<string, ClaseTemplate | undefined>(
    sedeTemplates.map((item: SedeTemplateInput) => [item.sede_id, templatesPorId.get(item.template_id)])
  );

  if (reemplazarExistentes) {
    await deleteClasesPorFiltro(db, { periodo, programa_id: programaId, sede_ids: sedes.map(s => s.id) });
  }

  const statements: D1PreparedStatement[] = [];
  const errores: string[] = [];
  let clasesCreadas = 0;
  const semestresPrograma = [...new Set(materias.map(m => Number(m.semestre)).filter(Number.isFinite))].sort((a, b) => a - b);

  for (const [sedeIndex, sede] of sedes.entries()) {
    const configSede: ConfiguracionSedeGeneracion = configuracionSedes[sede.id] ?? {};
    const templateSede = templatePorSede.get(sede.id);
    const diasSede = normalizarDias(configSede.dias_semana).length > 0
      ? normalizarDias(configSede.dias_semana)
      : templateSede?.dias_semana?.length
        ? templateSede.dias_semana
        : diasSemana;
    const jornadasTemplate = normalizarJornadas(templateSede?.jornadas);
    const jornadasConfig = normalizarJornadas(configSede.jornadas);
    const jornadasSede = jornadasConfig.length > 0
      ? jornadasConfig
      : jornadasTemplate.length > 0
        ? jornadasTemplate
      : jornadas;
    const diasConfig = normalizarDiasConfig(configSede.dias_config);
    const diasConfigSede = diasConfig.length > 0
      ? diasConfig
      : templateSede?.dias_config?.length
        ? templateSede.dias_config
        : diasConfigDesdeLegacy(diasSede, jornadasSede);
    const semestresLegacy = Array.isArray(semestresPorSede[sede.id])
      ? (semestresPorSede[sede.id] as unknown[]).map(semestre => ({ semestre, grupos: gruposPorSemestre }))
      : undefined;
    const semestres = normalizarSemestresGeneracion(configSede.semestres ?? templateSede?.semestres ?? semestresLegacy, semestresPrograma, gruposPorSemestre);
    const franjasSede = expandirFranjasDesdeDiasConfig(diasConfigSede);
    const capacidadHoras = totalMinutosJornadas(franjasSede) / 60;

    if (diasConfigSede.length === 0) {
      errores.push(`Selecciona al menos un día para ${sede.nombre}`);
      continue;
    }
    if (franjasSede.length === 0) {
      errores.push(`Define al menos una jornada valida para ${sede.nombre}`);
      continue;
    }

    type UnidadClaseGeneracion = {
      semestre: number;
      grupo: number;
      materia: any;
    };
    const unidadesPorDepartamento = new Map<string, UnidadClaseGeneracion[]>();
    const horasUsadasPorGrupo = new Map<string, Record<'A' | 'B', number>>();
    const horariosPorGrupo = new Map<string, BloqueHorarioGenerado[]>();
    const lanesPorDepartamentoCalendario = new Map<string, CursorHorario[]>();

    for (const semestreConfig of semestres) {
      const { semestre, grupos } = semestreConfig;
      const materiasSemestre = materias
        .filter(m => Number(m.semestre) === semestre)
        .sort((a, b) => Number(b.horas_semana) - Number(a.horas_semana) || String(a.nombre).localeCompare(String(b.nombre)));
      if (materiasSemestre.length === 0) continue;

      for (let grupo = 1; grupo <= grupos; grupo++) {
        for (const materia of materiasSemestre) {
          const key = departamentoKey(materia);
          if (!unidadesPorDepartamento.has(key)) unidadesPorDepartamento.set(key, []);
          unidadesPorDepartamento.get(key)!.push({ semestre, grupo, materia });
        }
      }
    }

    const departamentosOrdenados = [...unidadesPorDepartamento.entries()]
      .sort(([depA, unidadesA], [depB, unidadesB]) =>
        unidadesB.length - unidadesA.length ||
        depA.localeCompare(depB)
      );
    const mayorCargaDepartamento = departamentosOrdenados[0]?.[1].length ?? 0;
    const umbralBajaCarga = Math.max(2, Math.ceil(mayorCargaDepartamento * 0.35));
    let rotacionBajaCarga = sedeIndex % 3;

    for (const [departamento, unidadesDepartamento] of departamentosOrdenados) {
      const esDepartamentoBajaCarga = unidadesDepartamento.length <= umbralBajaCarga;
      for (const unidad of ordenarUnidadesDepartamento(unidadesDepartamento)) {
        const { semestre, grupo, materia } = unidad;
        const horas = Number(materia.horas_semana);
        const grupoKey = `${semestre}|${grupo}`;
        if (!horasUsadasPorGrupo.has(grupoKey)) horasUsadasPorGrupo.set(grupoKey, { A: 0, B: 0 });
        if (!horariosPorGrupo.has(grupoKey)) horariosPorGrupo.set(grupoKey, []);
        const horasUsadas = horasUsadasPorGrupo.get(grupoKey)!;
        const horariosGrupo = horariosPorGrupo.get(grupoKey)!;
        const preferida: 'A' | 'B' = (sedeIndex + semestre + grupo) % 2 === 0 ? 'A' : 'B';
        const calendariosAProbar: CalendarioClase[] = programa.tipo_ciclo === 'semanal'
          ? ['semanal']
          : ordenarCalendariosDisponibles(horasUsadas, horas, capacidadHoras, preferida);
        if (calendariosAProbar.length === 0) {
          errores.push(`No hay cupo para ${materia.nombre} en ${sede.nombre}, semestre ${semestre}, grupo ${grupo}`);
          continue;
        }
        let calendario: CalendarioClase | null = null;
        let horario: { dia_semana: DiaSemana; hora_inicio: string; hora_fin: string } | null = null;
        for (const calendarioCandidato of calendariosAProbar) {
          const lanesKey = `${departamento}|${calendarioCandidato}`;
          if (!lanesPorDepartamentoCalendario.has(lanesKey)) lanesPorDepartamentoCalendario.set(lanesKey, []);
          const resultado = buscarHorarioCompactado(
            lanesPorDepartamentoCalendario.get(lanesKey)!,
            franjasSede,
            horas,
            calendarioCandidato,
            horariosGrupo,
            esDepartamentoBajaCarga ? rotacionBajaCarga % 3 : undefined
          );
          if (resultado) {
            calendario = calendarioCandidato;
            horario = resultado.horario;
            if (esDepartamentoBajaCarga) rotacionBajaCarga++;
            break;
          }
        }
        if (!horario || !calendario) {
          const detalleCalendario = programa.tipo_ciclo === 'semanal'
            ? 'semanal'
            : `semanas ${calendariosAProbar.join('/')}`;
          errores.push(`No hay horario disponible para ${materia.nombre} en ${sede.nombre}, semestre ${semestre}, grupo ${grupo}, ${detalleCalendario}`);
          continue;
        }
        if (calendario !== 'semanal') horasUsadas[calendario] += horas;
        horariosGrupo.push({ ...horario, calendario });
        const id = buildClaseId({
          periodo,
          programaId,
          sedeId: sede.id,
          semestre,
          grupo,
          materiaId: materia.id,
          calendario,
          diaSemana: horario.dia_semana,
          horaInicio: horario.hora_inicio,
          horaFin: horario.hora_fin,
        });
        statements.push(db.prepare(`
          INSERT INTO clases (id, periodo, programa_id, materia_id, sede_id, grupo, calendario, dia_semana, hora_inicio, hora_fin)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, periodo, programaId, materia.id, sede.id, grupo, calendario, horario.dia_semana, horario.hora_inicio, horario.hora_fin));
        clasesCreadas++;
      }
    }
  }

  if (errores.length > 0) return c.json({ error: 'No fue posible generar todas las clases', detalles: errores.slice(0, 12) }, 400);

  try {
    for (let i = 0; i < statements.length; i += 50) {
      await db.batch(statements.slice(i, i + 50));
    }
  } catch (e: any) {
    return c.json({ error: e.message?.includes('UNIQUE') ? 'Ya existen clases con esos mismos datos. Activa reemplazar existentes o ajusta los parámetros.' : e.message }, 400);
  }

  return c.json({
    success: true,
    periodo,
    programa_id: programaId,
    sedes_procesadas: sedes.length,
    grupos_por_semestre: gruposPorSemestre,
    clases_creadas: clasesCreadas,
  }, 201);
});

clases.delete('/bulk', async (c) => {
  const { periodo, programa_id, sede_id, semestre } = c.req.query();
  if (!periodo && !programa_id && !sede_id && !semestre) {
    return c.json({ error: 'Define al menos un filtro para borrar clases' }, 400);
  }
  const sedeIds = sede_id ? sede_id.split(',').map(s => s.trim()).filter(Boolean) : undefined;
  const result = await deleteClasesPorFiltro(c.env.e_schedule_db, { periodo, programa_id, sede_ids: sedeIds, semestre });
  return c.json({ success: true, ...result });
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
