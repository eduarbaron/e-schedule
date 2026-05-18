-- Añadir columna semestre a materias
ALTER TABLE materias ADD COLUMN semestre INTEGER;

-- Actualizar semestres del Técnico Profesional en Programación Web
-- I Semestre
UPDATE materias SET semestre = 1 WHERE id IN (
  'mat-tec-01','mat-tec-02','mat-tec-03','mat-tec-04','mat-tec-05','mat-tec-06'
);
-- II Semestre
UPDATE materias SET semestre = 2 WHERE id IN (
  'mat-tec-07','mat-tec-08','mat-tec-09','mat-tec-10','mat-tec-11','mat-tec-12'
);
-- III Semestre
UPDATE materias SET semestre = 3 WHERE id IN (
  'mat-tec-13','mat-tec-14','mat-tec-15','mat-tec-16','mat-tec-17'
);
