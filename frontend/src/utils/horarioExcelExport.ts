import type { Asignacion, ClaseAcademica, Materia, Programa } from '../types';

const DIA_EXCEL: Record<string, string> = {
  L: 'LUNES',
  M: 'MARTES',
  X: 'MIERCOLES',
  J: 'JUEVES',
  V: 'VIERNES',
  S: 'SABADO',
};

const HEADERS = [
  'UNIDAD_REGIONAL',
  'DEPARTAMENTO_MATERIA',
  'ASIGNATURA',
  'CODIGO_MATERIA',
  'GRUPO',
  'DIA',
  'HORA_INICIO',
  'HORA_FINAL',
  'AULA',
  'DOCUMENTO_DOCENTE',
  'DOCENTE',
  'DEPARTAMENTO',
];

type ExportMode = 'proyeccion' | 'asignaciones';

type ExportInput = {
  clases: ClaseAcademica[];
  asignaciones?: Asignacion[];
  materias: Materia[];
  programa: Programa;
  periodoNombre: string;
  mode: ExportMode;
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toExcelHour(time: string, subtractMinute = false) {
  const minutes = Math.max(0, toMinutes(time) - (subtractMinute ? 1 : 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}${String(rest).padStart(2, '0')}`;
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

function classAssignmentKey(input: ClaseAcademica) {
  return assignmentKey(input);
}

function displayGroup(clase: ClaseAcademica) {
  if (clase.calendario === 'A' || clase.calendario === 'B') {
    return `${clase.grupo}${clase.calendario}`;
  }
  return clase.grupo;
}

export async function exportHorarioProgramaExcel({
  clases,
  asignaciones = [],
  materias,
  programa,
  periodoNombre,
  mode,
}: ExportInput) {
  const XLSX = await import('xlsx');
  const materiasById = new Map(materias.map(materia => [materia.id, materia]));
  const asignacionesByKey = new Map(asignaciones.map(asignacion => [assignmentKey(asignacion), asignacion]));
  const rows = clases
    .slice()
    .sort((a, b) =>
      String(a.sede_nombre ?? '').localeCompare(String(b.sede_nombre ?? '')) ||
      Number(a.semestre ?? 0) - Number(b.semestre ?? 0) ||
      Number(a.grupo ?? 0) - Number(b.grupo ?? 0) ||
      String(a.dia_semana).localeCompare(String(b.dia_semana)) ||
      String(a.hora_inicio).localeCompare(String(b.hora_inicio)) ||
      String(a.materia_nombre ?? '').localeCompare(String(b.materia_nombre ?? ''))
    )
    .map(clase => {
      const materia = materiasById.get(clase.materia_id);
      const asignacion = mode === 'asignaciones' ? asignacionesByKey.get(classAssignmentKey(clase)) : undefined;
      const departamentoMateria = materia?.departamento_nombre ?? '';
      const departamentoPrograma = programa.departamento_nombre ?? '';
      return {
        UNIDAD_REGIONAL: clase.sede_nombre ?? clase.sede_id,
        DEPARTAMENTO_MATERIA: departamentoMateria,
        ASIGNATURA: clase.materia_nombre ?? materia?.nombre ?? clase.materia_id,
        CODIGO_MATERIA: materia?.id ?? clase.materia_id,
        GRUPO: displayGroup(clase),
        DIA: DIA_EXCEL[clase.dia_semana] ?? clase.dia_semana,
        HORA_INICIO: toExcelHour(clase.hora_inicio),
        HORA_FINAL: toExcelHour(clase.hora_fin, true),
        AULA: '',
        DOCUMENTO_DOCENTE: asignacion?.docente_id ?? '',
        DOCENTE: asignacion?.docente_nombre ?? '',
        DEPARTAMENTO: departamentoPrograma,
      };
    });

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  worksheet['!cols'] = [
    { wch: 34 },
    { wch: 46 },
    { wch: 38 },
    { wch: 22 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
    { wch: 36 },
    { wch: 46 },
  ];
  worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: HEADERS.length - 1 } }) };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Horarios');
  workbook.Props = {
    Title: `${mode === 'proyeccion' ? 'Proyeccion' : 'Asignaciones'} - ${programa.nombre}`,
    Subject: periodoNombre,
    Author: 'e-Schedule',
    CreatedDate: new Date(),
  };

  const prefix = mode === 'proyeccion' ? 'proyeccion-horaria' : 'horario-asignado';
  const filename = `${prefix}-${normalizeFilePart(programa.nombre)}-${normalizeFilePart(periodoNombre)}.xlsx`;
  XLSX.writeFile(workbook, filename, { compression: true });
}
