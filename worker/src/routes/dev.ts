import { Hono } from 'hono';
import type { Bindings, Materia, Sede } from '../types';

const dev = new Hono<{ Bindings: Bindings }>();

const PILOT_PREFIX = 'dev-pilot';
const DEV_DOC_PREFIX = 'dev-doc-pilot';
const DEV_DISP_PREFIX = 'dev-disp-pilot';
const PILOT_CLASS_PREFIX = 'piloto-web';
const DEV_ASIG_PREFIX = 'dev-asig-pilot';
const PILOT_PROGRAMA_ID = 'prog-web';
const PILOT_DOCENTE_COUNT = 61;
const PILOT_GROUPS_PER_SEMESTER = 2;
const PILOT_DOCENTES_POR_DEPARTAMENTO: Record<string, number> = {
  'dep-ing-sis': 23,
  'dep-bas-mat': 12,
  'dep-edu-esp': 8,
  'dep-edu-ing': 10,
  'dep-edu-lic': 8,
};

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S'] as const;
const SABADO = 'S';
const JORNADA_SABADO = [
  { inicio: 7, fin: 13 },
  { inicio: 14, fin: 17 },
] as const;
const APELLIDOS = ['Ramos', 'Montes', 'Pardo', 'Salcedo', 'Barrios', 'Mendoza', 'Hoyos', 'Arrieta'];
const PILOT_REQUIRED_TABLES = [
  'periodos',
  'programas',
  'materias',
  'sedes',
  'sede_programa',
  'docentes',
  'disponibilidad',
  'asignaciones',
  'clases',
];

const especialSemestres: Record<string, number[]> = {
  'sede-cie-maf': [1, 3],
  'sede-san-sta': [1, 3],
  'sede-chi-las': [1, 3],
  'sede-val-vil': [1, 2],
};

function horaTexto(hora: number) {
  return `${String(hora).padStart(2, '0')}:00`;
}

function crearCursorSabado() {
  return { bloque: 0, hora: JORNADA_SABADO[0].inicio };
}

function rotarLista<T>(items: T[], offset: number) {
  if (items.length === 0) return items;
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function ordenarMateriasPiloto(materias: Materia[], offset: number) {
  const ordenadas = [...materias].sort((a, b) => b.horas_semana - a.horas_semana || a.nombre.localeCompare(b.nombre));
  const largas = ordenadas.filter(m => m.horas_semana >= 4);
  const flexibles = ordenadas.filter(m => m.horas_semana < 4);
  if (largas.length === 0) return rotarLista(ordenadas, offset);
  return [
    ...rotarLista(largas, offset),
    ...rotarLista(flexibles, offset),
  ];
}

function siguienteHorarioSabado(cursor: { bloque: number; hora: number }, horas: number) {
  let bloque = JORNADA_SABADO[cursor.bloque];
  if (cursor.hora + horas > bloque.fin) {
    cursor.bloque++;
    bloque = JORNADA_SABADO[cursor.bloque];
    if (!bloque) return null;
    cursor.hora = bloque.inicio;
  }
  if (cursor.hora + horas > bloque.fin) return null;
  const inicio = cursor.hora;
  cursor.hora += horas;
  return { hora_inicio: horaTexto(inicio), hora_fin: horaTexto(inicio + horas) };
}

function horarioPlantillaSabado(slot: number, horas: number) {
  const slots = [
    { calendario: 'A' as const, inicio: 7 },
    { calendario: 'A' as const, inicio: 10 },
    { calendario: 'A' as const, inicio: 14 },
    { calendario: 'B' as const, inicio: 7 },
    { calendario: 'B' as const, inicio: 10 },
    { calendario: 'B' as const, inicio: 14 },
  ];
  const elegido = slots[slot % slots.length];
  if (elegido.inicio + horas > 17 || (elegido.inicio < 13 && elegido.inicio + horas > 13)) {
    return null;
  }
  return {
    calendario: elegido.calendario,
    hora_inicio: horaTexto(elegido.inicio),
    hora_fin: horaTexto(elegido.inicio + horas),
  };
}

function escogerCalendario(
  usadas: Record<'A' | 'B', number>,
  horas: number,
  preferida: 'A' | 'B' = 'A'
): 'A' | 'B' | null {
  const secundaria: 'A' | 'B' = preferida === 'A' ? 'B' : 'A';
  const opciones: ('A' | 'B')[] = usadas.A === usadas.B
    ? [preferida, secundaria]
    : usadas.A < usadas.B ? ['A', 'B'] : ['B', 'A'];
  return opciones.find(calendario => usadas[calendario] + horas <= 9) ?? null;
}

async function getExistingTables(db: D1Database) {
  const result = await db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
  `).all<{ name: string }>();
  return new Set(result.results.map(t => t.name));
}

async function getMissingPilotTables(db: D1Database) {
  const existingTables = await getExistingTables(db);
  return PILOT_REQUIRED_TABLES.filter(table => !existingTables.has(table));
}

async function countIfTableExists(
  db: D1Database,
  existingTables: Set<string>,
  table: string,
  sql: string,
  ...bindings: string[]
) {
  if (!existingTables.has(table)) return 0;
  const result = await db.prepare(sql).bind(...bindings).first<{ total: number }>();
  return result?.total ?? 0;
}

async function clearPilotData(db: D1Database) {
  await clearPilotClasses(db);
  await clearPilotTeachers(db);
}

async function clearPilotAssignments(db: D1Database) {
  const existingTables = await getExistingTables(db);
  const statements: D1PreparedStatement[] = [];
  if (existingTables.has('asignaciones')) {
    statements.push(
      db.prepare(`
        DELETE FROM asignaciones
        WHERE id LIKE ?
          OR docente_id LIKE ?
          OR materia_id IN (SELECT id FROM materias WHERE programa_id = ?)
      `).bind(`${DEV_ASIG_PREFIX}-%`, `${DEV_DOC_PREFIX}-%`, PILOT_PROGRAMA_ID)
    );
  }
  if (existingTables.has('docentes')) {
    statements.push(db.prepare(`UPDATE docentes SET horas_asignadas = 0 WHERE id LIKE ?`).bind(`${DEV_DOC_PREFIX}-%`));
  }
  if (statements.length > 0) await db.batch(statements);
}

async function clearPilotClasses(db: D1Database) {
  const existingTables = await getExistingTables(db);
  const statements: D1PreparedStatement[] = [];
  if (existingTables.has('asignaciones')) {
    statements.push(
      db.prepare(`
        DELETE FROM asignaciones
        WHERE materia_id IN (SELECT id FROM materias WHERE programa_id = ?)
      `).bind(PILOT_PROGRAMA_ID)
    );
  }
  if (existingTables.has('clases')) {
    statements.push(db.prepare(`DELETE FROM clases WHERE programa_id = ?`).bind(PILOT_PROGRAMA_ID));
  }
  if (statements.length > 0) await db.batch(statements);
}

async function clearPilotTeachers(db: D1Database) {
  const existingTables = await getExistingTables(db);
  const statements: D1PreparedStatement[] = [];
  if (existingTables.has('asignaciones')) {
    statements.push(db.prepare(`DELETE FROM asignaciones WHERE id LIKE ? OR docente_id LIKE ?`).bind(`${DEV_ASIG_PREFIX}-%`, `${DEV_DOC_PREFIX}-%`));
  }
  if (existingTables.has('disponibilidad')) {
    statements.push(db.prepare(`DELETE FROM disponibilidad WHERE id LIKE ? OR docente_id LIKE ?`).bind(`${DEV_DISP_PREFIX}-%`, `${DEV_DOC_PREFIX}-%`));
  }
  if (existingTables.has('docentes')) {
    statements.push(db.prepare(`DELETE FROM docentes WHERE id LIKE ?`).bind(`${DEV_DOC_PREFIX}-%`));
  }
  if (statements.length > 0) await db.batch(statements);
}

async function getPilotContext(db: D1Database) {
  const missingTables = await getMissingPilotTables(db);
  if (missingTables.length > 0) {
    return { error: 'Faltan tablas en la base de datos para poblar el piloto. Aplica las migraciones pendientes antes de generar datos dev.', missing_tables: missingTables };
  }

  const periodo = await db.prepare('SELECT id FROM periodos WHERE activo = 1 ORDER BY created_at DESC LIMIT 1').first<{ id: string }>();
  if (!periodo) return { error: 'No hay periodo activo para poblar el piloto' };

  const programa = await db.prepare('SELECT id, tipo_ciclo FROM programas WHERE id = ?').bind(PILOT_PROGRAMA_ID).first<{ id: string; tipo_ciclo: 'semanal' | 'quincenal' }>();
  if (!programa) return { error: 'No existe el programa piloto prog-web' };

  const materiasResult = await db
    .prepare('SELECT * FROM materias WHERE programa_id = ? AND semestre IS NOT NULL ORDER BY semestre, nombre')
    .bind(PILOT_PROGRAMA_ID)
    .all();
  const materias = materiasResult.results as unknown as Materia[];
  if (materias.length === 0) return { error: 'El programa piloto no tiene materias por semestre' };

  const sedesResult = await db
    .prepare(`
      SELECT s.*
      FROM sede_programa sp
      JOIN sedes s ON sp.sede_id = s.id
      WHERE sp.programa_id = ?
      ORDER BY s.nombre
    `)
    .bind(PILOT_PROGRAMA_ID)
    .all();
  const sedes = sedesResult.results as unknown as Sede[];
  if (sedes.length === 0) {
    return { error: 'Configura primero las sedes donde se oferta el programa piloto' };
  }

  return { periodo, programa, materias, sedes };
}

async function populatePilotTeachers(db: D1Database, materias: Materia[], sedes: Sede[]) {
  await clearPilotTeachers(db);

  const celulas = [...new Set(sedes.map(s => s.celula_id).filter(Boolean))] as string[];
  const statements: D1PreparedStatement[] = [];
  const docentesPlan: { celulaId: string; departamentoId: string | null; etiqueta: string }[] = [];

  const etiquetasPorDepartamento: Record<string, string> = {
    'dep-ing-sis': 'Tecnologica',
    'dep-bas-mat': 'Matematica',
    'dep-edu-esp': 'Comunicativa',
    'dep-edu-ing': 'Ingles',
    'dep-edu-lic': 'Aprendizaje',
  };

  for (const [departamentoId, cantidad] of Object.entries(PILOT_DOCENTES_POR_DEPARTAMENTO)) {
    for (let n = 0; n < cantidad; n++) {
      docentesPlan.push({
        celulaId: celulas[n % Math.max(1, celulas.length)],
        departamentoId,
        etiqueta: etiquetasPorDepartamento[departamentoId] ?? 'Piloto',
      });
    }
  }

  const docentes = docentesPlan.slice(0, PILOT_DOCENTE_COUNT);
  docentes.forEach((docente, idx) => {
    const id = `${DEV_DOC_PREFIX}-${String(idx + 1).padStart(2, '0')}`;
    const nombre = `Docente Piloto ${APELLIDOS[idx % APELLIDOS.length]} ${docente.etiqueta} ${idx + 1}`;
    statements.push(
      db.prepare(`
        INSERT INTO docentes (id, nombre, email, tipo_vinculacion, celula_id, departamento_id, horas_asignadas, max_horas, modo_libre)
        VALUES (?, ?, ?, 'celula', ?, ?, 0, 19, 0)
      `).bind(id, nombre, `${id}@dev.local`, docente.celulaId, docente.departamentoId)
    );
    statements.push(
      db.prepare('INSERT INTO disponibilidad (id, docente_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)')
        .bind(`${DEV_DISP_PREFIX}-${String(idx + 1).padStart(2, '0')}-S`, id, SABADO, '07:00', '17:00')
    );
  });

  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50));
  }
  return docentes.length;
}

async function populatePilotClasses(
  db: D1Database,
  periodo: { id: string },
  programa: { id: string; tipo_ciclo: 'semanal' | 'quincenal' },
  materias: Materia[],
  sedes: Sede[]
) {
  await clearPilotClasses(db);
  const statements: D1PreparedStatement[] = [];
  let clasesCreadas = 0;

  for (const [sedeIndex, sede] of sedes.entries()) {
    const semestres = especialSemestres[sede.id] ?? [1];
    for (const semestre of semestres) {
      const materiasSemestre = materias
        .filter(m => m.semestre === semestre)
        .sort((a, b) => b.horas_semana - a.horas_semana || a.nombre.localeCompare(b.nombre));
      for (let grupo = 1; grupo <= PILOT_GROUPS_PER_SEMESTER; grupo++) {
        const offset = sedeIndex + semestre + grupo - 2;
        const calendarioPreferido = offset % 2 === 0 ? 'A' : 'B';
        const materiasGrupo = ordenarMateriasPiloto(materiasSemestre, offset);
        const admitePlantilla = programa.tipo_ciclo === 'quincenal' && materiasGrupo.every(m => m.horas_semana <= 3);
        const horasUsadas: Record<'A' | 'B', number> = { A: 0, B: 0 };
        const cursores = {
          A: crearCursorSabado(),
          B: crearCursorSabado(),
          semanal: crearCursorSabado(),
        };
        materiasGrupo.forEach((materia, materiaIndex) => {
          if (admitePlantilla) {
            const horario = horarioPlantillaSabado(materiaIndex, materia.horas_semana);
            if (!horario) {
              throw new Error(`No hay horario sabatino disponible para ${materia.nombre} en ${sede.nombre}, semestre ${semestre}, grupo ${grupo}`);
            }
            const id = `${PILOT_CLASS_PREFIX}-${periodo.id}-${sede.id}-sem${semestre}-g${grupo}-${materia.id}`;
            statements.push(
              db.prepare(`
                INSERT INTO clases (id, periodo, programa_id, materia_id, sede_id, grupo, calendario, dia_semana, hora_inicio, hora_fin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(id, periodo.id, PILOT_PROGRAMA_ID, materia.id, sede.id, grupo, horario.calendario, SABADO, horario.hora_inicio, horario.hora_fin)
            );
            clasesCreadas++;
            return;
          }

          const calendario = programa.tipo_ciclo === 'semanal'
            ? 'semanal'
            : escogerCalendario(horasUsadas, materia.horas_semana, calendarioPreferido);
          if (!calendario) {
            throw new Error(`No hay cupo sabatino para ${materia.nombre} en ${sede.nombre}, semestre ${semestre}, grupo ${grupo}`);
          }
          if (calendario !== 'semanal') horasUsadas[calendario] += materia.horas_semana;
          const horario = siguienteHorarioSabado(cursores[calendario], materia.horas_semana);
          if (!horario) {
            throw new Error(`No hay horario sabatino disponible para ${materia.nombre} en ${sede.nombre}, semestre ${semestre}, grupo ${grupo}, semana ${calendario}`);
          }
          const id = `${PILOT_CLASS_PREFIX}-${periodo.id}-${sede.id}-sem${semestre}-g${grupo}-${materia.id}`;
          statements.push(
            db.prepare(`
              INSERT INTO clases (id, periodo, programa_id, materia_id, sede_id, grupo, calendario, dia_semana, hora_inicio, hora_fin)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, periodo.id, PILOT_PROGRAMA_ID, materia.id, sede.id, grupo, calendario, SABADO, horario.hora_inicio, horario.hora_fin)
          );
          clasesCreadas++;
        });
      }
    }
  }

  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50));
  }
  return clasesCreadas;
}

dev.post('/piloto/poblar', async (c) => {
  const db = c.env.e_schedule_db;
  const context = await getPilotContext(db);
  if ('error' in context) return c.json(context, 400);
  await clearPilotData(db);
  try {
    const docentesCreados = await populatePilotTeachers(db, context.materias, context.sedes);
    const clasesCreadas = await populatePilotClasses(db, context.periodo, context.programa, context.materias, context.sedes);
    return c.json({
      success: true,
      periodo: context.periodo.id,
      programa_id: PILOT_PROGRAMA_ID,
      docentes_creados: docentesCreados,
      clases_creadas: clasesCreadas,
      sedes_piloto: context.sedes.length,
    });
  } catch (e: any) {
    return c.json({ error: e.message || 'No fue posible poblar el piloto' }, 400);
  }
});

dev.post('/piloto/docentes', async (c) => {
  const db = c.env.e_schedule_db;
  const context = await getPilotContext(db);
  if ('error' in context) return c.json(context, 400);
  const docentesCreados = await populatePilotTeachers(db, context.materias, context.sedes);
  return c.json({ success: true, docentes_creados: docentesCreados });
});

dev.post('/piloto/clases', async (c) => {
  const db = c.env.e_schedule_db;
  const context = await getPilotContext(db);
  if ('error' in context) return c.json(context, 400);
  try {
    const clasesCreadas = await populatePilotClasses(db, context.periodo, context.programa, context.materias, context.sedes);
    return c.json({ success: true, periodo: context.periodo.id, clases_creadas: clasesCreadas, sedes_piloto: context.sedes.length });
  } catch (e: any) {
    return c.json({ error: e.message || 'No fue posible acomodar las clases del piloto en la jornada sabatina' }, 400);
  }
});

dev.delete('/piloto/poblado', async (c) => {
  await clearPilotData(c.env.e_schedule_db);
  return c.json({ success: true });
});

dev.delete('/piloto/docentes', async (c) => {
  await clearPilotTeachers(c.env.e_schedule_db);
  return c.json({ success: true });
});

dev.delete('/piloto/clases', async (c) => {
  await clearPilotClasses(c.env.e_schedule_db);
  return c.json({ success: true });
});

dev.delete('/piloto/asignaciones', async (c) => {
  const db = c.env.e_schedule_db;
  const existingTables = await getExistingTables(db);
  if (!existingTables.has('asignaciones')) {
    return c.json({ success: true, eliminadas: 0, missing_tables: ['asignaciones'] });
  }

  const asignaciones = await db
    .prepare(`SELECT * FROM asignaciones WHERE id LIKE ? OR docente_id LIKE ?`)
    .bind(`${DEV_ASIG_PREFIX}-%`, `${DEV_DOC_PREFIX}-%`)
    .all();
  const docenteIds = [...new Set((asignaciones.results as any[]).map(a => a.docente_id as string))];
  const statements: D1PreparedStatement[] = [
    db.prepare(`DELETE FROM asignaciones WHERE id LIKE ? OR docente_id LIKE ?`).bind(`${DEV_ASIG_PREFIX}-%`, `${DEV_DOC_PREFIX}-%`),
  ];
  if (existingTables.has('docentes')) {
    statements.push(...docenteIds.map(id => db.prepare('UPDATE docentes SET horas_asignadas = 0 WHERE id = ?').bind(id)));
  }
  await db.batch(statements);
  return c.json({ success: true, eliminadas: asignaciones.results.length });
});

dev.get('/piloto/estado', async (c) => {
  const db = c.env.e_schedule_db;
  const existingTables = await getExistingTables(db);
  const missingTables = PILOT_REQUIRED_TABLES.filter(table => !existingTables.has(table));
  const [docentes, clases, asignaciones] = await Promise.all([
    countIfTableExists(db, existingTables, 'docentes', `SELECT COUNT(*) as total FROM docentes WHERE id LIKE ?`, `${DEV_DOC_PREFIX}-%`),
    countIfTableExists(db, existingTables, 'clases', `SELECT COUNT(*) as total FROM clases WHERE programa_id = ?`, PILOT_PROGRAMA_ID),
    countIfTableExists(db, existingTables, 'asignaciones', `SELECT COUNT(*) as total FROM asignaciones WHERE id LIKE ? OR docente_id LIKE ?`, `${DEV_ASIG_PREFIX}-%`, `${DEV_DOC_PREFIX}-%`),
  ]);
  return c.json({
    docentes,
    clases,
    asignaciones,
    schema_ok: missingTables.length === 0,
    missing_tables: missingTables,
  });
});

export default dev;
