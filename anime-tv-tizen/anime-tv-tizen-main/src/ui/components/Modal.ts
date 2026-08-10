import { el, setText } from '../mount';
import { focusEngine } from '@/navigation/FocusEngine';

/** Lightweight confirm/action overlay — no ads, no external widgets. */
export function createModal(options: {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}): HTMLElement {
  const overlay = el('div', 'modal-overlay');
  // Avoid `inset` — unsupported on Chromium M85 (Tizen 6.5); overlay would collapse top-left.
  overlay.style.cssText =
    'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:50;';

  const panel = el('div', 'modal-panel');
  panel.style.cssText =
    'background:var(--color-surface);padding:48px;border-radius:12px;max-width:720px;min-width:480px;';

  const h = el('h2');
  setText(h, options.title);
  const p = el('p');
  setText(p, options.text);
  p.style.color = 'var(--color-text-muted)';

  const actions = el('div');
  actions.style.cssText = 'display:flex;gap:24px;margin-top:32px;';

  const confirm = el('button', 'btn btn--primary');
  setText(confirm, options.confirmLabel);
  focusEngine.register(confirm, {
    id: 'modal-confirm',
    row: 'modal',
    onEnter: options.onConfirm,
  });
  confirm.addEventListener('click', options.onConfirm);

  actions.appendChild(confirm);

  if (options.cancelLabel && options.onCancel) {
    const cancel = el('button', 'btn btn--ghost');
    setText(cancel, options.cancelLabel);
    focusEngine.register(cancel, {
      id: 'modal-cancel',
      row: 'modal',
      onEnter: options.onCancel,
    });
    cancel.addEventListener('click', options.onCancel);
    actions.appendChild(cancel);
  }

  panel.appendChild(h);
  panel.appendChild(p);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  return overlay;
}
