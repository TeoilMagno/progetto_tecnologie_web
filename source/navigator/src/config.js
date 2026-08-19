// config.js del NAVIGATOR (React)

// import.meta.env.DEV è una variabile magica di Vite.
// È true quando scrivi "npm run dev" (quindi sei su localhost:5173), 
// ma diventa false quando compili il progetto per la produzione.

export const BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:8000' 
  : window.location.origin;

export const API_BASE_URL = `${BASE_URL}/api`;

export const SOCKET_URL = BASE_URL;