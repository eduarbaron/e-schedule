import axios from 'axios';

// En desarrollo Vite proxia /api → localhost:8787 (ver vite.config.ts).
// En producción (Railway) se debe definir VITE_API_BASE_URL con la URL del worker
// de Cloudflare, ej: https://worker.tu-subdominio.workers.dev/api
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const api = axios.create({
  baseURL,
  // withCredentials:true es necesario para que el navegador envíe/reciba la
  // cookie HTTP-only de sesión en peticiones cross-origin (Railway ↔ Cloudflare).
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
