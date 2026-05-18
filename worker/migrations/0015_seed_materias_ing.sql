-- Seed: Materias de Ingeniería de Sistemas (prog-ing) — 10 semestres

-- ── I SEMESTRE ───────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-01', 'Cálculo I',                            3, 1,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-02', 'Introducción a la Ingeniería de Sistemas', 2, 1, 'prog-ing', 'dep-ing-sis'),
  ('mat-ing-03', 'Lógica Computacional',                 3, 1,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-04', 'Álgebra Lineal',                       3, 1,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-05', 'Aprendizaje Autónomo',                 2, 1,  'prog-ing', 'dep-edu-lic'),
  ('mat-ing-06', 'Universidad y Contexto',               2, 1,  'prog-ing', 'dep-edu-lic');

-- ── II SEMESTRE ──────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-07', 'Cálculo II',                           3, 2,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-08', 'Física I',                             3, 2,  'prog-ing', 'dep-bas-fis'),
  ('mat-ing-09', 'Competencias Comunicativas',           2, 2,  'prog-ing', 'dep-edu-esp'),
  ('mat-ing-10', 'Programación I',                      3, 2,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-11', 'Teoría General de Sistemas',           3, 2,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-12', 'Inglés I',                             2, 2,  'prog-ing', 'dep-edu-ing');

-- ── III SEMESTRE ─────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-13', 'Cálculo III',                          3, 3,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-14', 'Física II',                            3, 3,  'prog-ing', 'dep-bas-fis'),
  ('mat-ing-15', 'Programación II',                     3, 3,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-16', 'Humanidades',                          2, 3,  'prog-ing', 'dep-edu-lic'),
  ('mat-ing-17', 'Inglés II',                            2, 3,  'prog-ing', 'dep-edu-ing');

-- ── IV SEMESTRE ──────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-18', 'Ecuaciones Diferenciales',             3, 4,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-19', 'Física III',                           3, 4,  'prog-ing', 'dep-bas-fis'),
  ('mat-ing-20', 'Programación III',                    3, 4,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-21', 'Electiva Libre I',                    2, 4,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-22', 'Inglés III',                           2, 4,  'prog-ing', 'dep-edu-ing'),
  ('mat-ing-23', 'Análisis y Diseño de Sistemas I',     3, 4,  'prog-ing', 'dep-ing-sis');

-- ── V SEMESTRE ───────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-24', 'Electrónica I',                        3, 5,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-25', 'Métodos Numéricos',                    3, 5,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-26', 'Diseño de Bases de Datos',             3, 5,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-27', 'Electiva Libre II',                   2, 5,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-28', 'Inglés IV',                            2, 5,  'prog-ing', 'dep-edu-ing'),
  ('mat-ing-29', 'Análisis y Diseño de Sistemas II',    3, 5,  'prog-ing', 'dep-ing-sis');

-- ── VI SEMESTRE ──────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-30', 'Electrónica II',                       3, 6,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-31', 'Estadística I',                        3, 6,  'prog-ing', 'dep-bas-est'),
  ('mat-ing-32', 'Programación de Bases de Datos',       3, 6,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-33', 'Electiva de Carrera I',               3, 6,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-34', 'Electiva Libre III',                  2, 6,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-35', 'Emprendimiento e Innovación Tecnológica', 2, 6, 'prog-ing', 'dep-edu-lic');

-- ── VII SEMESTRE ─────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-36', 'Programación Lineal',                  3, 7,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-37', 'Estadística II',                       3, 7,  'prog-ing', 'dep-bas-est'),
  ('mat-ing-38', 'Ingeniería de Software',               3, 7,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-39', 'Telemática',                           3, 7,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-40', 'Economía General',                     3, 7,  'prog-ing', 'dep-eco-eco'),
  ('mat-ing-41', 'Metodología de la Investigación',      3, 7,  'prog-ing', 'dep-edu-lic');

-- ── VIII SEMESTRE ────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-42', 'Programación No Lineal',               3, 8,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-43', 'Arquitectura del Computador',          3, 8,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-44', 'Electiva de Profundización I',        3, 8,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-45', 'Sistemas Operativos',                  3, 8,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-46', 'Constitución Política y Democracia',   2, 8,  'prog-ing', 'dep-edu-lic'),
  ('mat-ing-47', 'Administración de Empresas',           3, 8,  'prog-ing', 'dep-eco-adm');

-- ── IX SEMESTRE ──────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-48', 'Procesos Estocásticos',                3, 9,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-49', 'Teoría de Grafos',                     3, 9,  'prog-ing', 'dep-bas-mat'),
  ('mat-ing-50', 'Electiva de Carrera II',              3, 9,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-51', 'Electiva de Profundización II',       3, 9,  'prog-ing', 'dep-ing-sis'),
  ('mat-ing-52', 'Seminario de Investigación',           2, 9,  'prog-ing', 'dep-edu-lic'),
  ('mat-ing-53', 'Formulación y Evaluación de Proyectos', 3, 9, 'prog-ing', 'dep-eco-adm');

-- ── X SEMESTRE ───────────────────────────────────────────────────────────────
INSERT INTO materias (id, nombre, horas_semana, semestre, programa_id, departamento_id) VALUES
  ('mat-ing-54', 'Simulación',                           3, 10, 'prog-ing', 'dep-ing-sis'),
  ('mat-ing-55', 'Electiva de Profundización III',      3, 10, 'prog-ing', 'dep-ing-sis'),
  ('mat-ing-56', 'Trabajo de Grado',                    3, 10, 'prog-ing', 'dep-ing-sis'),
  ('mat-ing-57', 'Ética Profesional',                   2, 10, 'prog-ing', 'dep-edu-lic');
