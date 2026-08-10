import type { RemoteAction } from './KeyMap';
import { focusMemory } from './FocusMemory';
import { scrollFocusedIntoView } from './scrollIntoView';
import { AppEvents, eventBus } from '@/state/EventBus';
import { logger } from '@/utils/logger';

export interface FocusNodeOptions {
  id: string;
  row?: string;
  scope?: string;
  onEnter?: () => void;
  onLongPress?: () => void;
}

type FocusableEl = HTMLElement & {
  __onEnter?: () => void;
  __onLongPress?: () => void;
};

/**
 * Spatial focus engine for TV remotes.
 * Nodes are marked with data-focusable="true" and data-focus-id.
 */
export class FocusEngine {
  private root: HTMLElement | null = null;
  private current: HTMLElement | null = null;
  private scope = 'app';

  setRoot(root: HTMLElement | null): void {
    this.root = root;
  }

  setScope(scope: string): void {
    this.scope = scope;
  }

  getCurrent(): HTMLElement | null {
    return this.current;
  }

  getCurrentId(): string | null {
    return this.current?.dataset.focusId ?? null;
  }

  register(el: HTMLElement, options: FocusNodeOptions): void {
    const node = el as FocusableEl;
    node.dataset.focusable = 'true';
    node.dataset.focusId = options.id;
    if (options.row) node.dataset.focusRow = options.row;
    if (options.scope) node.dataset.focusScope = options.scope;
    if (options.onEnter) {
      node.__onEnter = options.onEnter;
    } else {
      delete node.__onEnter;
    }
    if (options.onLongPress) {
      node.__onLongPress = options.onLongPress;
    } else {
      delete node.__onLongPress;
    }
    node.tabIndex = -1;
  }

  /** True when the focused node supports long-press (Enter hold). */
  currentHasLongPress(): boolean {
    return Boolean((this.current as FocusableEl | null)?.__onLongPress);
  }

  clearFocus(): void {
    if (this.current) {
      this.current.classList.remove('is-focused');
      this.current = null;
    }
  }

  focus(el: HTMLElement | null): void {
    if (!el) return;
    if (this.current === el) return;

    if (this.current) this.current.classList.remove('is-focused');
    this.current = el;
    el.classList.add('is-focused');
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
    scrollFocusedIntoView(el);

    const id = el.dataset.focusId;
    const row = el.dataset.focusRow;
    if (id && row) {
      focusMemory.remember(`${this.scope}:${row}`, id);
    }
    if (id) {
      focusMemory.remember(this.scope, id);
    }

    eventBus.emit(AppEvents.FOCUS_CHANGE, { id, row });
  }

  focusById(id: string): boolean {
    const el = this.query().find((n) => n.dataset.focusId === id);
    if (!el) return false;
    this.focus(el);
    return true;
  }

  focusDefault(preferredId?: string): void {
    if (preferredId && this.focusById(preferredId)) return;
    const remembered = focusMemory.recall(this.scope);
    if (remembered && this.focusById(remembered)) return;
    const first = this.query()[0];
    if (first) this.focus(first);
  }

  handleAction(action: RemoteAction): boolean {
    if (!this.current) {
      this.focusDefault();
      return true;
    }

    if (action === 'longPress') {
      const onLongPress = (this.current as FocusableEl).__onLongPress;
      if (onLongPress) {
        onLongPress();
        return true;
      }
      return false;
    }

    if (action === 'enter') {
      const onEnter = (this.current as FocusableEl).__onEnter;
      if (onEnter) {
        onEnter();
        return true;
      }
      this.current.click();
      return true;
    }

    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      const next = this.findNeighbor(this.current, action);
      if (next) {
        this.focus(next);
        return true;
      }
      return true; // consume to avoid page scroll jump
    }

    return false;
  }

  private query(): HTMLElement[] {
    if (!this.root) return [];
    return Array.from(
      this.root.querySelectorAll<HTMLElement>('[data-focusable="true"]'),
    ).filter((el) => {
      if (el.dataset.focusDisabled === 'true') return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  private findNeighbor(current: HTMLElement, dir: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
    const candidates = this.query().filter((n) => n !== current);
    if (!candidates.length) return null;

    const cur = current.getBoundingClientRect();
    const row = current.dataset.focusRow;

    // Horizontal: stay in-row only (no wrap / no jump to other rows)
    if ((dir === 'left' || dir === 'right') && row) {
      const sameRow = candidates.filter((n) => n.dataset.focusRow === row);
      return this.pickInDirection(cur, sameRow, dir);
    }

    // Vertical: prefer in-row (e.g. episode lists), else first item of nearest row
    if ((dir === 'up' || dir === 'down') && row) {
      const sameRow = candidates.filter((n) => n.dataset.focusRow === row);
      const inRow = this.pickInDirection(cur, sameRow, dir);
      if (inRow) return inRow;
      return this.pickFirstInAdjacentRow(current, candidates, dir);
    }

    return this.pickInDirection(cur, candidates, dir);
  }

  /** Previous/next focus row in DOM order, landing on its first item. */
  private pickFirstInAdjacentRow(
    current: HTMLElement,
    _candidates: HTMLElement[],
    dir: 'up' | 'down',
  ): HTMLElement | null {
    const currentRow = current.dataset.focusRow;
    if (!currentRow) return null;

    // DOM order is stable even with a sticky topbar (viewport Y would skip the hero).
    const rowOrder: string[] = [];
    for (const el of this.query()) {
      const r = el.dataset.focusRow;
      if (r && !rowOrder.includes(r)) rowOrder.push(r);
    }

    const idx = rowOrder.indexOf(currentRow);
    if (idx < 0) return null;

    if (dir === 'up') {
      for (let i = idx - 1; i >= 0; i--) {
        const target = this.firstInRow(rowOrder[i]);
        if (target) return target;
      }
    } else {
      for (let i = idx + 1; i < rowOrder.length; i++) {
        const target = this.firstInRow(rowOrder[i]);
        if (target) return target;
      }
    }
    return null;
  }

  private firstInRow(row: string): HTMLElement | null {
    type RailHost = HTMLElement & { __prepareRailFocus?: (index: number) => HTMLElement | null };
    const rail = Array.from(
      this.root?.querySelectorAll<RailHost>('[data-rail-id]') ?? [],
    ).find((el) => el.dataset.railId === row);
    const prepared = rail?.__prepareRailFocus?.(0);
    if (prepared) return prepared;

    const inRow = this.query().filter((n) => n.dataset.focusRow === row);
    if (!inRow.length) return null;
    return inRow.reduce((best, el) =>
      el.getBoundingClientRect().left < best.getBoundingClientRect().left ? el : best,
    );
  }

  private pickInDirection(
    cur: DOMRect,
    candidates: HTMLElement[],
    dir: 'up' | 'down' | 'left' | 'right',
  ): HTMLElement | null {
    const cx = cur.left + cur.width / 2;
    const cy = cur.top + cur.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;

    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;

      let primary = 0;
      let secondary = 0;
      let valid = false;

      if (dir === 'left' && ex < cx - 4) {
        valid = true;
        primary = cx - ex;
        secondary = Math.abs(cy - ey);
      } else if (dir === 'right' && ex > cx + 4) {
        valid = true;
        primary = ex - cx;
        secondary = Math.abs(cy - ey);
      } else if (dir === 'up' && ey < cy - 4) {
        valid = true;
        primary = cy - ey;
        secondary = Math.abs(cx - ex);
      } else if (dir === 'down' && ey > cy + 4) {
        valid = true;
        primary = ey - cy;
        secondary = Math.abs(cx - ex);
      }

      if (!valid) continue;
      // Weight secondary axis so we prefer aligned items
      const score = primary + secondary * 2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (!best) {
      logger.debug('Focus', `no neighbor for ${dir}`);
    }
    return best;
  }
}

export const focusEngine = new FocusEngine();

/** Pure helper exported for unit tests — nearest candidate scoring. */
export function scoreNeighbor(
  cur: { x: number; y: number },
  other: { x: number; y: number },
  dir: 'up' | 'down' | 'left' | 'right',
): number | null {
  const { x: cx, y: cy } = cur;
  const { x: ex, y: ey } = other;
  if (dir === 'left' && ex < cx - 4) return cx - ex + Math.abs(cy - ey) * 2;
  if (dir === 'right' && ex > cx + 4) return ex - cx + Math.abs(cy - ey) * 2;
  if (dir === 'up' && ey < cy - 4) return cy - ey + Math.abs(cx - ex) * 2;
  if (dir === 'down' && ey > cy + 4) return ey - cy + Math.abs(cx - ex) * 2;
  return null;
}
