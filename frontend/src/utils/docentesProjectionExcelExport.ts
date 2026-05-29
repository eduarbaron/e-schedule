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

type SheetRow = Array<string | number>;
type WorksheetLike = Record<string, unknown>;
type CellLike = {
  s?: unknown;
  z?: string;
  t?: string;
  v?: unknown;
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

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function docentesSugeridos(horas: number) {
  return horas > 0 ? Math.ceil(horas / HORAS_DOCENTE_EQUIVALENTE) : 0;
}

function docentesEquivalentes(horas: number) {
  return roundTwo(horas / HORAS_DOCENTE_EQUIVALENTE);
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
        'Docentes eq. requeridos': docentesEquivalentes(row.horasPlanificadas),
        'Docentes eq. pendientes': docentesEquivalentes(horasPendientes),
        'Clases planificadas': row.clases,
        'Clases asignadas': row.clasesAsignadas,
        'Horas planificadas': roundOne(row.horasPlanificadas),
        'Horas asignadas': roundOne(row.horasAsignadas),
        'Horas pendientes': roundOne(horasPendientes),
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
      'Docentes eq. requeridos': docentesEquivalentes(row['Horas planificadas']),
      'Docentes eq. pendientes': docentesEquivalentes(horasPendientes),
      'Docentes requeridos redondeado': docentesSugeridos(row['Horas planificadas']),
      'Docentes pendientes redondeado': docentesSugeridos(horasPendientes),
      'Horas pendientes': roundOne(horasPendientes),
      'Horas planificadas': roundOne(row['Horas planificadas']),
      'Horas asignadas': roundOne(row['Horas asignadas']),
      'Clases planificadas': row['Clases planificadas'],
      'Clases asignadas': row['Clases asignadas'],
      'Cobertura %': row['Horas planificadas'] > 0 ? Math.round((row['Horas asignadas'] / row['Horas planificadas']) * 100) : 0,
      Programa: row.Programa,
      Departamento: row.Departamento,
      Zona: row.Zona,
      Sede: row.Sede,
      Materia: [...row.Materia].sort((a, b) => a.localeCompare(b)).join(', '),
    };
  }).sort((a, b) =>
    Number(b['Docentes eq. pendientes']) - Number(a['Docentes eq. pendientes']) ||
    Number(b['Horas pendientes']) - Number(a['Horas pendientes']) ||
    String(a.Programa).localeCompare(String(b.Programa)) ||
    String(a.Departamento).localeCompare(String(b.Departamento)) ||
    String(a.Zona).localeCompare(String(b.Zona)) ||
    String(a.Sede).localeCompare(String(b.Sede))
  );
}

function sumRows(rows: ReturnType<typeof buildProjectionRows>, key: keyof ReturnType<typeof buildProjectionRows>[number]) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function buildProgramaRows(rows: ReturnType<typeof buildProjectionRows>) {
  const programas = new Map<string, {
    Programa: string;
    Sedes: Set<string>;
    Materias: Set<string>;
    'Clases planificadas': number;
    'Clases asignadas': number;
    'Horas planificadas': number;
    'Horas asignadas': number;
  }>();

  rows.forEach(row => {
    const current = programas.get(String(row.Programa)) ?? {
      Programa: String(row.Programa),
      Sedes: new Set<string>(),
      Materias: new Set<string>(),
      'Clases planificadas': 0,
      'Clases asignadas': 0,
      'Horas planificadas': 0,
      'Horas asignadas': 0,
    };
    current.Sedes.add(String(row.Sede));
    current.Materias.add(String(row.Materia));
    current['Clases planificadas'] += Number(row['Clases planificadas']);
    current['Clases asignadas'] += Number(row['Clases asignadas']);
    current['Horas planificadas'] += Number(row['Horas planificadas']);
    current['Horas asignadas'] += Number(row['Horas asignadas']);
    programas.set(String(row.Programa), current);
  });

  return [...programas.values()].map(row => {
    const horasPendientes = Math.max(0, row['Horas planificadas'] - row['Horas asignadas']);
    return {
      Programa: row.Programa,
      'Docentes requeridos': docentesSugeridos(row['Horas planificadas']),
      'Docentes pendientes': docentesSugeridos(horasPendientes),
      'Docentes eq. pendientes': docentesEquivalentes(horasPendientes),
      'Horas pendientes': roundOne(horasPendientes),
      'Horas planificadas': roundOne(row['Horas planificadas']),
      'Horas asignadas': roundOne(row['Horas asignadas']),
      'Clases': `${row['Clases asignadas']}/${row['Clases planificadas']}`,
      'Cobertura %': row['Horas planificadas'] > 0 ? Math.round((row['Horas asignadas'] / row['Horas planificadas']) * 100) : 0,
      Sedes: row.Sedes.size,
      Materias: row.Materias.size,
    };
  }).sort((a, b) =>
    Number(b['Docentes eq. pendientes']) - Number(a['Docentes eq. pendientes']) ||
    Number(b['Horas pendientes']) - Number(a['Horas pendientes']) ||
    String(a.Programa).localeCompare(String(b.Programa))
  );
}

function buildExecutiveRows(
  detalleRows: ReturnType<typeof buildProjectionRows>,
  resumenRows: ReturnType<typeof buildResumenRows>,
  periodo?: Periodo | null
) {
  const programaRows = buildProgramaRows(detalleRows);
  const horasPlanificadas = sumRows(detalleRows, 'Horas planificadas');
  const horasAsignadas = sumRows(detalleRows, 'Horas asignadas');
  const horasPendientes = Math.max(0, horasPlanificadas - horasAsignadas);
  const clasesPlanificadas = sumRows(detalleRows, 'Clases planificadas');
  const clasesAsignadas = sumRows(detalleRows, 'Clases asignadas');
  const cobertura = horasPlanificadas > 0 ? Math.round((horasAsignadas / horasPlanificadas) * 100) : 0;
  const generatedAt = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const rows: SheetRow[] = [
    ['Proyeccion detallada de docentes'],
    ['Periodo', periodo?.nombre ?? periodo?.id ?? 'Periodo de trabajo', 'Generado', generatedAt],
    [],
    ['Resumen ejecutivo'],
    ['Docentes requeridos', docentesSugeridos(horasPlanificadas), 'Docentes necesarios para cubrir toda la demanda planificada a 19h por docente.'],
    ['Docentes pendientes', docentesSugeridos(horasPendientes), 'Docentes necesarios para cubrir solo las horas aun no asignadas.'],
    ['Docentes equivalentes requeridos', docentesEquivalentes(horasPlanificadas), 'Carga total expresada como docentes completos de 19h.'],
    ['Docentes equivalentes pendientes', docentesEquivalentes(horasPendientes), 'Carga pendiente expresada como docentes completos de 19h.'],
    ['Horas planificadas', roundOne(horasPlanificadas), 'Total de horas de clases activas.'],
    ['Horas pendientes', roundOne(horasPendientes), 'Horas sin docente asignado.'],
    ['Cobertura', `${cobertura}%`, `${clasesAsignadas}/${clasesPlanificadas} clases asignadas.`],
    [],
    ['Proyeccion por programa'],
    ['Programa', 'Docentes requeridos', 'Docentes pendientes', 'Docentes eq. pendientes', 'Horas pendientes', 'Horas planificadas', 'Horas asignadas', 'Clases', 'Cobertura %', 'Sedes', 'Materias'],
    ...programaRows.map(row => [
      row.Programa,
      row['Docentes requeridos'],
      row['Docentes pendientes'],
      row['Docentes eq. pendientes'],
      row['Horas pendientes'],
      row['Horas planificadas'],
      row['Horas asignadas'],
      row.Clases,
      row['Cobertura %'],
      row.Sedes,
      row.Materias,
    ]),
    [],
    ['Detalle priorizado por sede'],
    ['Programa', 'Departamento', 'Zona', 'Sede', 'Docentes pendientes', 'Docentes eq. pendientes', 'Horas pendientes', 'Cobertura %', 'Materias'],
    ...resumenRows.map(row => [
      row.Programa,
      row.Departamento,
      row.Zona,
      row.Sede,
      row['Docentes pendientes redondeado'],
      row['Docentes eq. pendientes'],
      row['Horas pendientes'],
      row['Cobertura %'],
      row.Materia,
    ]),
  ];

  return {
    rows,
    sedeTableStartRow: 16 + programaRows.length,
    sedeTableEndRow: 17 + programaRows.length + resumenRows.length,
  };
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

function cellRef(rowIndex: number, columnIndex: number) {
  return `${columnName(columnIndex)}${rowIndex + 1}`;
}

function getCell(worksheet: WorksheetLike, rowIndex: number, columnIndex: number) {
  return worksheet[cellRef(rowIndex, columnIndex)] as CellLike | undefined;
}

function styleCell(worksheet: WorksheetLike, rowIndex: number, columnIndex: number, style: unknown) {
  const cell = getCell(worksheet, rowIndex, columnIndex);
  if (cell) cell.s = style;
}

function styleRow(worksheet: WorksheetLike, rowIndex: number, columnCount: number, style: unknown) {
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
    styleCell(worksheet, rowIndex, columnIndex, style);
  }
}

function styleRange(
  worksheet: WorksheetLike,
  startRow: number,
  endRow: number,
  columnCount: number,
  style: unknown
) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    styleRow(worksheet, rowIndex, columnCount, style);
  }
}

const styles = {
  title: {
    font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '264362' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  metaLabel: {
    font: { bold: true, color: { rgb: '5C6670' } },
    fill: { fgColor: { rgb: 'F4F7FB' } },
  },
  section: {
    font: { bold: true, sz: 12, color: { rgb: '264362' } },
    fill: { fgColor: { rgb: 'EAF3E4' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  kpiLabel: {
    font: { bold: true, color: { rgb: '264362' } },
    fill: { fgColor: { rgb: 'F8FBFD' } },
    border: { bottom: { style: 'thin', color: { rgb: 'D7DEE8' } } },
  },
  kpiValue: {
    font: { bold: true, sz: 14, color: { rgb: '1F2933' } },
    fill: { fgColor: { rgb: 'F8FBFD' } },
    alignment: { horizontal: 'center' },
    border: { bottom: { style: 'thin', color: { rgb: 'D7DEE8' } } },
  },
  note: {
    font: { color: { rgb: '6B7280' } },
    fill: { fgColor: { rgb: 'F8FBFD' } },
    alignment: { wrapText: true },
    border: { bottom: { style: 'thin', color: { rgb: 'D7DEE8' } } },
  },
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '264362' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  },
  altRow: {
    fill: { fgColor: { rgb: 'F7FAFC' } },
  },
  textWrap: {
    alignment: { vertical: 'top', wrapText: true },
  },
};

function applyExecutiveSheetStyles(
  worksheet: WorksheetLike,
  programRowsCount: number,
  resumenRowsCount: number,
  sedeTableStartRow: number
) {
  styleRow(worksheet, 0, 11, styles.title);
  styleCell(worksheet, 1, 0, styles.metaLabel);
  styleCell(worksheet, 1, 2, styles.metaLabel);
  styleRow(worksheet, 3, 11, styles.section);
  styleRange(worksheet, 4, 10, 1, styles.kpiLabel);
  styleRange(worksheet, 4, 10, 2, styles.kpiValue);
  for (let rowIndex = 4; rowIndex <= 10; rowIndex++) styleCell(worksheet, rowIndex, 2, styles.note);

  styleRow(worksheet, 12, 11, styles.section);
  styleRow(worksheet, 13, 11, styles.header);
  for (let rowIndex = 14; rowIndex < 14 + programRowsCount; rowIndex++) {
    if ((rowIndex - 14) % 2 === 1) styleRow(worksheet, rowIndex, 11, styles.altRow);
  }

  const sedeSectionRow = sedeTableStartRow - 1;
  const sedeHeaderRow = sedeTableStartRow;
  styleRow(worksheet, sedeSectionRow, 11, styles.section);
  styleRow(worksheet, sedeHeaderRow, 9, styles.header);
  for (let rowIndex = sedeHeaderRow + 1; rowIndex <= sedeHeaderRow + resumenRowsCount; rowIndex++) {
    if ((rowIndex - sedeHeaderRow) % 2 === 0) styleRow(worksheet, rowIndex, 9, styles.altRow);
    styleCell(worksheet, rowIndex, 8, styles.textWrap);
  }

  worksheet['!rows'] = [
    { hpt: 28 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 22 },
    ...Array.from({ length: 7 }, () => ({ hpt: 24 })),
    { hpt: 8 },
    { hpt: 22 },
    { hpt: 30 },
  ];
}

export async function exportDocentesProjectionExcel(input: ProjectionInput) {
  const XLSX = await import('xlsx');
  const detalleRows = buildProjectionRows(input);
  const resumenRows = buildResumenRows(detalleRows);
  const executive = buildExecutiveRows(detalleRows, resumenRows, input.periodo);
  const workbook = XLSX.utils.book_new();

  const necesidadSheet = XLSX.utils.aoa_to_sheet(executive.rows);
  necesidadSheet['!cols'] = [
    { wch: 34 }, { wch: 22 }, { wch: 26 }, { wch: 34 }, { wch: 20 },
    { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 60 }, { wch: 12 }, { wch: 12 },
  ];
  necesidadSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } },
    { s: { r: executive.sedeTableStartRow - 1, c: 0 }, e: { r: executive.sedeTableStartRow - 1, c: 2 } },
  ];
  necesidadSheet['!autofilter'] = {
    ref: `A${executive.sedeTableStartRow + 1}:I${Math.max(executive.sedeTableStartRow + 1, executive.sedeTableEndRow)}`,
  };
  necesidadSheet['!views'] = [{ state: 'frozen', ySplit: 14 }];
  applyExecutiveSheetStyles(necesidadSheet, buildProgramaRows(detalleRows).length, resumenRows.length, executive.sedeTableStartRow);

  const detalleSheet = XLSX.utils.json_to_sheet(detalleRows);
  detalleSheet['!cols'] = [
    { wch: 34 }, { wch: 36 }, { wch: 24 }, { wch: 34 }, { wch: 40 },
    { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 16 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
  ];
  applyUsabilityOptions(detalleSheet, detalleRows.length, 14);
  styleRow(detalleSheet, 0, 14, styles.header);

  XLSX.utils.book_append_sheet(workbook, necesidadSheet, 'Necesidad docentes');
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
