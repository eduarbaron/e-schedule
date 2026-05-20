-- Limpia la entidad de plantillas: reemplaza dia_semana por dias_semana_json.
CREATE TABLE IF NOT EXISTS clase_templates_new (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  programa_id TEXT REFERENCES programas(id),
  dias_semana_json TEXT NOT NULL,
  jornadas_json TEXT NOT NULL,
  semestres_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO clase_templates_new (
  id,
  nombre,
  programa_id,
  dias_semana_json,
  jornadas_json,
  semestres_json,
  created_at
)
SELECT
  id,
  nombre,
  programa_id,
  json_array(dia_semana),
  jornadas_json,
  semestres_json,
  created_at
FROM clase_templates;

DROP TABLE clase_templates;

ALTER TABLE clase_templates_new RENAME TO clase_templates;

CREATE INDEX IF NOT EXISTS idx_clase_templates_programa ON clase_templates(programa_id);
