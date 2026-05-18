-- Separar asignaciones foraneas autorizadas por algoritmo del modo libre manual.
-- SQLite no permite modificar un CHECK directamente, por eso se reconstruye la tabla.

PRAGMA foreign_keys = OFF;

CREATE TABLE asignaciones_new (
  id TEXT PRIMARY KEY,
  docente_id TEXT NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  sede_id TEXT NOT NULL REFERENCES sedes(id),
  materia_id TEXT NOT NULL REFERENCES materias(id),
  dia_semana TEXT NOT NULL CHECK(dia_semana IN ('L','M','X','J','V','S')),
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  modo TEXT NOT NULL DEFAULT 'automatico' CHECK(modo IN ('automatico', 'libre', 'foraneo')),
  distancia_km REAL,
  periodo TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  programa_id TEXT REFERENCES programas(id),
  grupo INTEGER NOT NULL DEFAULT 1,
  calendario TEXT NOT NULL DEFAULT 'semanal' CHECK(calendario IN ('A', 'B', 'semanal'))
);

INSERT INTO asignaciones_new (
  id,
  docente_id,
  sede_id,
  materia_id,
  dia_semana,
  hora_inicio,
  hora_fin,
  modo,
  distancia_km,
  periodo,
  created_at,
  programa_id,
  grupo,
  calendario
)
SELECT
  id,
  docente_id,
  sede_id,
  materia_id,
  dia_semana,
  hora_inicio,
  hora_fin,
  modo,
  distancia_km,
  periodo,
  created_at,
  programa_id,
  grupo,
  calendario
FROM asignaciones;

DROP TABLE asignaciones;
ALTER TABLE asignaciones_new RENAME TO asignaciones;

CREATE INDEX IF NOT EXISTS idx_asignaciones_docente ON asignaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_sede ON asignaciones(sede_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_periodo ON asignaciones(periodo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_programa ON asignaciones(programa_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_grupo ON asignaciones(sede_id, materia_id, grupo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_calendario ON asignaciones(calendario);

PRAGMA foreign_keys = ON;
