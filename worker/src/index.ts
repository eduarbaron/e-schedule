import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppEnv } from './types';
import { requireAuth, requireRole } from './middleware/auth';

// Rutas
import auth from './routes/auth';
import usuarios from './routes/usuarios';
import celulas from './routes/celulas';
import sedes from './routes/sedes';
import docentes from './routes/docentes';
import materias from './routes/materias';
import asignaciones from './routes/asignaciones';
import programas from './routes/programas';
import periodos from './routes/periodos';
import facultades from './routes/facultades';
import departamentos from './routes/departamentos';
import clases from './routes/clases';
import dev from './routes/dev';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));

// ─── Rutas públicas ───────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.route('/api/auth', auth);

// ─── Middleware de autenticación (aplica a todo /api/* excepto rutas públicas) ─
app.use('/api/*', requireAuth);

// ─── Rutas protegidas (coordinador o admin) ───────────────────────────────────
app.route('/api/celulas', celulas);
app.route('/api/sedes', sedes);
app.route('/api/docentes', docentes);
app.route('/api/materias', materias);
app.route('/api/asignaciones', asignaciones);
app.route('/api/programas', programas);
app.route('/api/periodos', periodos);
app.route('/api/facultades', facultades);
app.route('/api/departamentos', departamentos);
app.route('/api/clases', clases);

// ─── Rutas solo admin ────────────────────────────────────────────────────────
app.use('/api/usuarios/*', requireRole('admin'));
app.route('/api/usuarios', usuarios);

app.use('/api/dev/*', requireRole('admin'));
app.route('/api/dev', dev);

// ─── Errores ──────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Error interno del servidor', message: err.message }, 500);
});

export default app;
