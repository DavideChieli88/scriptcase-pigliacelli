export type RouteName =
  | 'home'
  | 'search'
  | 'movies'
  | 'movies-search'
  | 'details'
  | 'player'
  | 'watchlist'
  | 'history'
  | 'settings';

export interface RouteState {
  name: RouteName;
  params: Record<string, string>;
}

export type RouteHandler = (state: RouteState) => void | Promise<void>;

export class HistoryManager {
  private stack: RouteState[] = [];

  get current(): RouteState | undefined {
    return this.stack[this.stack.length - 1];
  }

  get length(): number {
    return this.stack.length;
  }

  push(state: RouteState): void {
    this.stack.push({ name: state.name, params: { ...state.params } });
  }

  replace(state: RouteState): void {
    if (this.stack.length === 0) {
      this.push(state);
      return;
    }
    this.stack[this.stack.length - 1] = { name: state.name, params: { ...state.params } };
  }

  pop(): RouteState | undefined {
    if (this.stack.length <= 1) return undefined;
    this.stack.pop();
    return this.current;
  }

  canGoBack(): boolean {
    return this.stack.length > 1;
  }

  clear(initial?: RouteState): void {
    this.stack = initial ? [{ ...initial, params: { ...initial.params } }] : [];
  }
}

export class Router {
  private handlers = new Map<RouteName, RouteHandler>();
  private history = new HistoryManager();
  private navigating = false;

  on(name: RouteName, handler: RouteHandler): void {
    this.handlers.set(name, handler);
  }

  getHistory(): HistoryManager {
    return this.history;
  }

  getCurrent(): RouteState | undefined {
    return this.history.current;
  }

  async navigate(name: RouteName, params: Record<string, string> = {}, replace = false): Promise<void> {
    if (this.navigating) return;
    this.navigating = true;
    try {
      const state: RouteState = { name, params };
      if (replace) this.history.replace(state);
      else this.history.push(state);
      await this.dispatch(state);
    } finally {
      this.navigating = false;
    }
  }

  async back(): Promise<boolean> {
    if (!this.history.canGoBack()) return false;
    const prev = this.history.pop();
    if (!prev) return false;
    await this.dispatch(prev);
    return true;
  }

  private async dispatch(state: RouteState): Promise<void> {
    const handler = this.handlers.get(state.name);
    if (!handler) {
      throw new Error(`No route handler for ${state.name}`);
    }
    await handler(state);
  }
}
