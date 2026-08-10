type Handler<T> = (payload: T) => void;

export class EventBus {
  private readonly listeners = new Map<string, Set<Handler<unknown>>>();

  on<T>(event: string, handler: Handler<T>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: Handler<T>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler as Handler<unknown>);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<T>(event: string, payload: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] handler error for ${event}`, err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const AppEvents = {
  ROUTE_CHANGE: 'route:change',
  FOCUS_CHANGE: 'focus:change',
  PROGRESS_UPDATE: 'progress:update',
  SETTINGS_CHANGE: 'settings:change',
  PLAYER_TIME: 'player:time',
  PLAYER_STATE: 'player:state',
  PLAYER_NEXT_PROMPT: 'player:next-prompt',
  PROVIDER_ERROR: 'provider:error',
} as const;

export const eventBus = new EventBus();
