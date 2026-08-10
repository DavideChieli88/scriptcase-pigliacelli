import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '@/providers/http/HttpClient';
import { ProviderError } from '@/domain/errors';
import { debugLog } from '@/utils/debugLog';

describe('HttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns body on success', async () => {
    debugLog.setEnabled(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('hello', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );
    const client = new HttpClient({ name: 'TestHttp', minIntervalMs: 0, retries: 0 });
    const res = await client.get('https://example.test/page');
    expect(res.status).toBe(200);
    expect(res.text).toBe('hello');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('retries then succeeds', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        if (calls < 2) {
          return new Response('fail', { status: 503 });
        }
        return new Response('ok', { status: 200 });
      }),
    );
    const client = new HttpClient({ name: 'TestHttp', minIntervalMs: 0, retries: 2 });
    const res = await client.get('https://example.test/retry');
    expect(res.text).toBe('ok');
    expect(calls).toBe(2);
  });

  it('maps abort to timeout ProviderError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new DOMException('Aborted', 'AbortError');
            reject(err);
          });
        });
      }),
    );
    const client = new HttpClient({
      name: 'TestHttp',
      minIntervalMs: 0,
      retries: 0,
      timeoutMs: 20,
    });
    await expect(client.get('https://example.test/slow')).rejects.toMatchObject({
      kind: 'timeout',
    } satisfies Partial<ProviderError>);
  });
});
