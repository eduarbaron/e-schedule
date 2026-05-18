-- Relación sede ↔ programa: define qué programas se ofertan en qué sedes
CREATE TABLE IF NOT EXISTS sede_programa (
  sede_id TEXT NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  programa_id TEXT NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (sede_id, programa_id)
);

CREATE INDEX IF NOT EXISTS idx_sede_programa_sede ON sede_programa(sede_id);
CREATE INDEX IF NOT EXISTS idx_sede_programa_programa ON sede_programa(programa_id);
