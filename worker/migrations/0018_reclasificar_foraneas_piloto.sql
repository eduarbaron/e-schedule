-- Reclasificar asignaciones piloto creadas por el flujo anterior.
-- Antes, las asignaciones foraneas del borrador se guardaban como modo libre.

UPDATE asignaciones
SET modo = 'foraneo'
WHERE id LIKE 'dev-asig-pilot-%'
  AND modo = 'libre'
  AND EXISTS (
    SELECT 1
    FROM docentes d
    JOIN sedes s ON s.id = asignaciones.sede_id
    WHERE d.id = asignaciones.docente_id
      AND IFNULL(d.celula_id, '') != IFNULL(s.celula_id, '')
  );
