-- Plantillas reutilizables para generar clases por sede.
CREATE TABLE IF NOT EXISTS clase_templates (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  programa_id TEXT REFERENCES programas(id),
  dia_semana TEXT NOT NULL CHECK(dia_semana IN ('L','M','X','J','V','S')),
  jornadas_json TEXT NOT NULL,
  semestres_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clase_templates_programa ON clase_templates(programa_id);
