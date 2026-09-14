/**
 * Live smoke: film home + search via LAN proxy (npm run proxy).
 * Run: npm run test:live
 */
import { describe, expect, it } from 'vitest';
import { HttpClient } from '../../src/core/net/HttpClient.ts';
import { logger } from '../../src/core/logging/Logger.ts';
import { ProviderRegistry } from '../../src/providers/registry.ts';
import { AltadefinizioneProvider } from '../../src/providers/altadefinizione/AltadefinizioneProvider.ts';
import { HomeService } from '../../src/domain/services/HomeService.ts';
import { SearchService } from '../../src/domain/services/SearchService.ts';
import type { ProviderContext } from '../../src/providers/types.ts';

const PROXY = process.env.SMOKE_PROXY_URL || 'http://127.0.0.1:8787';
const HOME_MAX_MS = Number(process.env.SMOKE_HOME_MAX_MS || 25000);
const SEARCH_MAX_MS = Number(process.env.SMOKE_SEARCH_MAX_MS || 20000);

const persistenceStub = {
  progress: { listContinue: async () => [] },
  history: { listRecent: async () => [], updateCover: async () => undefined },
};

function makeCtx(http: HttpClient): ProviderContext {
  return {
    http,
    logger,
    cache: {
      getFresh: async () => undefined,
      set: async () => undefined,
    } as never,
    providerState: {
      recordSuccess: async () => undefined,
      recordError: async () => undefined,
    } as never,
    cacheTtlMs: 60_000,
  };
}

function buildRegistry(http: HttpClient): ProviderRegistry {
  const ctx = makeCtx(http);
  const registry = new ProviderRegistry();
  registry.register(
    new AltadefinizioneProvider(ctx, true, {
      id: 'altadefinizione',
      name: 'Altadefinizione',
      baseUrl: 'https://altadefinizionex.co',
      mirrors: ['https://altadefinizione.you'],
    }),
  );
  registry.register(
    new AltadefinizioneProvider(ctx, true, {
      id: 'altadefinizione-you',
      name: 'Altadefinizione (mirror)',
      baseUrl: 'https://altadefinizione.you',
      mirrors: ['https://altadefinizionex.co'],
    }),
  );
  return registry;
}

async function proxyUp(): Promise<boolean> {
  try {
    const r = await fetch(`${PROXY}/health`, { signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch {
    return false;
  }
}

describe('live movies smoke (proxy required)', () => {
  it('home catalog loads with items within budget', async () => {
    const up = await proxyUp();
    if (!up) {
      console.warn(`[smoke] skip: proxy not reachable at ${PROXY}`);
      return;
    }

    const http = new HttpClient({
      timeoutMs: 22000,
      maxRetries: 1,
      minIntervalMs: 80,
      proxyBaseUrl: PROXY,
      userAgent: 'WebOSAnimeTV/smoke',
    });
    const registry = buildRegistry(http);
    const home = new HomeService(registry, persistenceStub as never);

    const t0 = performance.now();
    const feed = await home.getHomeFeed('altadefinizione');
    const ms = Math.round(performance.now() - t0);

    console.log(`[smoke] home ${ms}ms provider=${feed.usedProviderId} sections=${feed.sections.length} errors=${feed.errors.length}`);
    if (feed.sections[0]) {
      console.log(`[smoke] first section "${feed.sections[0].title}" items=${feed.sections[0].items.length}`);
      console.log(`[smoke] sample: ${feed.sections[0].items.slice(0, 3).map((i) => i.title).join(' | ')}`);
    }

    expect(feed.usedProviderId).toBeTruthy();
    expect(feed.sections.some((s) => s.items.length > 0)).toBe(true);
    expect(ms).toBeLessThan(HOME_MAX_MS);
  }, 60_000);

  it('movie search returns hits within budget', async () => {
    const up = await proxyUp();
    if (!up) {
      console.warn(`[smoke] skip: proxy not reachable at ${PROXY}`);
      return;
    }

    const http = new HttpClient({
      timeoutMs: 22000,
      maxRetries: 1,
      minIntervalMs: 80,
      proxyBaseUrl: PROXY,
      userAgent: 'WebOSAnimeTV/smoke',
    });
    const registry = buildRegistry(http);
    const search = new SearchService(registry);

    const query = 'matrix';
    const t0 = performance.now();
    const result = await search.search(query, 'altadefinizione', { kind: 'movies' });
    const ms = Math.round(performance.now() - t0);

    console.log(`[smoke] search "${query}" ${ms}ms provider=${result.usedProviderId} hits=${result.items.length}`);
    if (result.items[0]) {
      console.log(`[smoke] top: ${result.items.slice(0, 5).map((i) => i.title).join(' | ')}`);
    }
    if (result.errors.length) {
      console.log(`[smoke] search errors: ${result.errors.join('; ')}`);
    }

    expect(result.usedProviderId).toBeTruthy();
    expect(result.items.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(SEARCH_MAX_MS);
  }, 60_000);
});
