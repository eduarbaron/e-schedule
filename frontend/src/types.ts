export interface Facultad {
  id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
}

export interface Departamento {
  id: string;
  nombre: string;
  facultad_id: string;
  facultad_nombre?: string;
  descripcion: string | null;
  created_at: string;
}

export interface Celula {
  id: string;
  nombre: string;
  municipio: string;
  created_at: string;
}

export interface Sede {
  id: string;
  nombre: string;
  tipo: 'central' | 'celula' | 'municipal' | 'rural';
  celula_id: string | null;
  celula_nombre?: string;
  latitud: number;
  longitud: number;
  direccion: string | null;
  created_at: string;
}

export interface Docente {
  id: string;
  nombre: string;
  email: string;
  tipo_vinculacion: 'central' | 'celula';
  celula_id: string | null;
  celula_nombre?: string;
  departamento_id: string | null;
  departamento_nombre?: string | null;
  facultad_nombre?: string | null;
  horas_asignadas: number;
  max_horas: number;
  modo_libre: number;
  created_at: string;
}

export interface Programa {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_prioritario: number;
  orden_prioridad: number;
  tipo_ciclo: 'semanal' | 'quincenal';
  numero_semestres: number;
  departamento_id: string | null;
  departamento_nombre?: string | null;
  facultad_nombre?: string | null;
  created_at: string;
}

export interface Periodo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  calendario_inicio: 'A' | 'B';
  activo: number;
  created_at: string;
}

export interface Materia {
  id: string;
  nombre: string;
  horas_semana: number;
  semestre: number | null;
  programa_id: string | null;
  programa_nombre?: string | null;
  departamento_id: string | null;
  departamento_nombre?: string | null;
  facultad_id?: string | null;
  facultad_nombre?: string | null;
  created_at: string;
}

export interface Disponibilidad {
  id: string;
  docente_id: string;
  dia_semana: 'L' | 'M' | 'X' | 'J' | 'V' | 'S';
  hora_inicio: string;
  hora_fin: string;
  created_at: string;
}

export interface Asignacion {
  id: string;
  docente_id: string;
  docente_nombre?: string;
  sede_id: string;
  sede_nombre?: string;
  materia_id: string;
  materia_nombre?: string;
  programa_id?: string | null;
  programa_nombre?: string | null;
  semestre?: number | null;
  celula_nombre?: string;
  docente_celula_id?: string | null;
  docente_celula_nombre?: string | null;
  sede_celula_id?: string | null;
  sede_celula_nombre?: string | null;
  dia_semana: 'L' | 'M' | 'X' | 'J' | 'V' | 'S';
  hora_inicio: string;
  hora_fin: string;
  modo: 'automatico' | 'libre' | 'foraneo';
  distancia_km: number | null;
  periodo: string;
  grupo: number;
  calendario: 'A' | 'B' | 'semanal';
  latitud?: number;
  longitud?: number;
  created_at: string;
}

export interface ClaseAcademica {
  id: string;
  periodo: string;
  programa_id: string;
  programa_nombre?: string | null;
  materia_id: string;
  materia_nombre?: string | null;
  horas_semana?: number;
  semestre?: number | null;
  departamento_id?: string | null;
  sede_id: string;
  sede_nombre?: string | null;
  celula_id?: string | null;
  celula_nombre?: string | null;
  grupo: number;
  calendario: 'A' | 'B' | 'semanal';
  dia_semana: 'L' | 'M' | 'X' | 'J' | 'V' | 'S';
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'asignada' | 'cancelada';
  created_at: string;
}

export interface ClaseTemplateDiaConfig {
  dia_semana: 'L' | 'M' | 'X' | 'J' | 'V' | 'S';
  jornadas: { hora_inicio: string; hora_fin: string }[];
  max_clases: number | null;
  break_minutos: number;
}

export interface ClaseTemplate {
  id: string;
  nombre: string;
  programa_id: string | null;
  dias_semana: ('L' | 'M' | 'X' | 'J' | 'V' | 'S')[];
  jornadas: { hora_inicio: string; hora_fin: string }[];
  dias_config: ClaseTemplateDiaConfig[];
  semestres: { semestre: number; grupos: number }[];
  created_at: string;
}

export interface DraftItem {
  docente_id: string;
  docente_nombre: string;
  celula_docente_id?: string | null;
  celula_docente_nombre?: string | null;
  celula_sede_id?: string | null;
  celula_sede_nombre?: string | null;
  materia_id: string;
  materia_nombre: string;
  semestre?: number | null;
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
  es_foraneo: boolean;
  distancia_km: number;
  score: number;
  advertencias: string[];
}

export interface CandidatoAsignacion {
  docente_id: string;
  sede_id: string;
  materia_id: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  grupo: number;
  calendario: 'A' | 'B' | 'semanal';
  distancia_km: number;
  score: number;
}

export const DIA_LABELS: Record<string, string> = {
  L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado',
};

export const TIPO_SEDE_COLORS: Record<string, string> = {
  central: '#228be6',
  celula: '#40c057',
  municipal: '#fab005',
  rural: '#fd7e14',
};

export const TIPO_SEDE_LABELS: Record<string, string> = {
  central: 'Central',
  celula: 'Célula',
  municipal: 'Municipal',
  rural: 'Rural',
};
