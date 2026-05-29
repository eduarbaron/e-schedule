import type { Asignacion, ClaseAcademica, Materia, Periodo } from '../types';

const HORAS_DOCENTE_EQUIVALENTE = 19;

type ProjectionInput = {
  clases: ClaseAcademica[];
  asignaciones: Asignacion[];
  materias: Materia[];
  periodo?: Periodo | null;
};

type ProjectionGroup = {
  programa: string;
  departamento: string;
  zona: string;
  sede: string;
  materia: string;
  semestre: string | number;
  clases: number;
  clasesAsignadas: number;
  horasPlanificadas: number;
  horasAsignadas: number;
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function horasBloque(inicio: string, fin: string) {
  return Math.max(0, (toMinutes(fin) - toMinutes(inicio)) / 60);
}

function normalizeFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function assignmentKey(input: Pick<Asignacion | ClaseAcademica, 'periodo' | 'sede_id' | 'materia_id' | 'grupo' | 'calendario' | 'dia_semana' | 'hora_inicio' | 'hora_fin'>) {
  return [
    input.periodo,
    input.sede_id,
    input.materia_id,
    input.grupo,
    input.calendario,
    input.dia_semana,
    input.hora_inicio,
    input.hora_fin,
  ].join('|');
}

function groupKey(clase: ClaseAcademica, materia?: Materia) {
  return [
    clase.programa_id,
    materia?.departamento_id ?? clase.departamento_id ?? 'sin-departamento',
    clase.celula_id ?? 'sin-zona',
    clase.sede_id,
    clase.materia_id,
    clase.semestre ?? materia?.semestre ?? 'sin-semestre',
  ].join('|');
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function docentesEquivalentes(horas: number) {
  return horas > 0 ? Math.ceil(horas / HORAS_DOCENTE_EQUIVALENTE) : 0;
}

function buildProjectionRows({ clases, asignaciones, materias }: ProjectionInput) {
  const materiasById = new Map(materias.map(materia => [materia.id, materia]));
  const asignacionesKeys = new Set(asignaciones.map(assignmentKey));
  const groups = new Map<string, ProjectionGroup>();

  clases
    .filter(clase => clase.estado !== 'cancelada')
    .forEach(clase => {
      const materia = materiasById.get(clase.materia_id);
      const key = groupKey(clase, materia);
      const current = groups.get(key) ?? {
        programa: clase.programa_nombre ?? 'Sin programa',
        departamento: clase.departamento_nombre ?? materia?.departamento_nombre ?? 'Sin departamento',
        zona: clase.celula_nombre ?? 'Sin zona',
        sede: clase.sede_nombre ?? clase.sede_id,
        materia: clase.materia_nombre ?? materia?.nombre ?? clase.materia_id,
        semestre: clase.semestre ?? materia?.semestre ?? '',
        clases: 0,
        clasesAsignadas: 0,
        horasPlanificadas: 0,
        horasAsignadas: 0,
      };
      const horas = horasBloque(clase.hora_inicio, clase.hora_fin);
      const asignada = asignacionesKeys.has(assignmentKey(clase));
      current.clases += 1;
      current.horasPlanificadas += horas;
      if (asignada) {
        current.clasesAsignadas += 1;
        current.horasAsignadas += horas;
      }
      groups.set(key, current);
    });

  return [...groups.values()]
    .map(row => {
      const horasPendientes = Math.max(0, row.horasPlanificadas - row.horasAsignadas);
      return {
        Programa: row.programa,
        Departamento: row.departamento,
        Zona: row.zona,
        Sede: row.sede,
        Materia: row.materia,
        Semestre: row.semestre,
        'Clases planificadas': row.clases,
        'Clases asignadas': row.clasesAsignadas,
        'Horas planificadas': roundOne(row.horasPlanificadas),
        'Horas asignadas': roundOne(row.horasAsignadas),
        'Horas pendientes': roundOne(horasPendientes),
        'Docentes requeridos': docentesEquivalentes(row.horasPlanificadas),
        'Docentes pendientes': docentesEquivalentes(horasPendientes),
        'Cobertura %': row.horasPlanificadas > 0 ? Math.round((row.horasAsignadas / row.horasPlanificadas) * 100) : 0,
      };
    })
    .sort((a, b) =>
      String(a.Programa).localeCompare(String(b.Programa)) ||
      String(a.Departamento).localeCompare(String(b.Departamento)) ||
      String(a.Zona).localeCompare(String(b.Zona)) ||
      String(a.Sede).localeCompare(String(b.Sede)) ||
      String(a.Materia).localeCompare(String(b.Materia))
    );
}

function buildResumenRows(rows: ReturnType<typeof buildProjectionRows>) {
  const resumen = new Map<string, {
    Programa: string;
    Departamento: string;
    Zona: string;
    Sede: string;
    Materia: Set<string>;
    'Clases planificadas': number;
    'Clases asignadas': number;
    'Horas planificadas': number;
    'Horas asignadas': number;
  }>();

  rows.forEach(row => {
    const key = [row.Programa, row.Departamento, row.Zona, row.Sede].join('|');
    const current = resumen.get(key) ?? {
      Programa: row.Programa,
      Departamento: row.Departamento,
      Zona: row.Zona,
      Sede: row.Sede,
      Materia: new Set<string>(),
      'Clases planificadas': 0,
      'Clases asignadas': 0,
      'Horas planificadas': 0,
      'Horas asignadas': 0,
    };
    current.Materia.add(String(row.Materia));
    current['Clases planificadas'] += Number(row['Clases planificadas']);
    current['Clases asignadas'] += Number(row['Clases asignadas']);
    current['Horas planificadas'] += Number(row['Horas planificadas']);
    current['Horas asignadas'] += Number(row['Horas asignadas']);
    resumen.set(key, current);
  });

  return [...resumen.values()].map(row => {
    const horasPendientes = Math.max(0, row['Horas planificadas'] - row['Horas asignadas']);
    return {
      ...row,
      Materia: [...row.Materia].sort((a, b) => a.localeCompare(b)).join(', '),
      'Horas planificadas': roundOne(row['Horas planificadas']),
      'Horas asignadas': roundOne(row['Horas asignadas']),
      'Horas pendientes': roundOne(horasPendientes),
      'Docentes requeridos': docentesEquivalentes(row['Horas planificadas']),
      'Docentes pendientes': docentesEquivalentes(horasPendientes),
      'Cobertura %': row['Horas planificadas'] > 0 ? Math.round((row['Horas asignadas'] / row['Horas planificadas']) * 100) : 0,
    };
  });
}

function applyUsabilityOptions(
  worksheet: Record<string, unknown>,
  rowCount: number,
  columnCount: number
) {
  if (columnCount === 0) return;
  worksheet['!autofilter'] = {
    ref: `A1:${columnName(columnCount - 1)}${Math.max(1, rowCount + 1)}`,
  };
  worksheet['!views'] = [{ state: 'frozen', ySplit: 1 }];
}

function columnName(index: number) {
  let value = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

export async function exportDocentesProjectionExcel(input: ProjectionInput) {
  const XLSX = await import('xlsx');
  const detalleRows = buildProjectionRows(input);
  const resumenRows = buildResumenRows(detalleRows);
  const workbook = XLSX.utils.book_new();

  const resumenSheet = XLSX.utils.json_to_sheet(resumenRows);
  resumenSheet['!cols'] = [
    { wch: 34 }, { wch: 36 }, { wch: 24 }, { wch: 34 }, { wch: 40 },
    { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
    { wch: 18 }, { wch: 18 }, { wch: 12 },
  ];
  applyUsabilityOptions(resumenSheet, resumenRows.length, 13);

  const detalleSheet = XLSX.utils.json_to_sheet(detalleRows);
  detalleSheet['!cols'] = [
    { wch: 34 }, { wch: 36 }, { wch: 24 }, { wch: 34 }, { wch: 40 },
    { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
  ];
  applyUsabilityOptions(detalleSheet, detalleRows.length, 14);

  XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');
  XLSX.utils.book_append_sheet(workbook, detalleSheet, 'Detalle materias');
  workbook.Props = {
    Title: 'Proyeccion detallada de docentes',
    Subject: input.periodo?.nombre ?? input.periodo?.id ?? 'Periodo de trabajo',
    Author: 'e-Schedule',
    CreatedDate: new Date(),
  };

  const periodoNombre = input.periodo?.nombre ?? input.periodo?.id ?? 'periodo';
  XLSX.writeFile(workbook, `proyeccion-docentes-detallada-${normalizeFilePart(periodoNombre)}.xlsx`, { compression: true });
  return { detalle: detalleRows.length, resumen: resumenRows.length };
}
