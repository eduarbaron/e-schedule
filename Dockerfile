# ─── Stage 1: build ───────────────────────────────────────────────────────────
# Construye el frontend de forma aislada (sin el workspace del worker).
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de capas.
COPY frontend/package*.json ./
RUN npm ci

# Copiar el código fuente.
COPY frontend/ ./

# VITE_API_BASE_URL debe pasarse en tiempo de build, ej:
#   docker build --build-arg VITE_API_BASE_URL=https://worker.xxx.workers.dev/api
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ─── Stage 2: serve ───────────────────────────────────────────────────────────
# Imagen nginx mínima para servir los archivos estáticos.
FROM nginx:alpine

# Copiar los archivos compilados.
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar la configuración de nginx (con placeholder de puerto).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Script de inicio: sustituye PORT_PLACEHOLDER por la variable $PORT de Railway
# y arranca nginx en primer plano.
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

CMD ["/docker-entrypoint.sh"]
