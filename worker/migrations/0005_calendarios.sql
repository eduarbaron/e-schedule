-- Tipo de ciclo en programas: semanal (todas las semanas) o quincenal (alterna A/B)
ALTER TABLE programas ADD COLUMN tipo_ciclo TEXT NOT NULL DEFAULT 'quincenal' CHECK(tipo_ciclo IN ('semanal', 'quincenal'));

-- Periodos académicos: definen el semestre y en qué calendario arranca
CREATE TABLE IF NOT EXISTS periodos (
  id TEXT PRIMARY KEY,          -- ej: '2025-1'
  nombre TEXT NOT NULL,         -- ej: 'Semestre 2025-1'
  fecha_inicio TEXT NOT NULL,   -- ISO date: '2025-01-27'
  calendario_inicio TEXT NOT NULL CHECK(calendario_inicio IN ('A', 'B')),
  activo INTEGER NOT NULL DEFAULT 0, -- 1 = periodo en curso
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Calendario en asignaciones: A, B o semanal (derivado del programa)
ALTER TABLE asignaciones ADD COLUMN calendario TEXT NOT NULL DEFAULT 'semanal' CHECK(calendario IN ('A', 'B', 'semanal'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_periodos_activo ON periodos(activo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_calendario ON asignaciones(calendario);

-- Seed: actualizar programas existentes con tipo_ciclo quincenal por defecto
UPDATE programas SET tipo_ciclo = 'quincenal';
