-- Añadir departamento_id a programas
ALTER TABLE programas ADD COLUMN departamento_id TEXT REFERENCES departamentos(id);

-- Asociar los 3 programas al departamento de Ingeniería de Sistemas
UPDATE programas SET departamento_id = 'dep-ing-sis' WHERE id IN ('prog-web', 'prog-tds', 'prog-ing');
