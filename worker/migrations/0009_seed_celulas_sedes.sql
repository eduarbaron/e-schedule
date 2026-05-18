-- Seed: Células (zonas) y Sedes de la Universidad de Córdoba

-- ── CÉLULAS ─────────────────────────────────────────────────────────────────
INSERT INTO celulas (id, nombre, municipio) VALUES
  ('cel-1', 'Zona 1 - Valencia',               'Valencia'),
  ('cel-2', 'Zona 2 - Puerto Escondido',        'Puerto Escondido'),
  ('cel-3', 'Zona 3 - Cereté / Ciénaga de Oro', 'Cereté'),
  ('cel-4', 'Zona 4 - San Pelayo / Lorica',     'San Pelayo'),
  ('cel-5', 'Zona 5 - Sahagún / Chinú',         'Sahagún'),
  ('cel-6', 'Zona 6 - Planeta Rica / Montelíbano', 'Planeta Rica'),
  ('cel-7', 'Zona 7 - Montería',                'Montería');

-- ── SEDES: ZONA 1 – Valencia ─────────────────────────────────────────────────
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud) VALUES
  ('sede-val-ros',  'IE El Rosario (Valencia)',  'municipal', 'cel-1',  7.8970, -76.1450),
  ('sede-val-vil',  'IE VillaNueva (Valencia)',  'municipal', 'cel-1',  7.9050, -76.1380);

-- ── SEDES: ZONA 2 – Puerto Escondido ─────────────────────────────────────────
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud) VALUES
  ('sede-pue-cri',  'IE Cristo Rey (Puerto Escondido)', 'municipal', 'cel-2',  9.0667, -76.2333),
  ('sede-pue-mor',  'IE Morindo F (Puerto Escondido)',  'municipal', 'cel-2',  9.0500, -76.2500);

-- ── SEDES: ZONA 3 – Cereté / Ciénaga de Oro ──────────────────────────────────
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud) VALUES
  ('sede-cer-jul',  'IE Julián Pinto Buendía (Cereté)',         'municipal', 'cel-3',  8.8830, -75.7960),
  ('sede-cer-jmp',  'IE Julián Marceliano Polo (Cereté)',       'municipal', 'cel-3',  8.8900, -75.7920),
  ('sede-cie-maf',  'IE Marcos Fidel Suárez (Ciénaga de Oro)',  'municipal', 'cel-3',  8.8900, -75.6190),
  ('sede-cie-mab',  'IE María Bernarda (Ciénaga de Oro)',       'municipal', 'cel-3',  8.8960, -75.6220),
  ('sede-cie-maf2', 'IE Marco Fidel (Ciénaga de Oro)',          'municipal', 'cel-3',  8.8870, -75.6210);

-- ── SEDES: ZONA 4 – San Pelayo / Lorica ──────────────────────────────────────
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud) VALUES
  ('sede-san-ant',  'IE Antonio Nariño (San Pelayo)',      'municipal', 'cel-4',  8.9594, -75.8369),
  ('sede-san-sta',  'IE Santa Teresita (San Pelayo)',      'municipal', 'cel-4',  8.9620, -75.8400),
  ('sede-lor-pab',  'IE Pablo VI (Lorica)',                'celula',    'cel-4',  9.2390, -75.8140),
  ('sede-lor-cas',  'IE Castilleral (Lorica)',             'municipal', 'cel-4',  9.2350, -75.8200),
  ('sede-lor-raf',  'IE Rafael Núñez (Lorica)',            'municipal', 'cel-4',  9.2420, -75.8100),
  ('sede-lor-uni',  'Universidad de Córdoba Sede Lorica',  'celula',    'cel-4',  9.2350, -75.8150);

-- ── SEDES: ZONA 5 – Sahagún / Chinú ──────────────────────────────────────────
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud) VALUES
  ('sede-sah-nor',  'IE Normal Superior (Sahagún)',         'municipal', 'cel-5',  8.9439, -75.4358),
  ('sede-sah-lay',  'IE La Y (Sahagún)',                    'municipal', 'cel-5',  8.9500, -75.4400),
  ('sede-sah-col',  'IE Colomboy (Sahagún)',                'municipal', 'cel-5',  8.9380, -75.4300),
  ('sede-sah-uni',  'Universidad de Córdoba Sede Sahagún',  'celula',    'cel-5',  8.9450, -75.4370),
  ('sede-chi-las',  'IE Las Mercedes (Chinú)',              'municipal', 'cel-5',  9.1081, -75.3986),
  ('sede-chi-las2', 'IE Las Mercedes 2 (Chinú)',            'municipal', 'cel-5',  9.1100, -75.3970);

-- ── SEDES: ZONA 6 – Planeta Rica / Montelíbano ───────────────────────────────
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud) VALUES
  ('sede-pla-can',  'IE La Candelaria (Planeta Rica)',  'celula',    'cel-6',  8.4089, -75.5851),
  ('sede-pla-sim',  'IE Simón Bolívar (Planeta Rica)',  'municipal', 'cel-6',  8.4110, -75.5870),
  ('sede-mon-anc',  'IE El Anclar (Montelíbano)',       'municipal', 'cel-6',  7.9833, -75.4333),
  ('sede-mon-esp',  'IE La Esperanza (Montelíbano)',    'municipal', 'cel-6',  7.9860, -75.4350);

-- ── SEDES: ZONA 7 – Montería ──────────────────────────────────────────────────
INSERT INTO sedes (id, nombre, tipo, celula_id, latitud, longitud) VALUES
  ('sede-mon-cri',  'IE Cristóbal Colón (Montería)',        'municipal', 'cel-7',  8.7479, -75.8814),
  ('sede-mon-sab',  'IE Sabanal (Montería)',                 'municipal', 'cel-7',  8.7600, -75.8900),
  ('sede-mon-uni',  'Universidad de Córdoba Sede Central',  'central',   'cel-7',  8.7490, -75.8740),
  ('sede-mon-sur',  'Universidad del Sur (Montería)',        'celula',    'cel-7',  8.7450, -75.8780);
