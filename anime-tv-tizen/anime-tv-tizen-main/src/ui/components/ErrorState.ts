import { el, setText } from '../mount';
import { focusEngine } from '@/navigation/FocusEngine';

export function createErrorState(
  title: string,
  text: string,
  onRetry?: () => void,
  onAlt?: { label: string; action: () => void },
): HTMLElement {
  const box = el('div', 'error-state');
  const h = el('h2', 'error-state__title');
  setText(h, title);
  const p = el('p', 'error-state__text');
  setText(p, text);
  box.appendChild(h);
  box.appendChild(p);

  if (onRetry) {
    const retry = el('button', 'btn btn--primary');
    setText(retry, 'Riprova');
    focusEngine.register(retry, {
      id: 'error-retry',
      row: 'error',
      onEnter: onRetry,
    });
    retry.addEventListener('click', onRetry);
    box.appendChild(retry);
  }

  if (onAlt) {
    const alt = el('button', 'btn btn--ghost');
    setText(alt, onAlt.label);
    focusEngine.register(alt, {
      id: 'error-alt',
      row: 'error',
      onEnter: onAlt.action,
    });
    alt.addEventListener('click', onAlt.action);
    box.appendChild(alt);
  }

  return box;
}
