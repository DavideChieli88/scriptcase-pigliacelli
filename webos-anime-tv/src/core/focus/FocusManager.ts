export type FocusDirection = 'up' | 'down' | 'left' | 'right';

export interface FocusNode {
  id: string;
  el: HTMLElement;
  group?: string;
  row?: number;
  col?: number;
}

export class FocusMemory {
  private memory = new Map<string, string>();

  save(scope: string, focusId: string): void {
    this.memory.set(scope, focusId);
  }

  restore(scope: string): string | undefined {
    return this.memory.get(scope);
  }

  clear(scope?: string): void {
    if (scope) this.memory.delete(scope);
    else this.memory.clear();
  }
}

export class FocusGraph {
  private nodes = new Map<string, FocusNode>();

  clear(): void {
    this.nodes.clear();
  }

  register(node: FocusNode): void {
    this.nodes.set(node.id, node);
    try {
      node.el.dataset.focusId = node.id;
    } catch {
      // ignore non-DOM mocks
    }
    if (typeof node.el.hasAttribute === 'function' && !node.el.hasAttribute('tabindex')) {
      node.el.tabIndex = -1;
    }
  }

  unregister(id: string): void {
    this.nodes.delete(id);
  }

  get(id: string): FocusNode | undefined {
    return this.nodes.get(id);
  }

  all(): FocusNode[] {
    return [...this.nodes.values()];
  }

  findNearest(fromId: string, direction: FocusDirection): FocusNode | undefined {
    const from = this.nodes.get(fromId);
    if (!from) return undefined;
    const fromRect = from.el.getBoundingClientRect();
    const candidates = this.all().filter((n) => n.id !== fromId);

    const scored = candidates
      .map((node) => {
        const rect = node.el.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - (fromRect.left + fromRect.width / 2);
        const dy = rect.top + rect.height / 2 - (fromRect.top + fromRect.height / 2);
        let ok = false;
        let primary = 0;
        let secondary = 0;

        if (direction === 'left' && dx < -8) {
          ok = true;
          primary = Math.abs(dx);
          secondary = Math.abs(dy);
        } else if (direction === 'right' && dx > 8) {
          ok = true;
          primary = Math.abs(dx);
          secondary = Math.abs(dy);
        } else if (direction === 'up' && dy < -8) {
          ok = true;
          primary = Math.abs(dy);
          secondary = Math.abs(dx);
        } else if (direction === 'down' && dy > 8) {
          ok = true;
          primary = Math.abs(dy);
          secondary = Math.abs(dx);
        }

        return { node, ok, score: primary * 1000 + secondary };
      })
      .filter((x) => x.ok)
      .sort((a, b) => a.score - b.score);

    // Prefer same group for horizontal moves when available
    if (direction === 'left' || direction === 'right') {
      const sameGroup = scored.find((s) => s.node.group && s.node.group === from.group);
      if (sameGroup) return sameGroup.node;
    }

    return scored[0]?.node;
  }
}

export class FocusManager {
  readonly graph = new FocusGraph();
  readonly memory = new FocusMemory();
  private currentId: string | null = null;
  private scope = 'root';

  setScope(scope: string): void {
    if (this.currentId) this.memory.save(this.scope, this.currentId);
    this.scope = scope;
  }

  getCurrentId(): string | null {
    return this.currentId;
  }

  clear(): void {
    if (this.currentId) {
      const node = this.graph.get(this.currentId);
      node?.el.classList.remove('is-focused');
    }
    this.graph.clear();
    this.currentId = null;
  }

  register(node: FocusNode): void {
    this.graph.register(node);
  }

  focus(id: string, scroll = true): boolean {
    const node = this.graph.get(id);
    if (!node) return false;

    if (this.currentId) {
      this.graph.get(this.currentId)?.el.classList.remove('is-focused');
    }

    this.currentId = id;
    node.el.classList.add('is-focused');
    node.el.focus({ preventScroll: true });
    this.memory.save(this.scope, id);

    if (scroll) {
      node.el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    return true;
  }

  focusFirst(): boolean {
    const first = this.graph.all()[0];
    return first ? this.focus(first.id) : false;
  }

  restoreOrFirst(): boolean {
    const remembered = this.memory.restore(this.scope);
    if (remembered && this.focus(remembered)) return true;
    return this.focusFirst();
  }

  move(direction: FocusDirection): boolean {
    if (!this.currentId) return this.focusFirst();
    const next = this.graph.findNearest(this.currentId, direction);
    if (!next) return false;
    return this.focus(next.id);
  }

  getCurrentElement(): HTMLElement | null {
    if (!this.currentId) return null;
    return this.graph.get(this.currentId)?.el ?? null;
  }
}
