import { el, setText } from '../mount';
import { focusEngine } from '@/navigation/FocusEngine';

export function createEmptyState(
  title: string,
  text: string,
  actionLabel?: string,
  onAction?: () => void,
): HTMLElement {
  const box = el('div', 'empty-state');
  if (title) {
    const h = el('h2', 'empty-state__title');
    setText(h, title);
    box.appendChild(h);
  }
  const p = el('p', 'empty-state__text');
  setText(p, text);
  box.appendChild(p);

  if (actionLabel && onAction) {
    const btn = el('button', 'btn btn--primary');
    setText(btn, actionLabel);
    focusEngine.register(btn, {
      id: 'empty-action',
      row: 'empty',
      onEnter: onAction,
    });
    btn.addEventListener('click', onAction);
    box.appendChild(btn);
  }
  return box;
}
