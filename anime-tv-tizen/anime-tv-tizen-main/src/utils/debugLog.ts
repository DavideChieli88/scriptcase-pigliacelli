export type DebugChannel = 'network' | 'parser' | 'provider' | 'cache' | 'app';

export interface DebugEntry {
  at: number;
  channel: DebugChannel;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

const MAX = 200;
const buffer: DebugEntry[] = [];
let enabled = false;

export const debugLog = {
  setEnabled(value: boolean): void {
    enabled = value;
  },

  isEnabled(): boolean {
    return enabled;
  },

  push(
    channel: DebugChannel,
    level: DebugEntry['level'],
    message: string,
    data?: unknown,
  ): void {
    if (!enabled && level === 'debug') return;
    // Always keep warn/error; keep all when enabled
    if (!enabled && level === 'info') return;

    buffer.push({
      at: Date.now(),
      channel,
      level,
      message,
      data: data === undefined ? undefined : safeClone(data),
    });
    if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  },

  list(limit = 80): DebugEntry[] {
    return buffer.slice(-limit);
  },

  clear(): void {
    buffer.length = 0;
  },

  formatLines(limit = 60): string {
    return this.list(limit)
      .map((e) => {
        const t = new Date(e.at).toISOString().slice(11, 23);
        const extra =
          e.data !== undefined ? ` ${truncate(JSON.stringify(e.data), 120)}` : '';
        return `${t} [${e.channel}/${e.level}] ${e.message}${extra}`;
      })
      .join('\n');
  },
};

function safeClone(data: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return String(data);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
