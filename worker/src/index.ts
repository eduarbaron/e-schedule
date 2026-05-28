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
import proyeccionesClases from './routes/proyeccionesClases';
import dev from './routes/dev';

const app = new Hono<AppEnv>();

app.use('*', logger());

// CORS dinámico: lee ALLOWED_ORIGIN de la variable de entorno del worker.
// En desarrollo acepta localhost:5173; en producción usa el dominio Railway.
// credentials:true es necesario para que el navegador envíe la cookie HTTP-only.
app.use('*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
  return cors({
    origin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })(c, next);
});

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
app.route('/api/proyecciones-clases', proyeccionesClases);
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
