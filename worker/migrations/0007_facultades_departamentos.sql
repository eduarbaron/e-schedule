-- Facultades
CREATE TABLE IF NOT EXISTS facultades (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Departamentos pertenecen a una facultad
CREATE TABLE IF NOT EXISTS departamentos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  facultad_id TEXT NOT NULL REFERENCES facultades(id) ON DELETE CASCADE,
  descripcion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(nombre, facultad_id)
);

CREATE INDEX IF NOT EXISTS idx_departamentos_facultad ON departamentos(facultad_id);

-- Añadir departamento_id a materias (nullable para no romper datos existentes)
ALTER TABLE materias ADD COLUMN departamento_id TEXT REFERENCES departamentos(id) ON DELETE SET NULL;

-- Añadir departamento_id a docentes (nullable para no romper datos existentes)
ALTER TABLE docentes ADD COLUMN departamento_id TEXT REFERENCES departamentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_materias_departamento ON materias(departamento_id);
CREATE INDEX IF NOT EXISTS idx_docentes_departamento ON docentes(departamento_id);
