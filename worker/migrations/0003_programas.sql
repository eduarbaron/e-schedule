-- Programas académicos
CREATE TABLE IF NOT EXISTS programas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  es_prioritario INTEGER NOT NULL DEFAULT 0, -- 1 = tiene prioridad en asignación automática
  orden_prioridad INTEGER NOT NULL DEFAULT 99, -- menor número = mayor prioridad
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vincular materias a programa (reemplaza el campo texto 'programa')
ALTER TABLE materias ADD COLUMN programa_id TEXT REFERENCES programas(id);

-- Vincular asignaciones a programa (para trazabilidad)
ALTER TABLE asignaciones ADD COLUMN programa_id TEXT REFERENCES programas(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_materias_programa ON materias(programa_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_programa ON asignaciones(programa_id);

-- Seed: programas de ejemplo
INSERT INTO programas (id, nombre, descripcion, es_prioritario, orden_prioridad) VALUES
  ('prog-tec-sistemas', 'Tecnología en Sistemas', 'Programa tecnológico de sistemas de información', 1, 1),
  ('prog-tec-electro',  'Tecnología en Electrónica', 'Programa tecnológico de electrónica', 0, 2),
  ('prog-tec-civil',    'Tecnología en Construcción Civil', 'Programa tecnológico de construcción', 0, 3),
  ('prog-tec-admin',    'Técnico en Administración', 'Técnico laboral en gestión empresarial', 0, 4);

-- Actualizar materias del seed para asociarlas al programa prioritario
UPDATE materias SET programa_id = 'prog-tec-sistemas'
  WHERE nombre IN ('Programación I', 'Bases de Datos', 'Redes de Computadores');

UPDATE materias SET programa_id = 'prog-tec-electro'
  WHERE nombre IN ('Circuitos Eléctricos', 'Electrónica Básica');

UPDATE materias SET programa_id = 'prog-tec-civil'
  WHERE nombre IN ('Matemáticas', 'Física');
