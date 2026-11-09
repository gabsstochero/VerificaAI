// Configurações da extensão. Se mudar API_BASE_URL, ajuste também "host_permissions" no manifest.json.
export const CONFIG = {
  API_BASE_URL: 'https://verificaai-9t7f.onrender.com',
  ANALYZE_PATH: '/api/analyze',
  REQUEST_TIMEOUT_MS: 90_000,
  // Mantenha em sincronia com backend/src/config.js
  MIN_CHARS: 30,
  MAX_CHARS: 8000,
};
