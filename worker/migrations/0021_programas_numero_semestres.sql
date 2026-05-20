-- Numero total de semestres curriculares del programa.
ALTER TABLE programas ADD COLUMN numero_semestres INTEGER NOT NULL DEFAULT 10;

UPDATE programas
SET numero_semestres = (
  SELECT COALESCE(MAX(m.semestre), programas.numero_semestres)
  FROM materias m
  WHERE m.programa_id = programas.id
    AND m.semestre IS NOT NULL
)
WHERE EXISTS (
  SELECT 1
  FROM materias m
  WHERE m.programa_id = programas.id
    AND m.semestre IS NOT NULL
);
