import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient, shouldFallbackToProxy } from '../../src/core/net/HttpClient.ts';

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

describe('shouldFallbackToProxy', () => {
  it('treats CORS and timeouts as proxy-fallback', () => {
    expect(shouldFallbackToProxy(new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldFallbackToProxy(new Error('Timeout rete (sito lento o bloccato)'))).toBe(true);
    expect(shouldFallbackToProxy(new Error('HTTP 404 for https://x'))).toBe(false);
  });
});

describe('HttpClient auto mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('falls back to proxy on CORS and remembers the host', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        if (url.includes('/fetch?url=')) return jsonResponse('via-proxy');
        throw new TypeError('Failed to fetch');
      },
    );

    const http = new HttpClient({
      timeoutMs: 8000,
      maxRetries: 0,
      minIntervalMs: 0,
      proxyBaseUrl: 'http://192.168.1.8:8787',
    });

    await expect(http.getText('https://www.animesaturn.net/api/home')).resolves.toBe('via-proxy');
    await expect(http.getText('https://www.animesaturn.net/api/search')).resolves.toBe('via-proxy');
    expect(urls.filter((u) => !u.includes('/fetch?')).length).toBe(1);
    expect(urls.filter((u) => u.includes('/fetch?')).length).toBe(2);
  });

  it('sends Referer requests through the proxy so stream decode can work', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        if (!url.includes('/fetch?url=')) throw new Error('must not hit CDN direct');
        return jsonResponse('{"d":"ok"}');
      },
    );

    const http = new HttpClient({
      timeoutMs: 8000,
      maxRetries: 0,
      minIntervalMs: 0,
      proxyBaseUrl: 'http://192.168.1.8:8787',
    });

    const text = await http.getText('https://play.saturncdn.net/embed/1/playlist', {
      headers: { 'X-Proxy-Referer': 'https://play.saturncdn.net/embed/1' },
    });
    expect(text).toContain('ok');
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('/fetch?url=');
  });

  it('falls back to direct if the proxy is down for Referer requests', async () => {
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/fetch?url=')) throw new TypeError('Failed to fetch');
        return jsonResponse('{"d":"direct-ok"}');
      },
    );

    const http = new HttpClient({
      timeoutMs: 8000,
      maxRetries: 0,
      minIntervalMs: 0,
      proxyBaseUrl: 'http://192.168.1.8:8787',
    });

    const text = await http.getText('https://play.saturncdn.net/embed/1/playlist', {
      headers: { 'X-Proxy-Referer': 'https://play.saturncdn.net/embed/1' },
    });
    expect(text).toContain('direct-ok');
  });

  it('falls back to proxy when the direct probe times out', async () => {
    vi.useFakeTimers();
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);
        if (url.includes('/fetch?url=')) return jsonResponse('proxied-ok');
        await new Promise<never>((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
        throw new Error('unreachable');
      },
    );

    const http = new HttpClient({
      timeoutMs: 22000,
      maxRetries: 0,
      minIntervalMs: 0,
      proxyBaseUrl: 'http://192.168.1.8:8787',
    });

    const pending = http.getText('https://altadefinizionex.co/film/?tipo=1');
    await vi.advanceTimersByTimeAsync(6500);
    await expect(pending).resolves.toBe('proxied-ok');
    expect(urls.some((u) => u.includes('/fetch?url='))).toBe(true);
  });
});
