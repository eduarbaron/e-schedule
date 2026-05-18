-- Clases / oferta académica parametrizada
-- Define la necesidad académica antes de asignar docente.
CREATE TABLE IF NOT EXISTS clases (
  id TEXT PRIMARY KEY,
  periodo TEXT NOT NULL REFERENCES periodos(id),
  programa_id TEXT NOT NULL REFERENCES programas(id),
  materia_id TEXT NOT NULL REFERENCES materias(id),
  sede_id TEXT NOT NULL REFERENCES sedes(id),
  grupo INTEGER NOT NULL DEFAULT 1,
  calendario TEXT NOT NULL DEFAULT 'semanal' CHECK(calendario IN ('A', 'B', 'semanal')),
  dia_semana TEXT NOT NULL CHECK(dia_semana IN ('L','M','X','J','V','S')),
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'asignada', 'cancelada')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clases_periodo ON clases(periodo);
CREATE INDEX IF NOT EXISTS idx_clases_programa ON clases(programa_id);
CREATE INDEX IF NOT EXISTS idx_clases_materia ON clases(materia_id);
CREATE INDEX IF NOT EXISTS idx_clases_sede ON clases(sede_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clases_unicas
  ON clases(periodo, materia_id, sede_id, grupo, calendario, dia_semana, hora_inicio, hora_fin);
