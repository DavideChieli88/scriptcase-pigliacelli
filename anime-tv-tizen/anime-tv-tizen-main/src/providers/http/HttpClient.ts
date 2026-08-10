import { logger } from '@/utils/logger';
import { debugLog } from '@/utils/debugLog';
import { ProviderError } from '@/domain/errors';

export interface HttpClientOptions {
  timeoutMs?: number;
  retries?: number;
  minIntervalMs?: number;
  userAgent?: string;
  defaultHeaders?: Record<string, string>;
  /** Label for debug logs */
  name?: string;
}

export interface HttpResponse {
  status: number;
  text: string;
  url: string;
  durationMs: number;
}

/**
 * Lightweight fetch wrapper: timeout, exponential backoff retries, rate limiting.
 * Parsing stays outside — this only deals with network I/O.
 */
export class HttpClient {
  private lastRequestAt = 0;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly minIntervalMs: number;
  private readonly headers: Record<string, string>;
  private readonly name: string;

  constructor(options: HttpClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 12000;
    this.retries = options.retries ?? 2;
    this.minIntervalMs = options.minIntervalMs ?? 350;
    this.name = options.name ?? 'HttpClient';
    this.headers = {
      ...(options.userAgent ? { 'User-Agent': options.userAgent } : {}),
      ...options.defaultHeaders,
    };
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  async get(url: string, init?: RequestInit): Promise<HttpResponse> {
    await this.throttle();
    let lastError: unknown;
    const started = Date.now();

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const attemptStarted = Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), this.timeoutMs);

        debugLog.push('network', 'debug', `${this.name} GET attempt ${attempt + 1}`, {
          url,
          timeoutMs: this.timeoutMs,
        });

        const response = await fetch(url, {
          ...init,
          method: 'GET',
          headers: { ...this.headers, ...(init?.headers as Record<string, string>) },
          signal: controller.signal,
        });
        clearTimeout(timer);

        const text = await response.text();
        const durationMs = Date.now() - attemptStarted;

        if (!response.ok) {
          const kind = response.status === 429 ? 'rateLimit' : 'network';
          const retryAfter = Number(response.headers.get('Retry-After') || 0);
          debugLog.push('network', 'warn', `${this.name} HTTP ${response.status}`, {
            url,
            durationMs,
            retryAfter,
          });
          throw new ProviderError(kind, `HTTP ${response.status} for ${url}`, 'http', {
            status: response.status,
            retryAfter,
          });
        }

        debugLog.push('network', 'info', `${this.name} OK ${response.status}`, {
          url,
          durationMs,
          bytes: text.length,
        });

        return {
          status: response.status,
          text,
          url: response.url || url,
          durationMs: Date.now() - started,
        };
      } catch (err) {
        if (timer) clearTimeout(timer);
        lastError = err;
        const isAbort = isAbortError(err);
        const isRateLimit = err instanceof ProviderError && err.kind === 'rateLimit';
        logger.warn(this.name, `Attempt ${attempt + 1} failed for ${url}`, {
          isAbort,
          message: err instanceof Error ? err.message : String(err),
        });

        if (attempt < this.retries) {
          const backoff = isRateLimit
            ? Math.max(1000, extractRetryAfterMs(err) || 1000 * (attempt + 1))
            : Math.min(4000, 300 * Math.pow(2, attempt));
          await sleep(backoff);
          continue;
        }

        if (isAbort) {
          throw new ProviderError('timeout', `Timeout for ${url}`, 'http', err);
        }
        if (err instanceof ProviderError) throw err;
        throw new ProviderError('network', `Network error for ${url}`, 'http', lastError);
      }
    }

    throw new ProviderError('network', `Network error for ${url}`, 'http', lastError);
  }
}

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

function extractRetryAfterMs(err: unknown): number {
  if (!(err instanceof ProviderError)) return 0;
  const cause = err.cause as { retryAfter?: number } | undefined;
  const sec = cause?.retryAfter;
  if (!sec || !Number.isFinite(sec)) return 0;
  return sec > 1000 ? sec : sec * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const httpClient = new HttpClient({ name: 'HttpClient' });
