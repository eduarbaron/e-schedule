-- Plantillas base para el piloto del técnico profesional en programación web.
INSERT OR IGNORE INTO clase_templates (id, nombre, programa_id, dia_semana, jornadas_json, semestres_json)
VALUES
  (
    'tpl-web-sabado-sem1',
    'Tecnico sabado - Semestre 1',
    'prog-web',
    'S',
    '[{"hora_inicio":"07:00","hora_fin":"13:00"},{"hora_inicio":"14:00","hora_fin":"17:00"}]',
    '[{"semestre":1,"grupos":2}]'
  ),
  (
    'tpl-web-sabado-sem1-2',
    'Tecnico sabado - Semestres 1 y 2',
    'prog-web',
    'S',
    '[{"hora_inicio":"07:00","hora_fin":"13:00"},{"hora_inicio":"14:00","hora_fin":"17:00"}]',
    '[{"semestre":1,"grupos":2},{"semestre":2,"grupos":2}]'
  ),
  (
    'tpl-web-sabado-sem1-3',
    'Tecnico sabado - Semestres 1 y 3',
    'prog-web',
    'S',
    '[{"hora_inicio":"07:00","hora_fin":"13:00"},{"hora_inicio":"14:00","hora_fin":"17:00"}]',
    '[{"semestre":1,"grupos":2},{"semestre":3,"grupos":2}]'
  );
