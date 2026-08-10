import { mapKeyCode, type RemoteAction } from './KeyMap';
import { focusEngine } from './FocusEngine';
import { APP_CONFIG } from '@/app/config';
import { logger } from '@/utils/logger';

export type RemoteHandler = (action: RemoteAction, event: KeyboardEvent) => boolean | void;

/** True when key events should edit text instead of driving TV navigation. */
export function isTextEditingElement(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled;
  }
  return Boolean(el.isContentEditable);
}

/**
 * Central remote/keyboard listener.
 * Handlers are invoked from top of stack (LIFO) so pages can intercept before global.
 *
 * Enter with `__onLongPress` on the focused node is deferred: short release → enter,
 * hold past `APP_CONFIG.longPressMs` → longPress.
 */
export class RemoteInput {
  private readonly handlers: RemoteHandler[] = [];
  private lastKeyAt = 0;
  private bound = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private enterDeferred = false;
  private longPressFired = false;

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private cancelDeferredEnter(): void {
    this.clearLongPressTimer();
    this.enterDeferred = false;
  }

  private dispatch(action: RemoteAction, event: KeyboardEvent): void {
    logger.debug('Remote', `action=${action} keyCode=${event.keyCode}`);

    for (let i = this.handlers.length - 1; i >= 0; i--) {
      const handled = this.handlers[i](action, event);
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const keyCode = event.keyCode || event.which;
    const action = mapKeyCode(keyCode);
    if (action === 'unknown') return;

    const editing =
      isTextEditingElement(event.target) || isTextEditingElement(document.activeElement);

    // Backspace (8) is mapped to Back for remotes, but must delete chars in inputs.
    if (editing && keyCode === 8) {
      return;
    }

    // Let caret move / exit field without stealing focus for spatial nav.
    if (editing && (action === 'left' || action === 'right' || action === 'up' || action === 'down')) {
      return;
    }

    // Escape / remote Back while typing: blur field, stay on page.
    if (editing && action === 'back') {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Another key while Enter is held cancels a pending long-press without firing enter.
    if (this.enterDeferred && action !== 'enter') {
      this.cancelDeferredEnter();
    }

    // Defer Enter when the focused node supports long-press.
    if (action === 'enter' && !editing && focusEngine.currentHasLongPress()) {
      if (event.repeat || this.enterDeferred) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      this.enterDeferred = true;
      this.longPressFired = false;
      this.longPressTimer = setTimeout(() => {
        this.longPressTimer = null;
        this.longPressFired = true;
        this.enterDeferred = false;
        this.dispatch('longPress', event);
      }, APP_CONFIG.longPressMs);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const now = Date.now();
    // Soft-ignore ultra-fast hardware repeats for directionals to keep focus stable
    if (
      (action === 'up' || action === 'down' || action === 'left' || action === 'right') &&
      now - this.lastKeyAt < APP_CONFIG.keyRepeatIgnoreMs
    ) {
      event.preventDefault();
      return;
    }
    this.lastKeyAt = now;

    this.dispatch(action, event);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const keyCode = event.keyCode || event.which;
    const action = mapKeyCode(keyCode);
    if (action !== 'enter') return;

    if (this.longPressFired) {
      this.longPressFired = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!this.enterDeferred) return;

    this.clearLongPressTimer();
    this.enterDeferred = false;
    this.dispatch('enter', event);
  };

  start(): void {
    if (this.bound) return;
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('keyup', this.onKeyUp, true);
    this.bound = true;
  }

  stop(): void {
    if (!this.bound) return;
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('keyup', this.onKeyUp, true);
    this.cancelDeferredEnter();
    this.longPressFired = false;
    this.bound = false;
  }

  push(handler: RemoteHandler): () => void {
    this.handlers.push(handler);
    return () => this.remove(handler);
  }

  remove(handler: RemoteHandler): void {
    const idx = this.handlers.indexOf(handler);
    if (idx >= 0) this.handlers.splice(idx, 1);
  }
}

export const remoteInput = new RemoteInput();
