-- Añadir campo grupo a asignaciones
-- Permite que una sede imparta la misma materia en grupos distintos (Grupo 1, Grupo 2, etc.)
ALTER TABLE asignaciones ADD COLUMN grupo INTEGER NOT NULL DEFAULT 1;

-- Índice para consultas por grupo
CREATE INDEX IF NOT EXISTS idx_asignaciones_grupo ON asignaciones(sede_id, materia_id, grupo);
