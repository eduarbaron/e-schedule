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
  departamento_id: string | null;
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
  sede_id: string;
  materia_id: string;
  dia_semana: 'L' | 'M' | 'X' | 'J' | 'V' | 'S';
  hora_inicio: string;
  hora_fin: string;
  modo: 'automatico' | 'libre' | 'foraneo';
  distancia_km: number | null;
  periodo: string;
  programa_id: string | null;
  grupo: number;
  calendario: 'A' | 'B' | 'semanal';
  created_at: string;
}

export interface ClaseAcademica {
  id: string;
  periodo: string;
  programa_id: string;
  programa_nombre?: string | null;
  materia_id: string;
  materia_nombre?: string | null;
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

export type Bindings = {
  e_schedule_db: D1Database;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'coordinador';
}

export interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'coordinador';
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  activo: number;
  ultimo_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Variables = {
  user: UsuarioPublico;
};

/** Tipo de entorno completo para rutas protegidas */
export type AppEnv = { Bindings: Bindings; Variables: Variables };
