-- Eliminar columna legada 'programa' (texto libre) de materias
-- El campo programa_id (FK a programas) es la referencia correcta
ALTER TABLE materias DROP COLUMN programa;
