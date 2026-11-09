/**
 * Converte a saída bruta da IA em um objeto confiável para a extensão.
 * Não depende de rede: por isso é fácil de testar (npm test).
 */

export const CLASSIFICATIONS = {
  possivelmente_verdadeira: 'Possivelmente verdadeira',
  possivelmente_falsa: 'Possivelmente falsa',
  nao_foi_possivel_verificar: 'Não foi possível verificar',
};

const DEFAULT_CHECK_POINTS = [
  'Verificar a fonte original da informação.',
  'Procurar a mesma informação em veículos jornalísticos confiáveis.',
  'Conferir a data da publicação.',
  'Verificar se existem fontes oficiais sobre o assunto.',
];

export class ModelOutputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModelOutputError';
  }
}

/** Extrai o primeiro objeto JSON de um texto (tolera ```json e texto extra). */
export function extractJson(text) {
  const cleaned = String(text ?? '').replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** O Gemini, com responseSchema, normalmente devolve JSON puro; isto cobre os casos em que não devolve. */
export function parseModelOutput(text) {
  const parsed = extractJson(text);
  if (!parsed) throw new ModelOutputError('A IA não retornou um JSON válido.');
  return parsed;
}

function toClassificationKey(value) {
  const key = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  // Qualquer valor inesperado vira "não foi possível verificar": o mais prudente.
  return key in CLASSIFICATIONS ? key : 'nao_foi_possivel_verificar';
}

function toConfidence(value) {
  let n = Number(String(value ?? '').replace('%', '').replace(',', '.'));
  if (!Number.isFinite(n)) return 50;
  if (n > 0 && n <= 1) n *= 100; // aceita 0.82 como 82%
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function normalizeResult(raw) {
  const explanation = typeof raw?.explicacao === 'string' ? raw.explicacao.trim() : '';
  if (!explanation) throw new ModelOutputError('A resposta da IA não trouxe uma explicação.');

  const classification = toClassificationKey(raw.classificacao);

  const checkPoints = (Array.isArray(raw.pontos_para_verificar) ? raw.pontos_para_verificar : [])
    .filter((p) => typeof p === 'string' && p.trim())
    .map((p) => p.trim())
    .slice(0, 6);

  return {
    classification,
    label: CLASSIFICATIONS[classification],
    confidence: toConfidence(raw.confianca),
    explanation,
    checkPoints: checkPoints.length ? checkPoints : DEFAULT_CHECK_POINTS,
  };
}

function isHttpUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Lê as fontes de uma resposta do Gemini (candidates[0].groundingMetadata.groundingChunks).
 * Aceita tanto o objeto de resposta do SDK quanto o array de chunks diretamente (útil em testes).
 */
export function extractSources(responseOrChunks, limit = 5) {
  const chunks = Array.isArray(responseOrChunks)
    ? responseOrChunks
    : (responseOrChunks?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []);

  const unique = new Map();
  for (const chunk of chunks) {
    const web = chunk?.web;
    if (!web?.uri || !isHttpUrl(web.uri) || unique.has(web.uri)) continue;
    let host = web.uri;
    try {
      host = new URL(web.uri).hostname;
    } catch {
      /* mantém a URL como título de reserva */
    }
    unique.set(web.uri, { title: (web.title || host).trim(), url: web.uri });
  }
  return [...unique.values()].slice(0, limit);
}
