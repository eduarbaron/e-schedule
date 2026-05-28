export async function ensureClaseProyeccionesSchema(db: D1Database) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS clase_proyecciones (
        id TEXT PRIMARY KEY,
        periodo TEXT NOT NULL,
        programa_id TEXT NOT NULL,
        celula_id TEXT,
        sede_id TEXT NOT NULL,
        template_id TEXT,
        semestre INTEGER NOT NULL,
        grupos INTEGER NOT NULL DEFAULT 1,
        dias_semana_json TEXT NOT NULL,
        jornadas_json TEXT NOT NULL,
        dias_config_json TEXT NOT NULL,
        origen TEXT NOT NULL DEFAULT 'plantilla',
        estado TEXT NOT NULL DEFAULT 'borrador',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_clase_proyecciones_periodo_programa ON clase_proyecciones(periodo, programa_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_clase_proyecciones_sede ON clase_proyecciones(sede_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_clase_proyecciones_celula ON clase_proyecciones(celula_id)'),
  ]);

  const columnas = await db.prepare('PRAGMA table_info(clases)').all<{ name: string }>();
  const tieneProyeccionId = columnas.results.some(col => col.name === 'proyeccion_id');
  if (!tieneProyeccionId) {
    await db.prepare('ALTER TABLE clases ADD COLUMN proyeccion_id TEXT REFERENCES clase_proyecciones(id)').run();
  }
}
