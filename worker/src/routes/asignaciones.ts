import { Hono } from 'hono';
import type { Bindings, Docente, Sede, Materia, Disponibilidad, Asignacion, Programa, ClaseAcademica } from '../types';
import { validarAsignacion } from '../engine/validator';
import { generarCandidatos } from '../engine/optimizer';
import { horasBloque, haversineKm } from '../utils/haversine';

const asignaciones = new Hono<{ Bindings: Bindings }>();

type CalendarioAsignacion = 'A' | 'B' | 'semanal';
type ModoAsignacion = 'automatico' | 'libre' | 'foraneo';

function classKey(input: {
  periodo: string;
  sede_id: string;
  materia_id: string;
  grupo: number;
  calendario: CalendarioAsignacion;
}) {
  return `${input.periodo}|${input.sede_id}|${input.materia_id}|${input.grupo}|${input.calendario}`;
}

async function resolverCalendarioAsignacion(
  db: D1Database,
  materiaId: string,
  calendarioSolicitado?: unknown
): Promise<{ calendario: CalendarioAsignacion; tipo_ciclo: 'semanal' | 'quincenal' } | { error: string }> {
  const row = await db
    .prepare(`
      SELECT COALESCE(p.tipo_ciclo, 'semanal') as tipo_ciclo
      FROM materias m
      LEFT JOIN programas p ON m.programa_id = p.id
      WHERE m.id = ?
    `)
    .bind(materiaId)
    .first<{ tipo_ciclo: 'semanal' | 'quincenal' }>();

  if (!row) return { error: 'Materia no encontrada' };
  if (row.tipo_ciclo === 'semanal') return { calendario: 'semanal', tipo_ciclo: 'semanal' };
  if (calendarioSolicitado !== 'A' && calendarioSolicitado !== 'B') {
    return { error: 'Selecciona Semana A o Semana B para materias de programas quincenales' };
  }
  return { calendario: calendarioSolicitado, tipo_ciclo: 'quincenal' };
}

asignaciones.get('/', async (c) => {
  const { periodo, docente_id, sede_id } = c.req.query();
  let query = `
    SELECT a.*,
      d.nombre as docente_nombre,
      d.celula_id as docente_celula_id,
      s.nombre as sede_nombre,
      s.celula_id as sede_celula_id,
      s.latitud, s.longitud,
      m.nombre as materia_nombre,
      m.semestre,
      cs.nombre as celula_nombre,
      cs.nombre as sede_celula_nombre,
      cd.nombre as docente_celula_nombre
    FROM asignaciones a
    JOIN docentes d ON a.docente_id = d.id
    JOIN sedes s ON a.sede_id = s.id
    JOIN materias m ON a.materia_id = m.id
    LEFT JOIN celulas cs ON s.celula_id = cs.id
    LEFT JOIN celulas cd ON d.celula_id = cd.id
    WHERE 1=1
  `;
  const params: string[] = [];
  if (periodo) { query += ' AND a.periodo = ?'; params.push(periodo); }
  if (docente_id) { query += ' AND a.docente_id = ?'; params.push(docente_id); }
  if (sede_id) { query += ' AND a.sede_id = ?'; params.push(sede_id); }
  query += ' ORDER BY a.dia_semana, a.hora_inicio';
  const result = await c.env.e_schedule_db.prepare(query).bind(...params).all();
  return c.json(result.results);
});

asignaciones.get('/:id', async (c) => {
  const { id } = c.req.param();
  const asignacion = await c.env.e_schedule_db
    .prepare(`
      SELECT a.*, d.nombre as docente_nombre, s.nombre as sede_nombre, m.nombre as materia_nombre
      FROM asignaciones a
      JOIN docentes d ON a.docente_id = d.id
      JOIN sedes s ON a.sede_id = s.id
      JOIN materias m ON a.materia_id = m.id
      WHERE a.id = ?
    `)
    .bind(id)
    .first();
  if (!asignacion) return c.json({ error: 'Asignación no encontrada' }, 404);
  return c.json(asignacion);
});

asignaciones.post('/validar', async (c) => {
  const body = await c.req.json();
  const { docente_id, sede_id, dia_semana, hora_inicio, hora_fin, modo_libre } = body;
  if (!docente_id || !sede_id || !dia_semana || !hora_inicio || !hora_fin) {
    return c.json({ error: 'docente_id, sede_id, dia_semana, hora_inicio y hora_fin son requeridos' }, 400);
  }
  const [docente, sede] = await Promise.all([
    c.env.e_schedule_db.prepare('SELECT * FROM docentes WHERE id = ?').bind(docente_id).first(),
    c.env.e_schedule_db.prepare('SELECT * FROM sedes WHERE id = ?').bind(sede_id).first(),
  ]);
  if (!docente) return c.json({ error: 'Docente no encontrado' }, 404);
  if (!sede) return c.json({ error: 'Sede no encontrada' }, 404);
  const asignacionesExistentes = await c.env.e_schedule_db
    .prepare('SELECT * FROM asignaciones WHERE docente_id = ?')
    .bind(docente_id)
    .all();
  const result = validarAsignacion({
    docente: docente as unknown as Docente,
    sede: sede as unknown as Sede,
    dia_semana,
    hora_inicio,
    hora_fin,
    modoLibre: modo_libre ?? false,
    asignacionesExistentes: asignacionesExistentes.results as unknown as Asignacion[],
  });
  return c.json(result);
});

asignaciones.post('/auto', async (c) => {
  const body = await c.req.json();
  const { docente_id, materia_id, periodo, calendario } = body;
  if (!docente_id || !materia_id || !periodo) {
    return c.json({ error: 'docente_id, materia_id y periodo son requeridos' }, 400);
  }
  const [docente, materia] = await Promise.all([
    c.env.e_schedule_db.prepare('SELECT * FROM docentes WHERE id = ?').bind(docente_id).first(),
    c.env.e_schedule_db.prepare('SELECT * FROM materias WHERE id = ?').bind(materia_id).first(),
  ]);
  if (!docente) return c.json({ error: 'Docente no encontrado' }, 404);
  if (!materia) return c.json({ error: 'Materia no encontrada' }, 404);

  const docenteTyped = docente as unknown as Docente;
  const materiaTyped = materia as unknown as Materia;
  const calendarioResult = await resolverCalendarioAsignacion(c.env.e_schedule_db, materia_id, calendario);
  if ('error' in calendarioResult) {
    return c.json({ error: calendarioResult.error }, 400);
  }

  let sedesQuery: string;
  let sedesParams: string[];
  if (docenteTyped.tipo_vinculacion === 'central' || docenteTyped.modo_libre === 1) {
    sedesQuery = 'SELECT * FROM sedes';
    sedesParams = [];
  } else {
    sedesQuery = 'SELECT * FROM sedes WHERE celula_id = ?';
    sedesParams = [docenteTyped.celula_id!];
  }

  const [sedesResult, disponibilidadResult, asignacionesResult] = await Promise.all([
    c.env.e_schedule_db.prepare(sedesQuery).bind(...sedesParams).all(),
    c.env.e_schedule_db.prepare('SELECT * FROM disponibilidad WHERE docente_id = ?').bind(docente_id).all(),
    c.env.e_schedule_db.prepare('SELECT * FROM asignaciones WHERE docente_id = ?').bind(docente_id).all(),
  ]);

  const sedeRef = docenteTyped.celula_id
    ? await c.env.e_schedule_db.prepare('SELECT * FROM sedes WHERE celula_id = ? AND tipo = ?').bind(docenteTyped.celula_id, 'celula').first()
    : null;

  const candidatos = generarCandidatos({
    docente: docenteTyped,
    materia: materiaTyped,
    sedes_disponibles: sedesResult.results as unknown as Sede[],
    sede_docente_ref: sedeRef as unknown as Sede | null,
    disponibilidad: disponibilidadResult.results as unknown as Disponibilidad[],
    asignaciones_existentes: asignacionesResult.results as unknown as Asignacion[],
    periodo,
    tipo_ciclo_programa: calendarioResult.tipo_ciclo,
    calendario_inicio_periodo: calendarioResult.calendario === 'semanal' ? 'A' : calendarioResult.calendario,
  });

  if (candidatos.length === 0) {
    return c.json({
      error: 'No se encontraron candidatos válidos. Verifica disponibilidad y restricciones.',
      modo_libre_sugerido: docenteTyped.horas_asignadas < docenteTyped.max_horas,
    }, 409);
  }

  return c.json({ candidatos: candidatos.slice(0, 5) });
});

asignaciones.post('/', async (c) => {
  const body = await c.req.json();
  const { docente_id, sede_id, materia_id, dia_semana, hora_inicio, hora_fin, modo, periodo, grupo, calendario } = body;
  if (!docente_id || !sede_id || !materia_id || !dia_semana || !hora_inicio || !hora_fin || !periodo) {
    return c.json({ error: 'Todos los campos son requeridos' }, 400);
  }
  const [docente, sede] = await Promise.all([
    c.env.e_schedule_db.prepare('SELECT * FROM docentes WHERE id = ?').bind(docente_id).first(),
    c.env.e_schedule_db.prepare('SELECT * FROM sedes WHERE id = ?').bind(sede_id).first(),
  ]);
  if (!docente) return c.json({ error: 'Docente no encontrado' }, 404);
  if (!sede) return c.json({ error: 'Sede no encontrada' }, 404);

  const docenteTyped = docente as unknown as Docente;
  const sedeTyped = sede as unknown as Sede;
  const calendarioResult = await resolverCalendarioAsignacion(c.env.e_schedule_db, materia_id, calendario);
  if ('error' in calendarioResult) {
    return c.json({ error: calendarioResult.error }, 400);
  }
  const asignacionesExistentes = await c.env.e_schedule_db
    .prepare('SELECT * FROM asignaciones WHERE docente_id = ?')
    .bind(docente_id)
    .all();

  // Calcular grupo si no se envía: siguiente grupo disponible para sede+materia+periodo
  let grupoFinal: number = grupo ?? 1;
  if (!grupo) {
    const gruposExistentes = await c.env.e_schedule_db
      .prepare('SELECT grupo FROM asignaciones WHERE sede_id = ? AND materia_id = ? AND periodo = ?')
      .bind(sede_id, materia_id, periodo)
      .all();
    const nums = (gruposExistentes.results as any[]).map(r => r.grupo as number);
    grupoFinal = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  }

  const calendarioFinal = calendarioResult.calendario;
  const asignacionClaseExistente = await c.env.e_schedule_db
    .prepare(`
      SELECT id FROM asignaciones
      WHERE periodo = ? AND sede_id = ? AND materia_id = ? AND grupo = ? AND calendario = ?
      LIMIT 1
    `)
    .bind(periodo, sede_id, materia_id, grupoFinal, calendarioFinal)
    .first<{ id: string }>();
  if (asignacionClaseExistente) {
    return c.json({ error: 'Esta clase ya tiene una asignación confirmada' }, 409);
  }

  const modoFinal: ModoAsignacion = modo === 'foraneo'
    ? 'foraneo'
    : modo === 'libre' || docenteTyped.modo_libre === 1 ? 'libre' : 'automatico';
  const validacion = validarAsignacion({
    docente: docenteTyped,
    sede: sedeTyped,
    dia_semana,
    hora_inicio,
    hora_fin,
    modoLibre: modoFinal === 'libre' || modoFinal === 'foraneo',
    grupo: grupoFinal,
    calendario: calendarioFinal,
    asignacionesExistentes: asignacionesExistentes.results as unknown as Asignacion[],
  });

  if (!validacion.valido) {
    return c.json({ error: 'Validación fallida', errores: validacion.errores }, 422);
  }

  // La capacidad docente consume horas nominales aunque la clase sea quincenal.
  const horas = horasBloque(hora_inicio, hora_fin);
  const id = docente_id.startsWith('dev-doc-pilot-')
    ? `dev-asig-pilot-${crypto.randomUUID()}`
    : crypto.randomUUID();

  await c.env.e_schedule_db.batch([
    c.env.e_schedule_db
      .prepare('INSERT INTO asignaciones (id, docente_id, sede_id, materia_id, dia_semana, hora_inicio, hora_fin, modo, periodo, grupo, calendario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, docente_id, sede_id, materia_id, dia_semana, hora_inicio, hora_fin, modoFinal, periodo, grupoFinal, calendarioFinal),
    c.env.e_schedule_db
      .prepare('UPDATE docentes SET horas_asignadas = horas_asignadas + ? WHERE id = ?')
      .bind(horas, docente_id),
  ]);

  const created = await c.env.e_schedule_db
    .prepare(`
      SELECT a.*, d.nombre as docente_nombre, s.nombre as sede_nombre, m.nombre as materia_nombre
      FROM asignaciones a
      JOIN docentes d ON a.docente_id = d.id
      JOIN sedes s ON a.sede_id = s.id
      JOIN materias m ON a.materia_id = m.id
      WHERE a.id = ?
    `)
    .bind(id)
    .first();
  return c.json(created, 201);
});

asignaciones.post('/bulk', async (c) => {
  const body = await c.req.json();
  const items = Array.isArray(body) ? body : body.asignaciones;
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Envía una lista de asignaciones para confirmar' }, 400);
  }

  const [docentesResult, sedesResult, materiasResult, existentesResult] = await Promise.all([
    c.env.e_schedule_db.prepare('SELECT * FROM docentes').all(),
    c.env.e_schedule_db.prepare('SELECT * FROM sedes').all(),
    c.env.e_schedule_db.prepare(`
      SELECT m.*, COALESCE(p.tipo_ciclo, 'semanal') as tipo_ciclo
      FROM materias m
      LEFT JOIN programas p ON m.programa_id = p.id
    `).all(),
    c.env.e_schedule_db.prepare('SELECT * FROM asignaciones').all(),
  ]);

  const docentesMap = new Map((docentesResult.results as unknown as Docente[]).map(d => [d.id, d]));
  const sedesMap = new Map((sedesResult.results as unknown as Sede[]).map(s => [s.id, s]));
  const materiasMap = new Map((materiasResult.results as unknown as (Materia & { tipo_ciclo: 'semanal' | 'quincenal' })[]).map(m => [m.id, m]));
  const asignacionesSimuladas = [...(existentesResult.results as unknown as Asignacion[])];
  const clasesConfirmadas = new Set(asignacionesSimuladas.map(a => classKey({
    periodo: a.periodo,
    sede_id: a.sede_id,
    materia_id: a.materia_id,
    grupo: a.grupo,
    calendario: a.calendario,
  })));
  const horasSimuladas: Record<string, number> = {};
  for (const docente of docentesMap.values()) horasSimuladas[docente.id] = docente.horas_asignadas;

  const preparadas: Array<{
    id: string;
    docente_id: string;
    sede_id: string;
    materia_id: string;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    modo: ModoAsignacion;
    periodo: string;
    grupo: number;
    calendario: CalendarioAsignacion;
    horas: number;
  }> = [];

  for (const [index, item] of items.entries()) {
    const { docente_id, sede_id, materia_id, dia_semana, hora_inicio, hora_fin, modo, periodo, grupo, calendario } = item;
    if (!docente_id || !sede_id || !materia_id || !dia_semana || !hora_inicio || !hora_fin || !periodo) {
      return c.json({ error: 'Asignación incompleta', index }, 400);
    }

    const docente = docentesMap.get(docente_id);
    const sede = sedesMap.get(sede_id);
    const materia = materiasMap.get(materia_id);
    if (!docente) return c.json({ error: 'Docente no encontrado', index, docente_id }, 404);
    if (!sede) return c.json({ error: 'Sede no encontrada', index, sede_id }, 404);
    if (!materia) return c.json({ error: 'Materia no encontrada', index, materia_id }, 404);

    let calendarioFinal: CalendarioAsignacion;
    if (materia.tipo_ciclo === 'semanal') {
      calendarioFinal = 'semanal';
    } else if (calendario === 'A' || calendario === 'B') {
      calendarioFinal = calendario;
    } else {
      return c.json({ error: 'Selecciona Semana A o Semana B para materias de programas quincenales', index }, 400);
    }

    const grupoFinal = Number(grupo) || 1;
    const key = classKey({ periodo, sede_id, materia_id, grupo: grupoFinal, calendario: calendarioFinal });
    if (clasesConfirmadas.has(key)) {
      return c.json({
        error: 'Una clase del lote ya tiene asignación confirmada. No se guardó nada del lote.',
        index,
        asignacion: item,
      }, 409);
    }

    const modoFinal: ModoAsignacion = modo === 'foraneo'
      ? 'foraneo'
      : modo === 'libre' || docente.modo_libre === 1 ? 'libre' : 'automatico';
    const docenteSimulado: Docente = { ...docente, horas_asignadas: horasSimuladas[docente_id] ?? docente.horas_asignadas };
    const asigDocente = asignacionesSimuladas.filter(a => a.docente_id === docente_id);
    const validacion = validarAsignacion({
      docente: docenteSimulado,
      sede,
      dia_semana,
      hora_inicio,
      hora_fin,
      modoLibre: modoFinal === 'libre' || modoFinal === 'foraneo',
      grupo: grupoFinal,
      calendario: calendarioFinal,
      asignacionesExistentes: asigDocente,
    });

    if (!validacion.valido) {
      return c.json({
        error: 'Validación fallida antes de guardar. No se confirmó ninguna asignación del lote.',
        index,
        asignacion: item,
        errores: validacion.errores,
      }, 422);
    }

    const horas = horasBloque(hora_inicio, hora_fin);
    const id = docente_id.startsWith('dev-doc-pilot-')
      ? `dev-asig-pilot-${crypto.randomUUID()}`
      : crypto.randomUUID();

    preparadas.push({
      id,
      docente_id,
      sede_id,
      materia_id,
      dia_semana,
      hora_inicio,
      hora_fin,
      modo: modoFinal,
      periodo,
      grupo: grupoFinal,
      calendario: calendarioFinal,
      horas,
    });
    horasSimuladas[docente_id] = (horasSimuladas[docente_id] ?? 0) + horas;
    clasesConfirmadas.add(key);
    asignacionesSimuladas.push({
      id,
      docente_id,
      sede_id,
      materia_id,
      dia_semana,
      hora_inicio,
      hora_fin,
      modo: modoFinal,
      distancia_km: null,
      periodo,
      programa_id: materia.programa_id ?? null,
      grupo: grupoFinal,
      calendario: calendarioFinal,
      created_at: new Date().toISOString(),
    } as Asignacion);
  }

  const horasPorDocente = new Map<string, number>();
  for (const item of preparadas) {
    horasPorDocente.set(item.docente_id, (horasPorDocente.get(item.docente_id) ?? 0) + item.horas);
  }

  const statements: D1PreparedStatement[] = preparadas.map(item =>
    c.env.e_schedule_db
      .prepare('INSERT INTO asignaciones (id, docente_id, sede_id, materia_id, dia_semana, hora_inicio, hora_fin, modo, periodo, grupo, calendario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(item.id, item.docente_id, item.sede_id, item.materia_id, item.dia_semana, item.hora_inicio, item.hora_fin, item.modo, item.periodo, item.grupo, item.calendario)
  );
  for (const [docenteId, horas] of horasPorDocente.entries()) {
    statements.push(
      c.env.e_schedule_db
        .prepare('UPDATE docentes SET horas_asignadas = horas_asignadas + ? WHERE id = ?')
        .bind(horas, docenteId)
    );
  }

  await c.env.e_schedule_db.batch(statements);
  return c.json({ success: true, creadas: preparadas.length });
});

asignaciones.post('/auto-bulk', async (c) => {
  const body = await c.req.json();
  const { periodo, programa_id } = body;
  if (!periodo) return c.json({ error: 'periodo es requerido' }, 400);

  // Obtener periodo para saber calendario_inicio
  const periodoObj = await c.env.e_schedule_db
    .prepare('SELECT * FROM periodos WHERE id = ?')
    .bind(periodo)
    .first() as any;
  const calendarioInicio: 'A' | 'B' = periodoObj?.calendario_inicio ?? 'A';

  const [docentesResult, materiasResult, sedesResult, programasResult, celulasResult, disponibilidadResult, sedeProgramaResult, clasesResult] = await Promise.all([
    c.env.e_schedule_db.prepare('SELECT * FROM docentes ORDER BY nombre').all(),
    c.env.e_schedule_db.prepare(`
      SELECT m.*, p.es_prioritario, p.orden_prioridad, p.nombre as programa_nombre, p.tipo_ciclo
      FROM materias m
      LEFT JOIN programas p ON m.programa_id = p.id
      ORDER BY p.es_prioritario DESC, p.orden_prioridad ASC, m.nombre ASC
    `).all(),
    c.env.e_schedule_db.prepare('SELECT * FROM sedes').all(),
    programa_id
      ? c.env.e_schedule_db.prepare('SELECT * FROM programas WHERE id = ? ORDER BY es_prioritario DESC, orden_prioridad ASC').bind(programa_id).all()
      : c.env.e_schedule_db.prepare('SELECT * FROM programas ORDER BY es_prioritario DESC, orden_prioridad ASC').all(),
    c.env.e_schedule_db.prepare('SELECT * FROM celulas').all(),
    c.env.e_schedule_db.prepare('SELECT * FROM disponibilidad').all(),
    c.env.e_schedule_db.prepare('SELECT * FROM sede_programa').all(),
    programa_id
      ? c.env.e_schedule_db.prepare('SELECT * FROM clases WHERE periodo = ? AND programa_id = ? AND estado != ? ORDER BY dia_semana, hora_inicio').bind(periodo, programa_id, 'cancelada').all()
      : c.env.e_schedule_db.prepare('SELECT * FROM clases WHERE periodo = ? AND estado != ? ORDER BY dia_semana, hora_inicio').bind(periodo, 'cancelada').all(),
  ]);

  type MateriaExt = Materia & { es_prioritario: number; orden_prioridad: number; programa_nombre: string | null; tipo_ciclo: 'semanal' | 'quincenal' };

  const docentes = docentesResult.results as unknown as Docente[];
  const materias = materiasResult.results as unknown as MateriaExt[];
  const todasSedes = sedesResult.results as unknown as Sede[];
  const todosProgramas = programasResult.results as unknown as Programa[];
  const todasCelulas = celulasResult.results as unknown as { id: string; nombre: string; municipio: string }[];
  const todasDisponibilidades = disponibilidadResult.results as unknown as Disponibilidad[];
  const clasesParametrizadas = clasesResult.results as unknown as ClaseAcademica[];
  // Mapa programa_id -> Set<sede_id> con las sedes que ofertan cada programa
  const sedesPorPrograma = new Map<string, Set<string>>();
  for (const sp of sedeProgramaResult.results as unknown as { sede_id: string; programa_id: string }[]) {
    if (!sedesPorPrograma.has(sp.programa_id)) sedesPorPrograma.set(sp.programa_id, new Set());
    sedesPorPrograma.get(sp.programa_id)!.add(sp.sede_id);
  }

  const asignacionesPeriodo = await c.env.e_schedule_db
    .prepare('SELECT * FROM asignaciones WHERE periodo = ?')
    .bind(periodo)
    .all();
  const asignacionesExistentes = asignacionesPeriodo.results as unknown as Asignacion[];

  // Mapa de disponibilidad por docente
  const dispPorDocente = new Map<string, Disponibilidad[]>();
  for (const d of todasDisponibilidades) {
    if (!dispPorDocente.has(d.docente_id)) dispPorDocente.set(d.docente_id, []);
    dispPorDocente.get(d.docente_id)!.push(d);
  }

  type DraftEntry = {
    docente_id: string;
    docente_nombre: string;
    celula_docente_id: string | null;
    celula_docente_nombre: string | null;
    celula_sede_id: string | null;
    celula_sede_nombre: string | null;
    es_foraneo: boolean;
    materia_id: string;
    materia_nombre: string;
    semestre: number | null;
    programa_id: string | null;
    programa_nombre: string | null;
    es_prioritario: boolean;
    sede_id: string;
    sede_nombre: string;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    grupo: number;
    calendario: 'A' | 'B' | 'semanal';
    distancia_km: number;
    score: number;
    advertencias: string[];
  };

  const draft: DraftEntry[] = [];
  const asignacionesSimuladas: Asignacion[] = [...asignacionesExistentes];
  const horasSimuladas: Record<string, number> = {};
  docentes.forEach(d => { horasSimuladas[d.id] = d.horas_asignadas; });

  // Centroide de célula: promedio lat/lng de sus sedes
  const centroideCelula = (celulaId: string): { lat: number; lng: number } | null => {
    const sedes = todasSedes.filter(s => s.celula_id === celulaId);
    if (sedes.length === 0) return null;
    const lat = sedes.reduce((a, s) => a + s.latitud, 0) / sedes.length;
    const lng = sedes.reduce((a, s) => a + s.longitud, 0) / sedes.length;
    return { lat, lng };
  };

  const nombreCelula = (celulaId: string | null | undefined) =>
    celulaId ? todasCelulas.find(celula => celula.id === celulaId)?.nombre ?? celulaId : null;

  const advertenciaForaneo = (origenId: string | null | undefined, destinoId: string | null | undefined) => {
    const origen = nombreCelula(origenId) ?? 'sin célula definida';
    const destino = nombreCelula(destinoId) ?? 'sede sin célula definida';
    return `Docente foráneo: viene de ${origen} y cubre ${destino}`;
  };

  const asegurarAdvertenciaForaneo = (entry: DraftEntry) => {
    if (entry.advertencias.some(a => a.startsWith('Docente foráneo:'))) return;
    entry.advertencias.push(advertenciaForaneo(entry.celula_docente_id, entry.celula_sede_id));
  };

  // Intentar asignar un docente a una clase (sede+materia+grupo+horario fijo o libre)
  const intentarAsignar = (
    docente: Docente,
    materia: MateriaExt,
    sedesTarget: Sede[],
    calendarioClase: 'A' | 'B' | 'semanal',
    horarioFijo?: { sede_id: string; dia_semana: string; hora_inicio: string; hora_fin: string; grupo: number }
  ): DraftEntry | null => {
    const disponibilidad = dispPorDocente.get(docente.id) ?? [];
    if (disponibilidad.length === 0) return null;
    if (horasSimuladas[docente.id] >= docente.max_horas) return null;

    const sedeRef = docente.celula_id
      ? todasSedes.find(s => s.celula_id === docente.celula_id && s.tipo === 'celula') ?? null
      : null;

    const docenteSimulado: Docente = { ...docente, horas_asignadas: horasSimuladas[docente.id] };
    const asigDocente = asignacionesSimuladas.filter(a => a.docente_id === docente.id);

    if (horarioFijo) {
      // Docente foráneo: debe encajar en horario exacto de la clase sin cubrir
      const sedeFija = todasSedes.find(s => s.id === horarioFijo.sede_id);
      if (!sedeFija) return null;
      const tieneDisponibilidad = disponibilidad.some(d =>
        d.dia_semana === horarioFijo.dia_semana &&
        d.hora_inicio <= horarioFijo.hora_inicio &&
        d.hora_fin >= horarioFijo.hora_fin
      );
      if (!tieneDisponibilidad) return null;
      const validacion = validarAsignacion({
        docente: docenteSimulado,
        sede: sedeFija,
        dia_semana: horarioFijo.dia_semana,
        hora_inicio: horarioFijo.hora_inicio,
        hora_fin: horarioFijo.hora_fin,
        modoLibre: true,
        grupo: horarioFijo.grupo,
        calendario: calendarioClase,
        asignacionesExistentes: asigDocente,
      });
      if (!validacion.valido) return null;

      const esForaneo = docente.celula_id !== sedeFija.celula_id;
      const distancia = sedeRef
        ? haversineKm(sedeRef.latitud, sedeRef.longitud, sedeFija.latitud, sedeFija.longitud)
        : 0;
      return {
        docente_id: docente.id,
        docente_nombre: docente.nombre,
        celula_docente_id: docente.celula_id,
        celula_docente_nombre: nombreCelula(docente.celula_id),
        celula_sede_id: sedeFija.celula_id,
        celula_sede_nombre: nombreCelula(sedeFija.celula_id),
        es_foraneo: esForaneo,
        materia_id: materia.id,
        materia_nombre: materia.nombre,
        semestre: materia.semestre ?? null,
        programa_id: materia.programa_id ?? null,
        programa_nombre: materia.programa_nombre ?? null,
        es_prioritario: materia.es_prioritario === 1,
        sede_id: sedeFija.id,
        sede_nombre: sedeFija.nombre,
        dia_semana: horarioFijo.dia_semana,
        hora_inicio: horarioFijo.hora_inicio,
        hora_fin: horarioFijo.hora_fin,
        grupo: horarioFijo.grupo,
        calendario: calendarioClase,
        distancia_km: distancia,
        score: -distancia * 2,
        advertencias: esForaneo ? [advertenciaForaneo(docente.celula_id, sedeFija.celula_id)] : [],
      };
    }

    // Docente local: buscar candidatos libres
    const candidatos = generarCandidatos({
      docente: docenteSimulado,
      materia,
      sedes_disponibles: sedesTarget,
      sede_docente_ref: sedeRef,
      disponibilidad,
      asignaciones_existentes: asigDocente,
      periodo,
      tipo_ciclo_programa: materia.tipo_ciclo,
      calendario_inicio_periodo: calendarioInicio,
    });
    if (candidatos.length === 0) return null;

    const mejor = candidatos[0];
    const sedeMejor = todasSedes.find(s => s.id === mejor.sede_id)!;
    const advertencias: string[] = [];
    if (docente.modo_libre === 1) advertencias.push('Docente en Modo Libre');
    if (mejor.distancia_km > 50) advertencias.push(`Distancia alta: ${mejor.distancia_km.toFixed(1)} km`);

    return {
      docente_id: docente.id,
      docente_nombre: docente.nombre,
      celula_docente_id: docente.celula_id,
      celula_docente_nombre: nombreCelula(docente.celula_id),
      celula_sede_id: sedeMejor.celula_id,
      celula_sede_nombre: nombreCelula(sedeMejor.celula_id),
      es_foraneo: false,
      materia_id: materia.id,
      materia_nombre: materia.nombre,
      semestre: materia.semestre ?? null,
      programa_id: materia.programa_id ?? null,
      programa_nombre: materia.programa_nombre ?? null,
      es_prioritario: materia.es_prioritario === 1,
      sede_id: mejor.sede_id,
      sede_nombre: sedeMejor.nombre,
      dia_semana: mejor.dia_semana,
      hora_inicio: mejor.hora_inicio,
      hora_fin: mejor.hora_fin,
      grupo: mejor.grupo,
      calendario: mejor.calendario,
      distancia_km: mejor.distancia_km,
      score: mejor.score,
      advertencias,
    };
  };

  const registrarAsignacion = (entry: DraftEntry, materia: MateriaExt) => {
    draft.push(entry);
    // Simula capacidad con horas nominales; A/B solo afecta conflictos de horario.
    const horas = horasBloque(entry.hora_inicio, entry.hora_fin);
    horasSimuladas[entry.docente_id] += horas;
    asignacionesSimuladas.push({
      id: `draft-${crypto.randomUUID()}`,
      docente_id: entry.docente_id,
      sede_id: entry.sede_id,
      materia_id: materia.id,
      dia_semana: entry.dia_semana as any,
      hora_inicio: entry.hora_inicio,
      hora_fin: entry.hora_fin,
      modo: 'automatico',
      distancia_km: entry.distancia_km,
      periodo,
      programa_id: materia.programa_id ?? null,
      grupo: entry.grupo,
      calendario: entry.calendario,
      created_at: new Date().toISOString(),
    });
  };

  if (clasesParametrizadas.length > 0) {
    type ClaseSinDocente = {
      clase: ClaseAcademica;
      materia: MateriaExt;
      sede: Sede;
    };
    const clasesSinDocente: ClaseSinDocente[] = [];
    let sinCubrir = 0;

    for (const clase of clasesParametrizadas) {
      const claseYaAsignada = asignacionesExistentes.some(a =>
        a.periodo === clase.periodo &&
        a.sede_id === clase.sede_id &&
        a.materia_id === clase.materia_id &&
        a.grupo === clase.grupo &&
        a.calendario === clase.calendario
      );
      if (claseYaAsignada) continue;

      const materia = materias.find(m => m.id === clase.materia_id);
      const sede = todasSedes.find(s => s.id === clase.sede_id);
      if (!materia || !sede) {
        sinCubrir++;
        continue;
      }

      const esClasePilotoDev = clase.id.startsWith('dev-clase-pilot-') || clase.id.startsWith('piloto-web-');
      const docentesElegibles = esClasePilotoDev
        ? docentes.filter(d => d.id.startsWith('dev-doc-pilot-'))
        : docentes.filter(d => !d.id.startsWith('dev-doc-pilot-'));

      const docentesLocales = docentesElegibles
        .filter(d => d.tipo_vinculacion === 'central' || d.celula_id === sede.celula_id)
        .sort((a, b) => (b.max_horas - horasSimuladas[b.id]) - (a.max_horas - horasSimuladas[a.id]));

      const horarioFijo = {
        sede_id: clase.sede_id,
        dia_semana: clase.dia_semana,
        hora_inicio: clase.hora_inicio,
        hora_fin: clase.hora_fin,
        grupo: clase.grupo,
      };

      let cubierta = false;
      for (const docente of docentesLocales) {
        if (horasSimuladas[docente.id] >= docente.max_horas) continue;
        if (docente.departamento_id && materia.departamento_id &&
            docente.departamento_id !== materia.departamento_id) continue;

        const entry = intentarAsignar(docente, materia, [sede], clase.calendario, horarioFijo);
        if (entry) {
          registrarAsignacion(entry, materia);
          cubierta = true;
          break;
        }
      }

      if (!cubierta) {
        clasesSinDocente.push({ clase, materia, sede });
      }
    }

    for (const pendiente of clasesSinDocente) {
      const celulaSedeId = pendiente.sede.celula_id;
      if (!celulaSedeId) {
        sinCubrir++;
        continue;
      }

      const centroSede = centroideCelula(celulaSedeId);
      if (!centroSede) {
        sinCubrir++;
        continue;
      }

      const celulasCercanas = todasCelulas
        .filter(celula => celula.id !== celulaSedeId)
        .map(celula => {
          const centro = centroideCelula(celula.id);
          const dist = centro ? haversineKm(centroSede.lat, centroSede.lng, centro.lat, centro.lng) : Infinity;
          return { celula, dist };
        })
        .sort((a, b) => a.dist - b.dist);

      const horarioFijo = {
        sede_id: pendiente.clase.sede_id,
        dia_semana: pendiente.clase.dia_semana,
        hora_inicio: pendiente.clase.hora_inicio,
        hora_fin: pendiente.clase.hora_fin,
        grupo: pendiente.clase.grupo,
      };

      let cubierta = false;
      for (const { celula } of celulasCercanas) {
        if (cubierta) break;
        const esClasePilotoDev = pendiente.clase.id.startsWith('dev-clase-pilot-') || pendiente.clase.id.startsWith('piloto-web-');
        const docentesElegibles = esClasePilotoDev
          ? docentes.filter(d => d.id.startsWith('dev-doc-pilot-'))
          : docentes.filter(d => !d.id.startsWith('dev-doc-pilot-'));

        const docentesCercanos = docentesElegibles
          .filter(d => {
            if (d.celula_id !== celula.id) return false;
            if (horasSimuladas[d.id] >= d.max_horas) return false;
            if (d.departamento_id && pendiente.materia.departamento_id &&
                d.departamento_id !== pendiente.materia.departamento_id) return false;
            return true;
          })
          .sort((a, b) => (b.max_horas - horasSimuladas[b.id]) - (a.max_horas - horasSimuladas[a.id]));

        for (const docente of docentesCercanos) {
          const entry = intentarAsignar(docente, pendiente.materia, [pendiente.sede], pendiente.clase.calendario, horarioFijo);
          if (entry) {
            entry.es_foraneo = true;
            asegurarAdvertenciaForaneo(entry);
            registrarAsignacion(entry, pendiente.materia);
            cubierta = true;
            break;
          }
        }
      }

      if (!cubierta) sinCubrir++;
    }

    return c.json({
      draft,
      total: draft.length,
      periodo,
      programa_id: programa_id ?? null,
      fuente: 'clases',
      clases_total: clasesParametrizadas.length,
      sin_cubrir: sinCubrir,
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // FASE 1: asignar por programa (prioridad) → docentes de la misma célula
  // ──────────────────────────────────────────────────────────────────
  const programasQuincenales = todosProgramas.filter(p => p.tipo_ciclo === 'quincenal');
  if (programasQuincenales.length > 0) {
    return c.json({
      error: 'Los programas quincenales requieren clases parametrizadas con Semana A o Semana B por grupo antes de generar asignaciones.',
      programas: programasQuincenales.map(p => ({ id: p.id, nombre: p.nombre })),
    }, 400);
  }

  type ClasePendiente = {
    materia: MateriaExt;
    sede: Sede;
    grupo: number;
    calendarioClase: 'A' | 'B' | 'semanal';
    horarioFijo?: { dia_semana: string; hora_inicio: string; hora_fin: string };
  };
  const clasesSinDocente: ClasePendiente[] = [];

  for (const programa of todosProgramas) {
    const materiasProg = materias.filter(m => m.programa_id === programa.id);
    const calendarioClase: 'A' | 'B' | 'semanal' =
      programa.tipo_ciclo === 'semanal' ? 'semanal' : calendarioInicio;

    for (const materia of materiasProg) {
      // Filtrar sedes que ofertan este programa (via sede_programa)
      // Si no hay ninguna sede configurada, se omite la materia
      const sedesDelPrograma = sedesPorPrograma.get(programa.id);
      if (!sedesDelPrograma || sedesDelPrograma.size === 0) continue;

      const sedesOfertantes = todasSedes.filter(s => sedesDelPrograma.has(s.id));

      // Agrupar sedes ofertantes por célula
      const sedesPorCelula = new Map<string | null, Sede[]>();
      for (const sede of sedesOfertantes) {
        const cid = sede.celula_id ?? '__central__';
        if (!sedesPorCelula.has(cid)) sedesPorCelula.set(cid, []);
        sedesPorCelula.get(cid)!.push(sede);
      }

      for (const [celulaId, sedesCelula] of sedesPorCelula) {
        const docentesCelula = docentes.filter(d =>
          d.tipo_vinculacion === 'central' || d.celula_id === (celulaId === '__central__' ? null : celulaId)
        );

        // Ordenar docentes: primero con más horas libres disponibles
        const docentesOrdenados = [...docentesCelula].sort(
          (a, b) => (b.max_horas - horasSimuladas[b.id]) - (a.max_horas - horasSimuladas[a.id])
        );

        let cubierta = false;
        for (const docente of docentesOrdenados) {
          if (horasSimuladas[docente.id] >= docente.max_horas) continue;
          // Filtro por departamento: docente solo imparte materias de su departamento
          if (docente.departamento_id && materia.departamento_id &&
              docente.departamento_id !== materia.departamento_id) continue;
          const yaAsignada = asignacionesSimuladas.some(
            a => a.docente_id === docente.id && a.materia_id === materia.id
          );
          if (yaAsignada) continue;

          const entry = intentarAsignar(docente, materia, sedesCelula, calendarioClase);
          if (entry) {
            registrarAsignacion(entry, materia);
            cubierta = true;
            break;
          }
        }

        if (!cubierta) {
          clasesSinDocente.push({ materia, sede: sedesCelula[0], grupo: 1, calendarioClase });
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // FASE 2: clases sin docente → buscar en células cercanas
  // ──────────────────────────────────────────────────────────────────
  for (const clase of clasesSinDocente) {
    const celulaSedeId = clase.sede.celula_id;
    if (!celulaSedeId) continue;

    const centroSede = centroideCelula(celulaSedeId);
    if (!centroSede) continue;

    // Ordenar otras células por distancia al centroide de la célula con clase sin cubrir
    const celulasCercanas = todasCelulas
      .filter(c => c.id !== celulaSedeId)
      .map(c => {
        const centro = centroideCelula(c.id);
        const dist = centro ? haversineKm(centroSede.lat, centroSede.lng, centro.lat, centro.lng) : Infinity;
        return { celula: c, dist };
      })
      .sort((a, b) => a.dist - b.dist);

    let cubierta = false;
    for (const { celula } of celulasCercanas) {
      if (cubierta) break;
      const docentesCercanos = docentes
        .filter(d => {
          if (d.celula_id !== celula.id) return false;
          if (horasSimuladas[d.id] >= d.max_horas) return false;
          if (d.departamento_id && clase.materia.departamento_id &&
              d.departamento_id !== clase.materia.departamento_id) return false;
          return true;
        })
        .sort((a, b) => (b.max_horas - horasSimuladas[b.id]) - (a.max_horas - horasSimuladas[a.id]));

      for (const docente of docentesCercanos) {
        const entry = intentarAsignar(docente, clase.materia, [clase.sede], clase.calendarioClase);
        if (entry) {
          entry.es_foraneo = true;
          asegurarAdvertenciaForaneo(entry);
          registrarAsignacion(entry, clase.materia);
          cubierta = true;
          break;
        }
      }
    }
  }

  return c.json({ draft, total: draft.length, periodo, programa_id: programa_id ?? null, sin_cubrir: clasesSinDocente.length });
});

asignaciones.delete('/revertir-programa', async (c) => {
  const { programa_id, periodo } = c.req.query();
  if (!programa_id || !periodo) {
    return c.json({ error: 'programa_id y periodo son requeridos' }, 400);
  }

  // Obtener todas las asignaciones automáticas del programa en el periodo
  const result = await c.env.e_schedule_db
    .prepare(`
      SELECT a.* FROM asignaciones a
      JOIN materias m ON a.materia_id = m.id
      WHERE m.programa_id = ? AND a.periodo = ? AND a.modo IN ('automatico', 'foraneo')
    `)
    .bind(programa_id, periodo)
    .all();

  const asigs = result.results as unknown as Asignacion[];
  if (asigs.length === 0) {
    return c.json({ success: true, eliminadas: 0 });
  }

  // Agrupar horas a descontar por docente
  const horasPorDocente = new Map<string, number>();
  for (const a of asigs) {
    // Reversión simétrica: resta las mismas horas nominales que se sumaron.
    const h = horasBloque(a.hora_inicio, a.hora_fin);
    horasPorDocente.set(a.docente_id, (horasPorDocente.get(a.docente_id) ?? 0) + h);
  }

  // Eliminar en batch
  const ids = asigs.map(a => a.id);
  const placeholders = ids.map(() => '?').join(',');
  const stmts: any[] = [
    c.env.e_schedule_db
      .prepare(`DELETE FROM asignaciones WHERE id IN (${placeholders})`)
      .bind(...ids),
  ];
  for (const [docente_id, horas] of horasPorDocente) {
    stmts.push(
      c.env.e_schedule_db
        .prepare('UPDATE docentes SET horas_asignadas = MAX(0, horas_asignadas - ?) WHERE id = ?')
        .bind(horas, docente_id)
    );
  }
  await c.env.e_schedule_db.batch(stmts);

  return c.json({ success: true, eliminadas: asigs.length });
});

asignaciones.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const asignacion = await c.env.e_schedule_db
    .prepare('SELECT * FROM asignaciones WHERE id = ?')
    .bind(id)
    .first() as unknown as Asignacion | null;
  if (!asignacion) return c.json({ error: 'Asignación no encontrada' }, 404);

  // Reversión simétrica: resta las mismas horas nominales que se sumaron.
  const horas = horasBloque(asignacion.hora_inicio, asignacion.hora_fin);
  await c.env.e_schedule_db.batch([
    c.env.e_schedule_db.prepare('DELETE FROM asignaciones WHERE id = ?').bind(id),
    c.env.e_schedule_db
      .prepare('UPDATE docentes SET horas_asignadas = MAX(0, horas_asignadas - ?) WHERE id = ?')
      .bind(horas, asignacion.docente_id),
  ]);
  return c.json({ success: true });
});

export default asignaciones;
