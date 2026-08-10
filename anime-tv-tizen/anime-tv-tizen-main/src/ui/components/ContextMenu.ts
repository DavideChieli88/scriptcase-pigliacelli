import { el, setText } from '../mount';
import { focusEngine } from '@/navigation/FocusEngine';
import { remoteInput } from '@/navigation/RemoteInput';

export interface ContextMenuAction {
  id: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

export interface ContextMenuOptions {
  title: string;
  subtitle?: string;
  actions: ContextMenuAction[];
  /** Called when the menu closes for any reason (after DOM teardown). */
  onClose?: () => void;
  /** Host to append the overlay (defaults to document.body). */
  host?: HTMLElement;
  /** Focus root to restore when the menu closes. */
  previousRoot: HTMLElement;
  previousScope?: string;
  previousFocusId?: string | null;
}

export interface ContextMenuHandle {
  close: () => void;
}

/**
 * TV-friendly action menu: dimmed overlay + centered panel with focusable rows.
 * Back dismisses; same remote/focus pattern as Modal.
 */
export function openContextMenu(options: ContextMenuOptions): ContextMenuHandle {
  const host = options.host ?? document.body;
  const previousRoot = options.previousRoot;
  const previousScope = options.previousScope;
  const previousFocusId = options.previousFocusId ?? null;

  const overlay = el('div', 'context-menu-overlay');
  // Avoid `inset` — unsupported on Chromium M85 (Tizen 6.5).
  overlay.style.cssText =
    'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:50;';

  const panel = el('div', 'context-menu');
  const heading = el('h2', 'context-menu__title');
  setText(heading, options.title);
  panel.appendChild(heading);

  if (options.subtitle) {
    const sub = el('p', 'context-menu__subtitle');
    setText(sub, options.subtitle);
    panel.appendChild(sub);
  }

  const list = el('div', 'context-menu__actions');
  let closed = false;
  let unsub: (() => void) | null = null;

  const close = (): void => {
    if (closed) return;
    closed = true;
    unsub?.();
    unsub = null;
    overlay.remove();
    focusEngine.setRoot(previousRoot);
    if (previousScope) focusEngine.setScope(previousScope);
    focusEngine.focusDefault(previousFocusId || undefined);
    options.onClose?.();
  };

  for (const action of options.actions) {
    const btn = el(
      'button',
      action.danger ? 'btn btn--ghost context-menu__action context-menu__action--danger' : 'btn btn--ghost context-menu__action',
    );
    setText(btn, action.label);
    const run = (): void => {
      close();
      action.onSelect();
    };
    focusEngine.register(btn, {
      id: `ctx-${action.id}`,
      row: 'context-menu',
      onEnter: run,
    });
    btn.addEventListener('click', run);
    list.appendChild(btn);
  }

  const cancel = el('button', 'btn btn--ghost context-menu__action');
  setText(cancel, 'Annulla');
  focusEngine.register(cancel, {
    id: 'ctx-cancel',
    row: 'context-menu',
    onEnter: close,
  });
  cancel.addEventListener('click', close);
  list.appendChild(cancel);

  panel.appendChild(list);
  overlay.appendChild(panel);
  host.appendChild(overlay);

  focusEngine.setRoot(overlay);
  const firstId = options.actions[0] ? `ctx-${options.actions[0].id}` : 'ctx-cancel';
  focusEngine.focusDefault(firstId);

  unsub = remoteInput.push((action) => {
    if (action === 'back') {
      close();
      return true;
    }
    return focusEngine.handleAction(action);
  });

  return { close };
}
