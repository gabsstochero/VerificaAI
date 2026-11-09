import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { analyzeText, MissingApiKeyError } from './aiService.js';
import { ModelOutputError } from './normalize.js';
import { rateLimit } from './rateLimit.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

// Só a extensão pode usar este servidor: outros sites são bloqueados,
// assim ninguém consegue gastar seus créditos de API pelo navegador.
function isAllowedOrigin(origin) {
  if (!origin) return true; // curl, testes locais
  if (!origin.startsWith('chrome-extension://')) return false;
  return !config.allowedExtensionId || origin === `chrome-extension://${config.allowedExtensionId}`;
}

app.use((req, res, next) => {
  if (!isAllowedOrigin(req.headers.origin)) {
    return res.status(403).json({ error: 'Origem não permitida.' });
  }
  next();
});
app.use(cors());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mockMode: config.mockMode,
    webSearch: config.useWebSearch,
    apiKeyConfigured: Boolean(config.geminiApiKey),
  });
});

app.post('/api/analyze', rateLimit(), async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

  if (text.length < config.minChars) {
    return res.status(400).json({ error: `Envie um texto com pelo menos ${config.minChars} caracteres.` });
  }
  if (text.length > config.maxChars) {
    return res.status(400).json({ error: `O texto pode ter no máximo ${config.maxChars} caracteres.` });
  }

  try {
    res.json(await analyzeText(text));
  } catch (err) {
    const { status, message } = toHttpError(err);
    console.error(`[analyze] ${err.name}: ${err.message}`);
    res.status(status).json({ error: message });
  }
});

// O SDK do Gemini expõe o código HTTP ora em err.status, ora em err.code,
// dependendo da versão; conferimos os dois para não perder o caso.
function httpCodeOf(err) {
  return Number(err.status) || Number(err.code) || null;
}

function toHttpError(err) {
  if (err instanceof MissingApiKeyError) {
    return { status: 503, message: 'O servidor ainda não tem uma chave de API configurada. Veja o README.' };
  }
  if (err instanceof ModelOutputError) {
    return { status: 502, message: 'A IA respondeu em um formato inesperado. Tente analisar novamente.' };
  }
  const code = httpCodeOf(err);
  if (code === 401 || code === 403) {
    return { status: 502, message: 'A chave de API foi recusada. Confira o valor de GEMINI_API_KEY no servidor.' };
  }
  if (code === 429) {
    return { status: 429, message: 'O limite de uso gratuito da API de IA foi atingido. Tente novamente em instantes.' };
  }
  if (code === 404) {
    return { status: 502, message: 'O modelo configurado não foi encontrado. Confira GEMINI_MODEL no servidor.' };
  }
  return { status: 502, message: 'O serviço de IA está indisponível no momento. Tente novamente em instantes.' };
}

// Escuta só em 127.0.0.1: o servidor não fica acessível para outros dispositivos da rede.
app.listen(config.port, '0.0.0.0', () => {
  console.log(`VerificaAI backend em http://localhost:${config.port}`);
  if (config.mockMode) console.log('Modo demonstração ativo (MOCK_MODE=true): respostas simuladas.');
  else if (!config.geminiApiKey) console.warn('Atenção: GEMINI_API_KEY não definida. Veja o README.');
  else console.log(`Modelo: ${config.model} | Pesquisa na web: ${config.useWebSearch ? 'ligada' : 'desligada'}`);
});
