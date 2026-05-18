-- Seed: Materias de Tecnología en Desarrollo de Software (prog-tds)

-- ── I SEMESTRE ───────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-tds-01', 'Fundamentos Matemáticos',               3, 1, 'prog-tds', 'dep-bas-mat'),
  ('mat-tds-02', 'Introducción a la Lógica de Programación', 3, 1, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-03', 'Aprendizaje Autónomo',                  2, 1, 'prog-tds', 'dep-edu-lic'),
  ('mat-tds-04', 'Arquitectura de Sistemas de Información', 3, 1, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-05', 'Álgebra Lineal',                        3, 1, 'prog-tds', 'dep-bas-mat'),
  ('mat-tds-06', 'Competencias Comunicativas',             2, 1, 'prog-tds', 'dep-edu-esp');

-- ── II SEMESTRE ──────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-tds-07', 'Programación Orientada a Objetos',      3, 2, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-08', 'Inglés I',                              2, 2, 'prog-tds', 'dep-edu-ing'),
  ('mat-tds-09', 'Estadísticas',                          3, 2, 'prog-tds', 'dep-bas-est'),
  ('mat-tds-10', 'Bases de Datos I',                      3, 2, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-11', 'Electiva Libre I',                      2, 2, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-12', 'Requerimientos de Sistemas de Información', 3, 2, 'prog-tds', 'dep-ing-sis');

-- ── III SEMESTRE ─────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-tds-13', 'Estructuras de Datos',                  3, 3, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-14', 'Inglés II',                             2, 3, 'prog-tds', 'dep-edu-ing'),
  ('mat-tds-15', 'Electiva Libre II',                     2, 3, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-16', 'Bases de Datos II',                     3, 3, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-17', 'Metodología de la Investigación',       3, 3, 'prog-tds', 'dep-edu-lic'),
  ('mat-tds-18', 'Metodologías de Desarrollo de Software', 3, 3, 'prog-tds', 'dep-ing-sis');

-- ── IV SEMESTRE ──────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-tds-19', 'Desarrollo Web I',                      3, 4, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-20', 'Inglés III',                            2, 4, 'prog-tds', 'dep-edu-ing'),
  ('mat-tds-21', 'Desarrollo de Aplicaciones Móviles',    3, 4, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-22', 'Innovación y Generación de Empresas',   3, 4, 'prog-tds', 'dep-edu-lic'),
  ('mat-tds-23', 'Electiva de Profundización I',          3, 4, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-24', 'Constitución Política y Ética',         2, 4, 'prog-tds', 'dep-edu-lic');

-- ── V SEMESTRE ───────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-tds-25', 'Desarrollo Seguro de Software',         2, 5, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-26', 'Desarrollo Web II',                     3, 5, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-27', 'Trabajo de Grado',                      3, 5, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-28', 'Electiva de Profundización II',         3, 5, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-29', 'Nuevas Tendencias en Desarrollo de Software', 3, 5, 'prog-tds', 'dep-ing-sis'),
  ('mat-tds-30', 'Emprendimiento Digital',                2, 5, 'prog-tds', 'dep-edu-lic');
