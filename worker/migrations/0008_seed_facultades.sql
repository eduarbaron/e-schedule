-- Seed: Facultades y Departamentos de la Universidad de Córdoba

-- ── FACULTADES ──────────────────────────────────────────────────────────────
INSERT INTO facultades (id, nombre) VALUES
  ('fac-ing',    'Facultad de Ingenierías'),
  ('fac-bas',    'Facultad de Ciencias Básicas'),
  ('fac-sal',    'Facultad de Ciencias de la Salud'),
  ('fac-eco',    'Facultad de Ciencias Económicas, Jurídicas y Administrativas'),
  ('fac-edu',    'Facultad de Educación y Ciencias Humanas'),
  ('fac-agr',    'Facultad de Ciencias Agrícolas'),
  ('fac-vet',    'Facultad de Medicina Veterinaria y Zootecnia');

-- ── DEPARTAMENTOS: Ingeniería ────────────────────────────────────────────────
INSERT INTO departamentos (id, nombre, facultad_id) VALUES
  ('dep-ing-amb', 'Ingeniería Ambiental',   'fac-ing'),
  ('dep-ing-ali', 'Ingeniería de Alimentos','fac-ing'),
  ('dep-ing-ind', 'Ingeniería Industrial',  'fac-ing'),
  ('dep-ing-mec', 'Ingeniería Mecánica',    'fac-ing'),
  ('dep-ing-sis', 'Ingeniería de Sistemas', 'fac-ing');

-- ── DEPARTAMENTOS: Ciencias Básicas ─────────────────────────────────────────
INSERT INTO departamentos (id, nombre, facultad_id) VALUES
  ('dep-bas-est', 'Estadística',   'fac-bas'),
  ('dep-bas-mat', 'Matemáticas',   'fac-bas'),
  ('dep-bas-geo', 'Geografía',     'fac-bas'),
  ('dep-bas-fis', 'Física',        'fac-bas'),
  ('dep-bas-qui', 'Química',       'fac-bas'),
  ('dep-bas-bio', 'Biología',      'fac-bas');

-- ── DEPARTAMENTOS: Ciencias de la Salud ─────────────────────────────────────
INSERT INTO departamentos (id, nombre, facultad_id) VALUES
  ('dep-sal-bac', 'Bacteriología',        'fac-sal'),
  ('dep-sal-enf', 'Enfermería',           'fac-sal'),
  ('dep-sal-far', 'Regencia de Farmacia', 'fac-sal'),
  ('dep-sal-adm', 'Administración en Salud', 'fac-sal');

-- ── DEPARTAMENTOS: Ciencias Económicas, Jurídicas y Administrativas ──────────
INSERT INTO departamentos (id, nombre, facultad_id) VALUES
  ('dep-eco-adm', 'Administración de Empresas', 'fac-eco'),
  ('dep-eco-con', 'Contaduría Pública',          'fac-eco'),
  ('dep-eco-eco', 'Economía',                    'fac-eco'),
  ('dep-eco-der', 'Derecho',                     'fac-eco');

-- ── DEPARTAMENTOS: Educación y Ciencias Humanas ──────────────────────────────
INSERT INTO departamentos (id, nombre, facultad_id) VALUES
  ('dep-edu-lic', 'Licenciatura en Educación Básica',         'fac-edu'),
  ('dep-edu-esp', 'Licenciatura en Lengua Castellana',        'fac-edu'),
  ('dep-edu-ing', 'Licenciatura en Inglés',                   'fac-edu'),
  ('dep-edu-mat', 'Licenciatura en Matemáticas',              'fac-edu'),
  ('dep-edu-inf', 'Licenciatura en Informática',              'fac-edu'),
  ('dep-edu-cie', 'Licenciatura en Ciencias Naturales',       'fac-edu'),
  ('dep-edu-ede', 'Licenciatura en Educación Física',         'fac-edu');

-- ── DEPARTAMENTOS: Ciencias Agrícolas ───────────────────────────────────────
INSERT INTO departamentos (id, nombre, facultad_id) VALUES
  ('dep-agr-ing', 'Ingeniería Agronómica',  'fac-agr'),
  ('dep-agr-ing2','Ingeniería Agroindustrial','fac-agr'),
  ('dep-agr-acua','Acuicultura',            'fac-agr');

-- ── DEPARTAMENTOS: Medicina Veterinaria y Zootecnia ─────────────────────────
INSERT INTO departamentos (id, nombre, facultad_id) VALUES
  ('dep-vet-mvz', 'Medicina Veterinaria y Zootecnia', 'fac-vet');
