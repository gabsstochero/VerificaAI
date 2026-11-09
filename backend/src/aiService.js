import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import { buildResearchInstruction, buildSystemPrompt, buildUserMessage } from './prompt.js';
import { extractSources, normalizeResult, parseModelOutput } from './normalize.js';
import { mockAnalysis } from './mock.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const code = Number(err.status) || Number(err.code);
      if (code !== 503 || i >= tries - 1) throw err;
      await sleep(1500 * (i + 1));
    }
  }
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY não configurada.');
    this.name = 'MissingApiKeyError';
  }
}

let client;
function getClient() {
  if (!config.geminiApiKey) throw new MissingApiKeyError();
  // GEMINI_BASE_URL só existe para testes (apontar para um servidor simulado);
  // não é preciso defini-la em uso normal.
  const baseUrl = process.env.GEMINI_BASE_URL?.trim();
  client ??= new GoogleGenAI({
    apiKey: config.geminiApiKey,
    ...(baseUrl ? { httpOptions: { baseUrl } } : {}),
  });
  return client;
}

// A API do Gemini não permite combinar a ferramenta de busca com saída em JSON
// estrito na mesma chamada. Por isso a análise usa até duas chamadas:
// 1) pesquisa (texto livre, com busca no Google) — opcional, via USE_WEB_SEARCH;
// 2) classificação (JSON estrito, sem busca), usando o resumo da etapa 1.
const RESULT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    classificacao: {
      type: 'STRING',
      enum: ['possivelmente_verdadeira', 'possivelmente_falsa', 'nao_foi_possivel_verificar'],
    },
    confianca: { type: 'INTEGER' },
    explicacao: { type: 'STRING' },
    pontos_para_verificar: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['classificacao', 'confianca', 'explicacao', 'pontos_para_verificar'],
  propertyOrdering: ['classificacao', 'confianca', 'explicacao', 'pontos_para_verificar'],
};

/** Etapa 1 (opcional): pesquisa na web para reunir evidências sobre o texto. */
async function research(ai, text) {
  if (!process.env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY ausente');

  const query = text.replace(/\s+/g, ' ').trim().slice(0, 300);
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query, search_depth: 'basic', max_results: 6 }),
  });
  if (!res.ok) {
    const err = new Error(`Tavily ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const { results = [] } = await res.json();
  const notes = results.length
    ? 'Trechos de fontes encontradas na web para conferir as afirmações do texto:\n' +
      results
        .map((r) => `- [${new URL(r.url).hostname}] ${r.title}: ${String(r.content).slice(0, 400)}`)
        .join('\n')
    : 'A busca na web não retornou resultados relevantes.';

  const sources = results.slice(0, 5).map((r) => ({ title: r.title, url: r.url }));
  return { notes, sources };
}

/** Etapa 2: classifica o texto (com ou sem resumo de pesquisa) e devolve JSON estrito. */
async function classify(ai, text, researchNotes) {
  const response = await ai.models.generateContent({
    model: config.model,
    contents: buildUserMessage(text, researchNotes),
    config: {
      systemInstruction: buildSystemPrompt(),
      responseMimeType: 'application/json',
      responseSchema: RESULT_SCHEMA,
    },
  });

  return parseModelOutput(response.text);
}

/** Envia o texto à IA e devolve o resultado já normalizado. */
export async function analyzeText(text) {
  if (config.mockMode) return mockAnalysis(text);

  const ai = getClient();
  let researchNotes = '';
  let sources = [];

  if (config.useWebSearch) {
  try {
    const result = await research(ai, text);
    researchNotes = result.notes;
    sources = result.sources;
  } catch (err) {
    const code = Number(err.status) || Number(err.code);
    if (code !== 429 && code !== 503 && !(err instanceof TypeError)) throw err;
    console.warn(`[analyze] pesquisa indisponível (${err.message}); seguindo sem pesquisa.`);
  }
}

  const raw = await withRetry(() => classify(ai, text, researchNotes));
  return { ...normalizeResult(raw), sources };
}
