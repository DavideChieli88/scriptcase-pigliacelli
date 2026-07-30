export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export class Logger {
  private level: LogLevel = 'info';
  private enabled = true;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled || this.level === 'silent') return false;
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.level];
  }

  debug(message: string, meta?: unknown): void {
    if (!this.shouldLog('debug')) return;
    console.debug(`[DEBUG] ${message}`, meta ?? '');
  }

  info(message: string, meta?: unknown): void {
    if (!this.shouldLog('info')) return;
    console.info(`[INFO] ${message}`, meta ?? '');
  }

  warn(message: string, meta?: unknown): void {
    if (!this.shouldLog('warn')) return;
    console.warn(`[WARN] ${message}`, meta ?? '');
  }

  error(message: string, meta?: unknown): void {
    if (!this.shouldLog('error')) return;
    console.error(`[ERROR] ${message}`, meta ?? '');
  }
}

export const logger = new Logger();
