#!/usr/bin/env node
/**
 * Live smoke (Node, no jsdom): home + search film via proxy.
 */
import { HttpClient } from '../src/core/net/HttpClient.ts';
import { logger } from '../src/core/logging/Logger.ts';
import { ProviderRegistry } from '../src/providers/registry.ts';
import { AltadefinizioneProvider } from '../src/providers/altadefinizione/AltadefinizioneProvider.ts';
import { HomeService } from '../src/domain/services/HomeService.ts';
import { SearchService } from '../src/domain/services/SearchService.ts';

const PROXY = process.env.SMOKE_PROXY_URL || 'http://127.0.0.1:8787';

const persistenceStub = {
  progress: { listContinue: async () => [] },
  history: { listRecent: async () => [], updateCover: async () => undefined },
};

function makeCtx(http) {
  return {
    http,
    logger,
    cache: { getFresh: async () => undefined, set: async () => undefined },
    providerState: { recordSuccess: async () => undefined, recordError: async () => undefined },
    cacheTtlMs: 60_000,
  };
}

function buildRegistry(http) {
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

async function main() {
  try {
    const probe = await fetch(`${PROXY}/fetch?url=${encodeURIComponent('https://example.com')}`, {
      signal: AbortSignal.timeout(8000),
    });
    console.log(`[smoke] proxy probe status=${probe.status}`);
  } catch (e) {
    console.error(`[smoke] FAIL proxy not reachable at ${PROXY}:`, e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const http = new HttpClient({
    timeoutMs: 22000,
    maxRetries: 1,
    minIntervalMs: 80,
    proxyBaseUrl: PROXY,
    userAgent: 'WebOSAnimeTV/smoke',
  });
  const registry = buildRegistry(http);
  const home = new HomeService(registry, persistenceStub);
  const search = new SearchService(registry);

  const t0 = Date.now();
  const feed = await home.getHomeFeed('altadefinizione');
  const homeMs = Date.now() - t0;
  const homeItems = feed.sections.reduce((n, s) => n + s.items.length, 0);

  console.log(`[smoke] HOME ${homeMs}ms provider=${feed.usedProviderId} items=${homeItems}`);
  if (feed.errors.length) console.log(`[smoke] home errors: ${feed.errors.join(' | ')}`);
  if (feed.sections[0]?.items[0]) {
    console.log(`[smoke] home sample: ${feed.sections[0].items.slice(0, 5).map((i) => i.title).join(' | ')}`);
  }

  const query = 'matrix';
  const t1 = Date.now();
  const searchResult = await search.search(query, 'altadefinizione', { kind: 'movies' });
  const searchMs = Date.now() - t1;

  console.log(`[smoke] SEARCH "${query}" ${searchMs}ms provider=${searchResult.usedProviderId} hits=${searchResult.items.length}`);
  if (searchResult.errors.length) console.log(`[smoke] search errors: ${searchResult.errors.join(' | ')}`);
  if (searchResult.items[0]) {
    console.log(`[smoke] search sample: ${searchResult.items.slice(0, 5).map((i) => i.title).join(' | ')}`);
  }

  let ok = true;
  if (!feed.usedProviderId || homeItems === 0) {
    console.error('[smoke] FAIL home empty');
    ok = false;
  }
  if (homeMs > 25000) {
    console.error(`[smoke] WARN home slow (${homeMs}ms > 25s)`);
  }
  if (!searchResult.usedProviderId || searchResult.items.length === 0) {
    console.error('[smoke] FAIL search empty');
    ok = false;
  }
  if (searchMs > 20000) {
    console.error(`[smoke] WARN search slow (${searchMs}ms > 20s)`);
  }

  if (ok) {
    console.log('[smoke] OK home + search');
    process.exit(0);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error('[smoke] CRASH', e);
  process.exit(1);
});
