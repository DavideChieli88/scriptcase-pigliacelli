import { logger } from '../logging/Logger';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

export class RateLimiter {
  private lastAt = 0;

  constructor(private minIntervalMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const delta = now - this.lastAt;
    if (delta < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - delta));
    }
    this.lastAt = Date.now();
  }
}

export class HttpClient {
  private limiter: RateLimiter;

  constructor(
    private defaults: {
      timeoutMs: number;
      maxRetries: number;
      minIntervalMs: number;
      proxyBaseUrl?: string;
      userAgent?: string;
    },
  ) {
    this.limiter = new RateLimiter(defaults.minIntervalMs);
  }

  setProxyBaseUrl(url: string): void {
    this.defaults.proxyBaseUrl = url;
  }

  /** Fetch URL, optionally through personal CORS proxy. */
  async getText(url: string, options: HttpRequestOptions = {}, useProxy = true): Promise<string> {
    const target = useProxy && this.defaults.proxyBaseUrl
      ? this.buildProxyUrl(url)
      : url;
    const res = await this.request(target, options);
    return res.text();
  }

  async getJson<T>(url: string, options: HttpRequestOptions = {}, useProxy = true): Promise<T> {
    const text = await this.getText(url, options, useProxy);
    return JSON.parse(text) as T;
  }

  private buildProxyUrl(url: string): string {
    const base = this.defaults.proxyBaseUrl!.replace(/\/$/, '');
    return `${base}/fetch?url=${encodeURIComponent(url)}`;
  }

  private async request(url: string, options: HttpRequestOptions): Promise<Response> {
    const retries = options.retries ?? this.defaults.maxRetries;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      await this.limiter.wait();
      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? this.defaults.timeoutMs,
      );

      try {
        const headers: Record<string, string> = {
          Accept: 'text/html,application/json,*/*',
          ...options.headers,
        };
        if (this.defaults.userAgent) headers['X-Proxy-UA'] = this.defaults.userAgent;

        const res = await fetch(url, {
          method: options.method ?? 'GET',
          headers,
          body: options.body,
          signal: options.signal ?? controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${url}`);
        }
        return res;
      } catch (err) {
        lastError = err;
        logger.warn('HttpClient attempt failed', { url, attempt, err });
        if (attempt === retries) break;
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      } finally {
        window.clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
