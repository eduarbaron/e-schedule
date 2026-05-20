# Plan de autenticacion y autorizacion

## Objetivo

Agregar autenticacion y autorizacion a e-Schedule con dos roles:

- `admin`: puede usar toda la plataforma y administrar usuarios coordinadores.
- `coordinador`: puede usar la plataforma operativa actual, pero no puede crear, editar o eliminar usuarios.

La autorizacion debe aplicarse en backend. El frontend solo debe ocultar o simplificar acciones, pero no debe ser la barrera real de seguridad.

## Alcance funcional

### Admin

- Iniciar sesion.
- Ver dashboard, docentes, sedes, celulas, programas, periodos, facultades, materias, clases, plantillas, horario, asignaciones, mapa y documentacion.
- Ejecutar todas las acciones operativas actuales.
- Crear coordinadores.
- Ver lista de usuarios.
- Activar o desactivar coordinadores.
- Cambiar rol de un usuario solo si se decide permitirlo. Recomendacion inicial: no permitir cambio de rol desde UI, solo crear coordinadores.
- Restablecer contrasena de coordinadores.

### Coordinador

- Iniciar sesion.
- Usar toda la plataforma operativa actual.
- No ver ni usar administracion de usuarios.
- No crear usuarios.
- No modificar usuarios.

## Decisiones recomendadas

### Modelo de sesion

Usar sesion por cookie HTTP-only firmada o token de sesion almacenado en cookie HTTP-only.

Recomendacion para esta arquitectura Cloudflare Worker + React:

- Tabla `usuarios`.
- Tabla `sesiones`.
- Cookie `eschedule_session` con un token aleatorio opaco.
- El Worker busca la sesion en D1 y resuelve el usuario.
- No guardar JWT en localStorage.

Motivo:

- Evita exponer tokens a JavaScript.
- Permite cerrar sesiones desde backend.
- Permite expirar sesiones por fecha.
- Es simple de auditar.

### Password hashing

Usar hashing con `PBKDF2` mediante Web Crypto disponible en Workers.

Configuracion recomendada:

- Salt aleatorio por usuario.
- 210000 iteraciones o valor conservador compatible con latencia del Worker.
- SHA-256.
- Guardar `password_hash`, `password_salt`, `password_iterations`.

Nota: si luego migramos a un runtime con soporte Argon2 o bcrypt confiable, se puede versionar el algoritmo con una columna `password_algo`.

### Usuario admin inicial

Necesitamos evitar quedarnos sin usuario administrador.

Opciones:

1. Migracion seed con admin inicial temporal.
2. Endpoint de bootstrap disponible solo si no existe ningun usuario.

Recomendacion:

- Crear endpoint `POST /api/auth/bootstrap-admin`.
- Solo funciona si `SELECT COUNT(*) FROM usuarios = 0`.
- Recibe nombre, email y password.
- Crea el primer usuario con rol `admin`.
- Despues de creado el primer usuario, devuelve `409` para cualquier intento futuro.

Esto evita dejar credenciales fijas en migraciones.

## Modelo de datos

### Nueva tabla `usuarios`

```sql
CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'coordinador')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 210000,
  activo INTEGER NOT NULL DEFAULT 1,
  ultimo_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
```

### Nueva tabla `sesiones`

```sql
CREATE TABLE sesiones (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX idx_sesiones_expires ON sesiones(expires_at);
```

Notas:

- Guardar hash del token, no el token plano.
- La cookie lleva el token plano.
- Si se filtra la base de datos, no se pueden usar directamente las sesiones.

## Endpoints backend

### Auth

#### `POST /api/auth/bootstrap-admin`

Uso:

- Crear primer administrador.
- Permitido solo si no existe ningun usuario.

Body:

```json
{
  "nombre": "Administrador",
  "email": "admin@dominio.com",
  "password": "..."
}
```

Respuesta:

```json
{
  "success": true,
  "usuario": {
    "id": "...",
    "nombre": "...",
    "email": "...",
    "rol": "admin"
  }
}
```

#### `POST /api/auth/login`

Body:

```json
{
  "email": "admin@dominio.com",
  "password": "..."
}
```

Acciones:

- Validar credenciales.
- Validar `activo = 1`.
- Crear sesion.
- Setear cookie HTTP-only.
- Actualizar `ultimo_login_at`.

#### `POST /api/auth/logout`

Acciones:

- Revocar sesion actual.
- Borrar cookie.

#### `GET /api/auth/me`

Devuelve usuario autenticado:

```json
{
  "id": "...",
  "nombre": "...",
  "email": "...",
  "rol": "admin"
}
```

### Usuarios

Todos estos endpoints requieren rol `admin`.

#### `GET /api/usuarios`

Lista usuarios.

#### `POST /api/usuarios`

Crea coordinador.

Body:

```json
{
  "nombre": "Coordinador",
  "email": "coordinador@dominio.com",
  "password": "..."
}
```

Regla inicial:

- Solo crea usuarios con rol `coordinador`.
- No permitir crear otros admins desde UI al inicio.

#### `PATCH /api/usuarios/:id/activo`

Activa o desactiva usuario.

Body:

```json
{
  "activo": true
}
```

#### `PATCH /api/usuarios/:id/password`

Restablece contrasena.

Body:

```json
{
  "password": "..."
}
```

## Middleware backend

Crear helpers:

- `getSessionToken(c)`: lee cookie.
- `hashSessionToken(token)`: SHA-256.
- `getCurrentUser(c)`: busca sesion activa y usuario activo.
- `requireAuth(c, next)`: exige usuario autenticado.
- `requireRole(['admin'])`: exige rol especifico.

### Rutas publicas

- `GET /api/health`
- `POST /api/auth/bootstrap-admin`
- `POST /api/auth/login`
- Posiblemente assets del frontend.

### Rutas protegidas

Todas las rutas `/api/*` excepto las publicas deben requerir usuario autenticado.

Rutas solo admin:

- `/api/usuarios/*`

Rutas coordinador o admin:

- Todas las rutas operativas existentes.

## Frontend

### Estado de autenticacion

Crear `AuthProvider` con:

- `user`
- `isLoading`
- `login(email, password)`
- `logout()`
- `refreshMe()`
- `isAdmin`

Llamar `GET /api/auth/me` al cargar la app.

### Pantallas nuevas

#### Login

Ruta o vista inicial si no hay sesion.

Campos:

- Email
- Password
- Boton ingresar
- Estado de error claro

#### Bootstrap admin

Si `GET /api/auth/me` falla y `GET /api/auth/bootstrap-status` indica que no hay usuarios, mostrar pantalla para crear primer admin.

Alternativa simple:

- Intentar login normal.
- Tener una pantalla manual `Crear primer administrador` si no hay usuarios.

Recomendacion: agregar endpoint `GET /api/auth/bootstrap-status`:

```json
{
  "needs_bootstrap": true
}
```

#### Usuarios

Nueva pagina visible solo para admin:

- Tabla de usuarios.
- Crear coordinador.
- Activar/desactivar.
- Restablecer contrasena.

Menu:

- Grupo `Administracion`.
- Item `Usuarios`.
- Visible solo si `user.rol === 'admin'`.

### Ajuste de navegacion

El layout principal debe vivir dentro de `AuthProvider`.

Flujo:

1. App carga.
2. Si ruta es `/docs`, mostrar documentacion publica o decidir si requiere sesion.
3. Si no hay usuario, mostrar login/bootstrap.
4. Si hay usuario, mostrar plataforma.

Decision pendiente:

- Documentacion puede ser publica o protegida.
- Recomendacion: publica por ahora, porque no expone datos sensibles, solo guia funcional y capturas.

## Seguridad y validaciones

### Password

Validaciones minimas:

- Minimo 10 caracteres.
- Al menos una letra.
- Al menos un numero.

No forzar reglas excesivas al inicio.

### Cookies

Cookie recomendada:

```text
eschedule_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800
```

En desarrollo local, `Secure` puede omitirse si causa problemas en `http://127.0.0.1`.

Implementar helper que active `Secure` cuando `c.req.url` sea HTTPS.

### Expiracion

Sesion inicial:

- 8 horas.

Pendiente futuro:

- Renovacion deslizante.
- Recordar dispositivo.

### Auditoria futura

No necesaria para primera version, pero recomendable despues:

- Tabla `audit_log`.
- Registrar login, logout, creacion de usuarios, cambios de estado y acciones destructivas.

## Cambios en API existente

Todas las rutas actuales deben pasar por `requireAuth`.

Puntos de cuidado:

- Herramientas de desarrollo `/api/dev/*`: deben ser solo `admin`.
- Borrar clases filtradas: `admin` y `coordinador` si el coordinador conserva todo lo actual.
- Borrar asignaciones: `admin` y `coordinador`.
- Generar clases: `admin` y `coordinador`.
- Exportar reportes desde frontend no requiere endpoint nuevo si usa datos ya autorizados.

## Fases de implementacion

### Fase 1: Base segura

- Crear migracion `usuarios` y `sesiones`.
- Crear utilidades de hashing password y sesion.
- Crear rutas `/api/auth/*`.
- Crear middleware `requireAuth` y `requireRole`.
- Proteger rutas API.
- Crear bootstrap admin.
- Validar con requests manuales.

### Fase 2: Login frontend

- Crear `AuthProvider`.
- Crear pantalla Login.
- Crear pantalla Bootstrap Admin.
- Integrar logout en header.
- Proteger app si no hay usuario.

### Fase 3: Usuarios admin

- Crear rutas `/api/usuarios`.
- Crear pagina `Usuarios`.
- Agregar item en sidebar visible solo admin.
- Crear coordinador.
- Activar/desactivar.
- Restablecer contrasena.

### Fase 4: Pulido y QA

- Validar que coordinador no vea Usuarios.
- Validar que coordinador no pueda llamar `/api/usuarios` por API.
- Validar que `/api/dev/*` solo sea admin.
- Validar expiracion de sesion.
- Validar logout.
- Validar refresh en rutas internas.
- Validar `/docs`.

## Casos de prueba

### Backend

- Login con credenciales correctas.
- Login con password incorrecta.
- Login usuario inactivo.
- `GET /api/auth/me` sin cookie devuelve 401.
- `GET /api/auth/me` con sesion valida devuelve usuario.
- Coordinador no puede acceder a `/api/usuarios`.
- Admin puede crear coordinador.
- Usuario desactivado pierde acceso.
- Logout revoca sesion.

### Frontend

- App sin sesion muestra login.
- Primer uso muestra bootstrap admin.
- Admin ve menu Usuarios.
- Coordinador no ve menu Usuarios.
- Logout vuelve al login.
- Refresh conserva sesion.
- Sesion expirada lleva a login.

## Riesgos

- Implementar auth solo en frontend seria inseguro. Debe hacerse en backend.
- Usar localStorage para token aumenta riesgo XSS. Preferir cookie HTTP-only.
- Crear admin por migracion con password fijo es riesgoso. Preferir bootstrap unico.
- Si se protege `/docs`, hay que manejar refresh en esa ruta; si se deja publica, es mas simple.
- D1 no tiene transacciones tradicionales visibles como una DB server full; usar `batch` para operaciones relacionadas.

## Estimacion

Implementacion completa y probada:

- Backend auth + migraciones: 2 a 3 horas.
- Frontend login/bootstrap: 1.5 a 2 horas.
- Admin usuarios: 1.5 a 2 horas.
- QA y ajustes: 1 a 2 horas.

Total realista: 6 a 9 horas.

Version minima sin pulido: 3 a 4 horas, pero no recomendada para seguridad.

## Recomendacion

No hacerlo como cierre rapido. Tratarlo como el siguiente bloque grande del proyecto.

Orden recomendado:

1. Backend seguro.
2. Login y sesion en frontend.
3. Pagina de usuarios admin.
4. QA de roles y rutas protegidas.
