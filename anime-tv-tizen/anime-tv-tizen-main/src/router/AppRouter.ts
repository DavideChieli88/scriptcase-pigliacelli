export type RouteName =
  | 'home'
  | 'search'
  | 'details'
  | 'player'
  | 'watchlist'
  | 'settings';

export interface RouteState {
  name: RouteName;
  params?: Record<string, string>;
}

export type RouteListener = (route: RouteState, stack: RouteState[]) => void;

/**
 * Simple in-app stack router.
 * Avoids History API quirks on Tizen; Back pops the stack.
 */
export class AppRouter {
  private stack: RouteState[] = [{ name: 'home' }];
  private listeners = new Set<RouteListener>();

  get current(): RouteState {
    return this.stack[this.stack.length - 1];
  }

  get depth(): number {
    return this.stack.length;
  }

  getStack(): RouteState[] {
    return this.stack.slice();
  }

  subscribe(listener: RouteListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const route = this.current;
    for (const listener of this.listeners) {
      listener(route, this.getStack());
    }
  }

  replace(name: RouteName, params?: Record<string, string>): void {
    this.stack[this.stack.length - 1] = { name, params };
    this.notify();
  }

  push(name: RouteName, params?: Record<string, string>): void {
    const cur = this.current;
    if (cur.name === name && JSON.stringify(cur.params ?? {}) === JSON.stringify(params ?? {})) {
      return;
    }
    this.stack.push({ name, params });
    this.notify();
  }

  /** Pop one level. Returns false if already at root. */
  back(): boolean {
    if (this.stack.length <= 1) return false;
    this.stack.pop();
    this.notify();
    return true;
  }

  /** Reset to home. */
  reset(): void {
    this.stack = [{ name: 'home' }];
    this.notify();
  }
}

export const router = new AppRouter();

export function routeTitle(name: RouteName): string {
  switch (name) {
    case 'home':
      return 'Home';
    case 'search':
      return 'Cerca';
    case 'details':
      return 'Dettagli';
    case 'player':
      return 'Player';
    case 'watchlist':
      return 'Watchlist';
    case 'settings':
      return 'Impostazioni';
    default:
      return name;
  }
}
