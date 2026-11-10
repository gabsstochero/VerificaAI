import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { analyzeText, MissingApiKeyError } from './aiService.js';
import { ModelOutputError } from './normalize.js';
import { rateLimit } from './rateLimit.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
// Página pública exigida pela Chrome Web Store.
app.get('/privacidade', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>VerificaAI – Política de Privacidade</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6;color:#222}h1{color:#1f2fa3}</style>
</head><body>
<h1>Política de Privacidade – VerificaAI</h1>
<p><em>Última atualização: 9 de novembro de 2026</em></p>

<h2>Quais dados coletamos</h2>
<p>A extensão VerificaAI coleta apenas o <strong>texto que você cola</strong> no campo de análise e envia ao clicar em "Analisar notícia". Não coletamos nome, e-mail, histórico de navegação, localização, conteúdo das páginas que você visita nem qualquer outro dado pessoal.</p>

<h2>Como usamos esses dados</h2>
<p>O texto é enviado ao nosso servidor exclusivamente para fazer a análise. O servidor repassa o texto para:</p>
<ul>
<li><strong>Google Gemini API</strong> (Google), que analisa o conteúdo;</li>
<li><strong>Tavily</strong>, serviço de busca usado para conferir as afirmações em fontes na web.</li>
</ul>
<p>Esses serviços processam o texto segundo as suas próprias políticas de privacidade.</p>

<h2>Armazenamento</h2>
<p>Não armazenamos os textos enviados nem os resultados das análises. Não há banco de dados, contas de usuário ou histórico. O endereço IP é usado apenas temporariamente, em memória, para limitar o número de análises por minuto e evitar abusos.</p>

<h2>Compartilhamento</h2>
<p>Não vendemos, alugamos nem compartilhamos seus dados com terceiros, exceto os serviços citados acima, que são necessários para a análise.</p>

<h2>Recomendação</h2>
<p>Evite colar no VerificaAI dados pessoais ou informações sensíveis, seus ou de outras pessoas.</p>

<h2>Contato</h2>
<p>Dúvidas: gabriellystochero@gmail.com</p>
</body></html>`);
});

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
