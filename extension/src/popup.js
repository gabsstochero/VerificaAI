import { CONFIG } from './config.js';
import { analyzeNews, AnalysisError } from './services/aiService.js';
import { renderResult } from './components/resultCard.js';
import { showError, clearError } from './components/errorBox.js';

const $ = (id) => document.getElementById(id);
const els = {
  inputSection: $('input-section'),
  loading: $('loading'),
  result: $('result'),
  error: $('error'),
  text: $('news-text'),
  hint: $('hint'),
  counter: $('counter'),
  analyzeBtn: $('analyze-btn'),
};

/** Mostra só uma das três telas: 'input' | 'loading' | 'result'. */
function setView(view) {
  els.inputSection.hidden = view !== 'input';
  els.loading.hidden = view !== 'loading';
  els.result.hidden = view !== 'result';
}

function updateForm() {
  const length = els.text.value.trim().length;
  const tooShort = length < CONFIG.MIN_CHARS;

  els.counter.textContent = `${els.text.value.length} / ${CONFIG.MAX_CHARS}`;
  els.hint.textContent = tooShort && length > 0 ? `Cole pelo menos ${CONFIG.MIN_CHARS} caracteres` : '';
  els.analyzeBtn.disabled = tooShort;
}

async function handleAnalyze() {
  const text = els.text.value.trim();
  if (text.length < CONFIG.MIN_CHARS) return;

  clearError(els.error);
  setView('loading');

  try {
    const result = await analyzeNews(text);
    renderResult(els.result, { result, originalText: text, onReset: handleReset });
    setView('result');
    els.result.focus();
  } catch (err) {
    // Volta para o formulário mantendo o texto, para o usuário tentar de novo.
    setView('input');
    showError(
      els.error,
      err instanceof AnalysisError ? err.message : 'Ocorreu um erro inesperado. Tente novamente.',
    );
  }
}

function handleReset() {
  els.text.value = '';
  els.result.replaceChildren();
  clearError(els.error);
  updateForm();
  setView('input');
  els.text.focus();
}

els.text.addEventListener('input', updateForm);
els.text.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') handleAnalyze();
});
els.analyzeBtn.addEventListener('click', handleAnalyze);

updateForm();
els.text.focus();
