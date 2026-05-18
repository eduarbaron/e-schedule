-- Células Regionales (nodo administrativo agrupador)
CREATE TABLE IF NOT EXISTS celulas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  municipio TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sedes (central, célula, municipal, rural)
CREATE TABLE IF NOT EXISTS sedes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('central', 'celula', 'municipal', 'rural')),
  celula_id TEXT REFERENCES celulas(id),
  latitud REAL NOT NULL,
  longitud REAL NOT NULL,
  direccion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Docentes
CREATE TABLE IF NOT EXISTS docentes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  tipo_vinculacion TEXT NOT NULL CHECK(tipo_vinculacion IN ('central', 'celula')),
  celula_id TEXT REFERENCES celulas(id),
  horas_asignadas INTEGER NOT NULL DEFAULT 0,
  max_horas INTEGER NOT NULL DEFAULT 19,
  modo_libre INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Materias / Asignaturas
CREATE TABLE IF NOT EXISTS materias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  horas_semana INTEGER NOT NULL DEFAULT 2,
  programa TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bloques horarios disponibles del docente (disponibilidad)
CREATE TABLE IF NOT EXISTS disponibilidad (
  id TEXT PRIMARY KEY,
  docente_id TEXT NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL CHECK(dia_semana IN ('L','M','X','J','V','S')),
  hora_inicio TEXT NOT NULL, -- HH:MM
  hora_fin TEXT NOT NULL,    -- HH:MM
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Asignaciones docente → sede → materia → bloque horario
CREATE TABLE IF NOT EXISTS asignaciones (
  id TEXT PRIMARY KEY,
  docente_id TEXT NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  sede_id TEXT NOT NULL REFERENCES sedes(id),
  materia_id TEXT NOT NULL REFERENCES materias(id),
  dia_semana TEXT NOT NULL CHECK(dia_semana IN ('L','M','X','J','V','S')),
  hora_inicio TEXT NOT NULL, -- HH:MM
  hora_fin TEXT NOT NULL,    -- HH:MM
  modo TEXT NOT NULL DEFAULT 'automatico' CHECK(modo IN ('automatico', 'libre')),
  distancia_km REAL,
  periodo TEXT NOT NULL, -- ej: '2025-1'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_asignaciones_docente ON asignaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_sede ON asignaciones(sede_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_periodo ON asignaciones(periodo);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_docente ON disponibilidad(docente_id);
CREATE INDEX IF NOT EXISTS idx_docentes_celula ON docentes(celula_id);
CREATE INDEX IF NOT EXISTS idx_sedes_celula ON sedes(celula_id);
