import { CONFIG } from '../config.js';

export class AnalysisError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
  }
}

/**
 * Envia o texto ao backend e devolve:
 * { classification, label, confidence, explanation, checkPoints, sources }
 * Lança AnalysisError com uma mensagem já pronta para o usuário.
 */
export async function analyzeNews(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ANALYZE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AnalysisError('A análise demorou mais do que o esperado. Tente novamente.', 'TIMEOUT');
    }
    throw new AnalysisError(
      'Não consegui falar com o serviço de análise. Ele pode estar iniciando: aguarde alguns segundos e tente novamente.',
      'NETWORK',
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* resposta sem JSON: tratada abaixo */
  }

  if (!response.ok) {
    throw new AnalysisError(
      data?.error || `O serviço de análise retornou um erro (${response.status}). Tente novamente.`,
      'API_ERROR',
    );
  }
  if (!data?.explanation) {
    throw new AnalysisError('O serviço de análise devolveu uma resposta incompleta. Tente novamente.', 'BAD_RESPONSE');
  }
  return data;
}
