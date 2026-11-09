import { el } from './dom.js';

export function showError(container, message) {
  container.replaceChildren(
    el('span', { className: 'error-icon', text: '!', attrs: { 'aria-hidden': 'true' } }),
    el('div', {}, [
      el('strong', { text: 'Não foi possível concluir a análise' }),
      el('p', { text: message }),
    ]),
  );
  container.hidden = false;
}

export function clearError(container) {
  container.replaceChildren();
  container.hidden = true;
}
