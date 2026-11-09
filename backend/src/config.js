import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const bool = (value, fallback) =>
  value === undefined || value === '' ? fallback : value.toLowerCase() === 'true';

export const config = {
  port: Number(process.env.PORT) || 3000,
  geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
  // Alias que sempre aponta para o Gemini Flash estável mais recente.
  model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  useWebSearch: bool(process.env.USE_WEB_SEARCH, true),
  mockMode: bool(process.env.MOCK_MODE, false),
  allowedExtensionId: process.env.ALLOWED_EXTENSION_ID?.trim() || '',
  // Mantenha em sincronia com extension/src/config.js
  minChars: 30,
  maxChars: 8000,
};
