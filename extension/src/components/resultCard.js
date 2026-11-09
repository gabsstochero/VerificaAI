import { el } from './dom.js';

const VERDICTS = {
  possivelmente_verdadeira: { label: 'Possivelmente verdadeira', className: 'verdict--true', icon: '✓' },
  possivelmente_falsa: { label: 'Possivelmente falsa', className: 'verdict--false', icon: '!' },
  nao_foi_possivel_verificar: { label: 'Não foi possível verificar', className: 'verdict--unsure', icon: '?' },
};

const EXCERPT_LENGTH = 140;
const SEGMENTS = 10;

/**
 * Desenha o resultado dentro de `container`.
 * result: { classification, confidence, explanation, checkPoints, sources }
 */
export function renderResult(container, { result, originalText, onReset }) {
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const checkPoints = Array.isArray(result.checkPoints) ? result.checkPoints : [];

  container.replaceChildren(
    ...[
      buildExcerpt(originalText),
      buildVerdict(result),
      buildExplanation(result.explanation),
      checkPoints.length ? buildCheckList(checkPoints) : null,
      sources.length ? buildSources(sources) : null,
      buildActions(onReset),
    ].filter(Boolean),
  );
}

function buildExcerpt(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const short = clean.length > EXCERPT_LENGTH ? `${clean.slice(0, EXCERPT_LENGTH).trimEnd()}…` : clean;

  return el('div', { className: 'excerpt' }, [
    el('p', { className: 'excerpt-label', text: 'Texto analisado' }),
    el('p', {}, [el('span', { className: 'marker', text: short })]),
  ]);
}

function buildVerdict(result) {
  const verdict = VERDICTS[result.classification] ?? VERDICTS.nao_foi_possivel_verificar;
  const confidence = Math.min(100, Math.max(0, Math.round(Number(result.confidence) || 0)));
  const filled = Math.round((confidence / 100) * SEGMENTS);

  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const seg = el('span', { className: `meter-seg${i < filled ? ' is-on' : ''}` });
    seg.style.setProperty('--i', String(i));
    return seg;
  });

  return el('div', { className: `verdict ${verdict.className}` }, [
    el('div', { className: 'verdict-head' }, [
      el('span', { className: 'verdict-icon', text: verdict.icon, attrs: { 'aria-hidden': 'true' } }),
      el('h2', { className: 'verdict-name', text: verdict.label }),
    ]),
    el('div', { className: 'meter' }, [
      el('div', { className: 'meter-label' }, [
        el('span', { text: 'Confiança da análise' }),
        el('span', { className: 'meter-value', text: `${confidence}%` }),
      ]),
      el('div', { className: 'meter-track', attrs: { role: 'img', 'aria-label': `Confiança da análise: ${confidence}%` } }, segments),
    ]),
  ]);
}

function buildExplanation(text) {
  return el('section', { className: 'block' }, [
    el('h3', { className: 'block-title', text: 'Explicação' }),
    el('p', { text }),
  ]);
}

function buildCheckList(points) {
  const items = points.map((point) =>
    el('li', {}, [
      el('label', { className: 'check' }, [
        el('input', { attrs: { type: 'checkbox' } }),
        el('span', { text: point }),
      ]),
    ]),
  );

  return el('section', { className: 'block' }, [
    el('h3', { className: 'block-title', text: 'Pontos para verificar' }),
    el('ul', { className: 'checklist' }, items),
  ]);
}

function buildSources(sources) {
  const items = sources.flatMap((source) => {
    let host;
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return [];
      host = url.hostname.replace(/^www\./, '');
    } catch {
      return [];
    }
    return [
      el('li', {}, [
        el('a', {
          text: source.title || host,
          attrs: { href: source.url, target: '_blank', rel: 'noopener noreferrer' },
        }),
        el('span', { className: 'source-host', text: host }),
      ]),
    ];
  });
  if (!items.length) return null;

  return el('section', { className: 'block' }, [
    el('h3', { className: 'block-title', text: 'Fontes consultadas pela IA' }),
    el('ul', { className: 'sources' }, items),
  ]);
}

function buildActions(onReset) {
  const button = el('button', { className: 'btn btn--ghost', text: 'Nova análise', attrs: { type: 'button' } });
  button.addEventListener('click', onReset);
  return el('div', { className: 'block' }, [button]);
}
