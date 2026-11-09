// Configurações da extensão. Para usar um backend hospedado, troque API_BASE_URL
// (e ajuste "host_permissions" no manifest.json).
export const CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  ANALYZE_PATH: '/api/analyze',
  REQUEST_TIMEOUT_MS: 90_000,
  // Mantenha em sincronia com backend/src/config.js
  MIN_CHARS: 30,
  MAX_CHARS: 8000,
};
