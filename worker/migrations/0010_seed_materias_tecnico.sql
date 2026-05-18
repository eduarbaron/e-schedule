-- Seed: Materias del Técnico Profesional en Programación Web
-- programa_id: prog-web  (prioridad 1, ciclo quincenal)

-- ── I SEMESTRE ───────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, programa_id, departamento_id) VALUES
  ('mat-tec-01', 'Inglés Técnico I',               3, 'prog-web', 'dep-edu-ing'),
  ('mat-tec-02', 'Aprendizaje Autónomo',            2, 'prog-web', 'dep-edu-lic'),
  ('mat-tec-03', 'Fundamentos de Programación',     3, 'prog-web', 'dep-ing-sis'),
  ('mat-tec-04', 'Habilidades Comunicativas I',     2, 'prog-web', 'dep-edu-esp'),
  ('mat-tec-05', 'Matemática Básica',               3, 'prog-web', 'dep-bas-mat'),
  ('mat-tec-06', 'Introducción a la Programación Web', 3, 'prog-web', 'dep-ing-sis');

-- ── II SEMESTRE ──────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, programa_id, departamento_id) VALUES
  ('mat-tec-07', 'Inglés Técnico II',               3, 'prog-web', 'dep-edu-ing'),
  ('mat-tec-08', 'Estadística y Probabilidad',      2, 'prog-web', 'dep-bas-mat'),
  ('mat-tec-09', 'Habilidades Comunicativas II',    2, 'prog-web', 'dep-edu-esp'),
  ('mat-tec-10', 'Programación Web I - Backend',    3, 'prog-web', 'dep-ing-sis'),
  ('mat-tec-11', 'Base de Datos',                   3, 'prog-web', 'dep-ing-sis'),
  ('mat-tec-12', 'Diseño de Interfaces de Usuario - Frontend', 3, 'prog-web', 'dep-ing-sis');

-- ── III SEMESTRE ─────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, programa_id, departamento_id) VALUES
  ('mat-tec-13', 'Servicios de Computación en la Nube', 3, 'prog-web', 'dep-ing-sis'),
  ('mat-tec-14', 'Proyecto Web',                    4, 'prog-web', 'dep-ing-sis'),
  ('mat-tec-15', 'Innovación y Emprendimiento Digital', 3, 'prog-web', 'dep-edu-lic'),
  ('mat-tec-16', 'Seguridad en Aplicaciones Web',   3, 'prog-web', 'dep-ing-sis'),
  ('mat-tec-17', 'Programación Web II - Backend',   3, 'prog-web', 'dep-ing-sis');
