import { debugLog } from './debugLog';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
  debugLog.setEnabled(level === 'debug');
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel] && currentLevel !== 'silent';
}

function format(scope: string, message: string): string {
  return `[AnimeTV:${scope}] ${message}`;
}

function channelFor(scope: string): 'network' | 'parser' | 'provider' | 'cache' | 'app' {
  const s = scope.toLowerCase();
  if (s.includes('http') || s.includes('network')) return 'network';
  if (s.includes('parser')) return 'parser';
  if (s.includes('provider') || s.includes('catalog')) return 'provider';
  if (s.includes('cache')) return 'cache';
  return 'app';
}

function mirror(
  level: 'debug' | 'info' | 'warn' | 'error',
  scope: string,
  message: string,
  data?: unknown,
): void {
  debugLog.push(channelFor(scope), level, `${scope}: ${message}`, data);
}

export const logger = {
  debug(scope: string, message: string, data?: unknown): void {
    mirror('debug', scope, message, data);
    if (!shouldLog('debug')) return;
    if (data !== undefined) console.debug(format(scope, message), data);
    else console.debug(format(scope, message));
  },
  info(scope: string, message: string, data?: unknown): void {
    mirror('info', scope, message, data);
    if (!shouldLog('info')) return;
    if (data !== undefined) console.info(format(scope, message), data);
    else console.info(format(scope, message));
  },
  warn(scope: string, message: string, data?: unknown): void {
    mirror('warn', scope, message, data);
    if (!shouldLog('warn')) return;
    if (data !== undefined) console.warn(format(scope, message), data);
    else console.warn(format(scope, message));
  },
  error(scope: string, message: string, data?: unknown): void {
    mirror('error', scope, message, data);
    if (!shouldLog('error')) return;
    if (data !== undefined) console.error(format(scope, message), data);
    else console.error(format(scope, message));
  },
};
