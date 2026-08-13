import { logger } from '../logging/Logger';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

/** true = always proxy · false = never · auto = direct first, proxy on CORS/block */
export type ProxyMode = boolean | 'auto';

export class RateLimiter {
  private chain: Promise<void> = Promise.resolve();
  private lastAt = 0;

  constructor(private minIntervalMs: number) {}

  /** Serialize starts so parallel callers still respect min spacing without stacking delays wrongly. */
  wait(): Promise<void> {
    const run = async () => {
      const now = Date.now();
      const delta = now - this.lastAt;
      if (delta < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - delta));
      }
      this.lastAt = Date.now();
    };
    const next = this.chain.then(run, run);
    this.chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isLikelyCorsOrOpaqueBlock(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message || '';
  return (
    /Failed to fetch|NetworkError|Load failed|CORS|cross-origin|TypeError/i.test(m) ||
    err.name === 'TypeError'
  );
}

function formatFetchError(err: unknown, url: string, viaProxy: boolean): Error {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new Error(
      viaProxy
        ? 'Timeout: proxy lento o non raggiungibile (controlla npm run proxy e IP in Impostazioni)'
        : 'Timeout rete (sito lento o bloccato)',
    );
  }
  if (err instanceof Error) {
    if (/aborted|AbortError/i.test(err.message)) {
      return new Error(
        viaProxy
          ? 'Timeout: proxy lento o non raggiungibile (controlla npm run proxy e IP in Impostazioni)'
          : 'Timeout rete (sito lento o bloccato)',
      );
    }
    return err;
  }
  return new Error(`${String(err)} (${url})`);
}

function withoutProxyOnlyHeaders(options: HttpRequestOptions): HttpRequestOptions {
  if (!options.headers) return options;
  const headers = { ...options.headers };
  delete headers['X-Proxy-Referer'];
  delete headers['X-Proxy-UA'];
  delete headers['x-proxy-referer'];
  delete headers['x-proxy-ua'];
  return { ...options, headers };
}

export class HttpClient {
  private limiter: RateLimiter;
  /** Per-host preference learned this session (auto mode). */
  private hostMode = new Map<string, 'direct' | 'proxy'>();

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
    this.defaults.proxyBaseUrl = url.trim() || undefined;
    this.hostMode.clear();
  }

  getProxyBaseUrl(): string | undefined {
    return this.defaults.proxyBaseUrl;
  }

  /**
   * Fetch URL text.
   * Default `auto`: try direct (webOS may allow it with allowCrossDomain),
   * fall back to LAN proxy only if the browser blocks the response.
   */
  async getText(
    url: string,
    options: HttpRequestOptions = {},
    useProxy: ProxyMode = 'auto',
  ): Promise<string> {
    const proxyBase = this.defaults.proxyBaseUrl?.replace(/\/$/, '');

    if (useProxy === false || !proxyBase) {
      const res = await this.request(url, withoutProxyOnlyHeaders(options), false);
      return res.text();
    }

    if (useProxy === true) {
      const res = await this.request(this.buildProxyUrl(url, proxyBase), options, true);
      return res.text();
    }

    // auto
    const host = hostOf(url);
    const learned = this.hostMode.get(host);

    if (learned === 'proxy') {
      const res = await this.request(this.buildProxyUrl(url, proxyBase), options, true);
      return res.text();
    }

    try {
      const res = await this.request(url, withoutProxyOnlyHeaders(options), false);
      this.hostMode.set(host, 'direct');
      return res.text();
    } catch (directErr) {
      if (!isLikelyCorsOrOpaqueBlock(directErr)) {
        throw directErr;
      }
      logger.info('HttpClient direct blocked — falling back to proxy', { host, directErr });
      this.hostMode.set(host, 'proxy');
      const res = await this.request(this.buildProxyUrl(url, proxyBase), options, true);
      return res.text();
    }
  }

  async getJson<T>(
    url: string,
    options: HttpRequestOptions = {},
    useProxy: ProxyMode = 'auto',
  ): Promise<T> {
    const text = await this.getText(url, options, useProxy);
    return JSON.parse(text) as T;
  }

  private buildProxyUrl(url: string, base: string): string {
    return `${base}/fetch?url=${encodeURIComponent(url)}`;
  }

  private async request(
    url: string,
    options: HttpRequestOptions,
    viaProxy: boolean,
  ): Promise<Response> {
    const retries = options.retries ?? this.defaults.maxRetries;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      await this.limiter.wait();
      const controller = new AbortController();
      const timeoutMs = options.timeoutMs ?? this.defaults.timeoutMs;
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const headers: Record<string, string> = {
          Accept: 'text/html,application/json,*/*',
          ...options.headers,
        };
        if (viaProxy && this.defaults.userAgent) {
          headers['X-Proxy-UA'] = this.defaults.userAgent;
        }

        const res = await fetch(url, {
          method: options.method ?? 'GET',
          headers,
          body: options.body,
          signal: options.signal ?? controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error(
              `HTTP 429 (troppe richieste) — attendi o cambia provider/mirror`,
            );
          }
          throw new Error(`HTTP ${res.status} for ${url}`);
        }
        return res;
      } catch (err) {
        lastError = formatFetchError(err, url, viaProxy);
        logger.warn('HttpClient attempt failed', { url, attempt, viaProxy, err: lastError });
        if (
          lastError instanceof Error &&
          /Timeout:|aborted|AbortError/i.test(lastError.message)
        ) {
          break;
        }
        if (attempt === retries) break;
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      } finally {
        window.clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
