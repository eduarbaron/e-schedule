-- Células Regionales
INSERT INTO celulas (id, nombre, municipio) VALUES
  ('cel-001', 'Célula Norte', 'Tunja'),
  ('cel-002', 'Célula Sur', 'Duitama'),
  ('cel-003', 'Célula Occidente', 'Sogamoso');

-- Sedes
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud, direccion) VALUES
  ('sede-central', 'Sede Central Principal', 'central', NULL, 5.5353, -73.3678, 'Calle 1 # 1-1, Tunja'),
  ('sede-cel-001', 'Sede Célula Norte', 'celula', 'cel-001', 5.5300, -73.3600, 'Carrera 10 # 20-30, Tunja'),
  ('sede-cel-002', 'Sede Célula Sur', 'celula', 'cel-002', 5.8300, -73.0300, 'Calle 15 # 5-10, Duitama'),
  ('sede-cel-003', 'Sede Célula Occidente', 'celula', 'cel-003', 5.7200, -72.9300, 'Av. Principal # 3-20, Sogamoso'),
  ('sede-r-001', 'Sede Rural Motavita', 'rural', 'cel-001', 5.5800, -73.3900, 'Vía Motavita Km 5'),
  ('sede-r-002', 'Sede Rural Oicatá', 'rural', 'cel-001', 5.6100, -73.4200, 'Vereda Centro, Oicatá'),
  ('sede-r-003', 'Sede Municipal Paipa', 'municipal', 'cel-002', 5.7800, -73.1100, 'Carrera 5 # 10-20, Paipa'),
  ('sede-r-004', 'Sede Rural Nobsa', 'rural', 'cel-003', 5.7700, -72.9500, 'Calle Principal, Nobsa'),
  ('sede-r-005', 'Sede Municipal Tibasosa', 'municipal', 'cel-003', 5.7500, -72.9800, 'Parque Central, Tibasosa');

-- Materias
INSERT INTO materias (id, nombre, horas_semana, programa) VALUES
  ('mat-001', 'Programación I', 3, 'Tecnología en Sistemas'),
  ('mat-002', 'Bases de Datos', 2, 'Tecnología en Sistemas'),
  ('mat-003', 'Redes y Comunicaciones', 2, 'Tecnología en Sistemas'),
  ('mat-004', 'Matemáticas Básicas', 3, 'Técnico en Contabilidad'),
  ('mat-005', 'Contabilidad General', 3, 'Técnico en Contabilidad'),
  ('mat-006', 'Inglés Técnico', 2, 'Transversal'),
  ('mat-007', 'Emprendimiento', 2, 'Transversal');

-- Docentes
INSERT INTO docentes (id, nombre, email, tipo_vinculacion, celula_id, horas_asignadas, max_horas) VALUES
  ('doc-001', 'Carlos Ramírez', 'carlos.ramirez@eschedule.edu', 'central', NULL, 0, 19),
  ('doc-002', 'Ana María Torres', 'ana.torres@eschedule.edu', 'central', NULL, 0, 19),
  ('doc-003', 'Luis Fernando Gómez', 'luis.gomez@eschedule.edu', 'celula', 'cel-001', 0, 19),
  ('doc-004', 'Patricia Niño', 'patricia.nino@eschedule.edu', 'celula', 'cel-001', 0, 19),
  ('doc-005', 'Jorge Hernández', 'jorge.hernandez@eschedule.edu', 'celula', 'cel-002', 0, 19),
  ('doc-006', 'Sandra Morales', 'sandra.morales@eschedule.edu', 'celula', 'cel-002', 0, 19),
  ('doc-007', 'Andrés Castro', 'andres.castro@eschedule.edu', 'celula', 'cel-003', 0, 19),
  ('doc-008', 'Mónica Vargas', 'monica.vargas@eschedule.edu', 'celula', 'cel-003', 0, 19);

-- Disponibilidad docentes
INSERT INTO disponibilidad (id, docente_id, dia_semana, hora_inicio, hora_fin) VALUES
  -- Carlos Ramírez (central) - Lunes a Viernes
  ('disp-001', 'doc-001', 'L', '07:00', '12:00'),
  ('disp-002', 'doc-001', 'M', '07:00', '12:00'),
  ('disp-003', 'doc-001', 'X', '14:00', '19:00'),
  ('disp-004', 'doc-001', 'J', '07:00', '12:00'),
  ('disp-005', 'doc-001', 'V', '07:00', '12:00'),
  -- Ana María Torres (central)
  ('disp-006', 'doc-002', 'L', '14:00', '19:00'),
  ('disp-007', 'doc-002', 'M', '14:00', '19:00'),
  ('disp-008', 'doc-002', 'J', '07:00', '12:00'),
  ('disp-009', 'doc-002', 'V', '14:00', '19:00'),
  -- Luis Fernando Gómez (célula Norte)
  ('disp-010', 'doc-003', 'L', '07:00', '12:00'),
  ('disp-011', 'doc-003', 'X', '07:00', '12:00'),
  ('disp-012', 'doc-003', 'V', '07:00', '17:00'),
  -- Patricia Niño (célula Norte)
  ('disp-013', 'doc-004', 'M', '07:00', '12:00'),
  ('disp-014', 'doc-004', 'J', '07:00', '12:00'),
  ('disp-015', 'doc-004', 'S', '07:00', '12:00'),
  -- Jorge Hernández (célula Sur)
  ('disp-016', 'doc-005', 'L', '07:00', '19:00'),
  ('disp-017', 'doc-005', 'M', '07:00', '19:00'),
  ('disp-018', 'doc-005', 'X', '07:00', '13:00'),
  -- Sandra Morales (célula Sur)
  ('disp-019', 'doc-006', 'X', '14:00', '19:00'),
  ('disp-020', 'doc-006', 'J', '07:00', '12:00'),
  ('disp-021', 'doc-006', 'V', '07:00', '12:00'),
  -- Andrés Castro (célula Occidente)
  ('disp-022', 'doc-007', 'L', '14:00', '19:00'),
  ('disp-023', 'doc-007', 'M', '14:00', '19:00'),
  ('disp-024', 'doc-007', 'J', '14:00', '19:00'),
  -- Mónica Vargas (célula Occidente)
  ('disp-025', 'doc-008', 'M', '07:00', '12:00'),
  ('disp-026', 'doc-008', 'X', '07:00', '12:00'),
  ('disp-027', 'doc-008', 'V', '07:00', '12:00');
