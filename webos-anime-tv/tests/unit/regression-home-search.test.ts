import { describe, expect, it } from 'vitest';
import { HomeService } from '../../src/domain/services/HomeService.ts';
import { SearchService } from '../../src/domain/services/SearchService.ts';
import { ProviderRegistry } from '../../src/providers/registry.ts';
import type { ContentProvider } from '../../src/providers/types.ts';
import { errResult, okResult } from '../../src/providers/types.ts';
import type { AnimeSummary, HomeSection } from '../../src/domain/models/index.ts';
import { AltadefinizioneProvider } from '../../src/providers/altadefinizione/AltadefinizioneProvider.ts';
import type { ProviderContext } from '../../src/providers/types.ts';

const caps = {
  home: true,
  search: true,
  details: true,
  episodes: true,
  stream: true,
  offlineCache: true,
} as const;

function summary(id: string, providerId: string, title: string): AnimeSummary {
  return { id, providerId, title };
}

function fakeProvider(opts: {
  id: string;
  name?: string;
  enabled?: boolean;
  home?: HomeSection[];
  homeError?: string;
  search?: AnimeSummary[];
  searchCalls?: string[];
}): ContentProvider {
  const searchCalls = opts.searchCalls;
  return {
    id: opts.id,
    name: opts.name ?? opts.id,
    baseUrl: `https://${opts.id}.example`,
    enabled: opts.enabled ?? true,
    capabilities: caps,
    async getHome() {
      if (opts.homeError) return errResult(opts.id, 'NETWORK_ERROR', opts.homeError, true);
      return okResult(opts.id, opts.home ?? []);
    },
    async search(query: string) {
      searchCalls?.push(`${opts.id}:${query}`);
      return okResult(opts.id, opts.search ?? []);
    },
    async getAnimeDetails(): Promise<ReturnType<ContentProvider['getAnimeDetails']>> {
      return errResult(opts.id, 'UNAVAILABLE', 'n/a', false);
    },
    async getEpisodes(): Promise<ReturnType<ContentProvider['getEpisodes']>> {
      return errResult(opts.id, 'UNAVAILABLE', 'n/a', false);
    },
    async getStreamSources(): Promise<ReturnType<ContentProvider['getStreamSources']>> {
      return errResult(opts.id, 'UNAVAILABLE', 'n/a', false);
    },
  };
}

const persistenceStub = {
  progress: { listContinue: async () => [] },
  history: { listRecent: async () => [], updateCover: async () => undefined },
};

describe('HomeService regression', () => {
  it('uses the first working anime provider and skips mock unless preferred', async () => {
    const registry = new ProviderRegistry();
    registry.register(
      fakeProvider({
        id: 'mock',
        home: [{ id: 'm', title: 'Mock', items: [summary('m1', 'mock', 'Fake')] }],
      }),
    );
    registry.register(
      fakeProvider({
        id: 'animesaturn',
        home: [{ id: 's', title: 'Recenti', items: [summary('a1', 'animesaturn', 'Naruto')] }],
      }),
    );

    const home = new HomeService(registry, persistenceStub as never);
    const feed = await home.getHomeFeed('animesaturn');
    expect(feed.usedProviderId).toBe('animesaturn');
    expect(feed.sections[0]?.items[0]?.title).toBe('Naruto');
  });

  it('does not wait on a second film provider after the first catalog succeeds', async () => {
    let mirrorHome = 0;
    const registry = new ProviderRegistry();
    registry.register(
      fakeProvider({
        id: 'altadefinizione',
        home: [{ id: 'f', title: 'Film', items: [summary('f1', 'altadefinizione', 'Matrix')] }],
      }),
    );
    const mirror = fakeProvider({
      id: 'altadefinizione-you',
      home: [{ id: 'f2', title: 'Film', items: [summary('f2', 'altadefinizione-you', 'Other')] }],
    });
    const orig = mirror.getHome.bind(mirror);
    mirror.getHome = async () => {
      mirrorHome += 1;
      return orig();
    };
    registry.register(mirror);

    const home = new HomeService(registry, persistenceStub as never);
    const feed = await home.getHomeFeed('altadefinizione');
    expect(feed.usedProviderId).toBe('altadefinizione');
    expect(mirrorHome).toBe(0);
  });

  it('falls back to the film mirror when the primary home fails', async () => {
    const registry = new ProviderRegistry();
    registry.register(fakeProvider({ id: 'altadefinizione', homeError: 'timeout' }));
    registry.register(
      fakeProvider({
        id: 'altadefinizione-you',
        home: [{ id: 'f', title: 'Film', items: [summary('f1', 'altadefinizione-you', 'Backup')] }],
      }),
    );
    const home = new HomeService(registry, persistenceStub as never);
    const feed = await home.getHomeFeed('altadefinizione');
    expect(feed.usedProviderId).toBe('altadefinizione-you');
    expect(feed.sections[0]?.items[0]?.title).toBe('Backup');
  });
});

describe('SearchService regression', () => {
  it('uses the next film provider only when the preferred search is empty', async () => {
    const calls: string[] = [];
    const registry = new ProviderRegistry();
    registry.register(fakeProvider({ id: 'altadefinizione', search: [], searchCalls: calls }));
    registry.register(
      fakeProvider({
        id: 'altadefinizione-you',
        search: [summary('x', 'altadefinizione-you', 'Batman')],
        searchCalls: calls,
      }),
    );

    const search = new SearchService(registry);
    const result = await search.search('batman', 'altadefinizione', { kind: 'movies' });
    expect(result.usedProviderId).toBe('altadefinizione-you');
    expect(result.items[0]?.title).toBe('Batman');
    expect(calls).toEqual(['altadefinizione:batman', 'altadefinizione-you:batman']);
  });

  it('does not query the film mirror when the preferred search already has hits', async () => {
    const calls: string[] = [];
    const registry = new ProviderRegistry();
    registry.register(
      fakeProvider({
        id: 'altadefinizione',
        search: [summary('x', 'altadefinizione', 'Batman')],
        searchCalls: calls,
      }),
    );
    registry.register(
      fakeProvider({
        id: 'altadefinizione-you',
        search: [summary('y', 'altadefinizione-you', 'Other')],
        searchCalls: calls,
      }),
    );

    const search = new SearchService(registry);
    const result = await search.search('batman', 'altadefinizione', { kind: 'movies' });
    expect(result.usedProviderId).toBe('altadefinizione');
    expect(calls).toEqual(['altadefinizione:batman']);
  });
});

function filmPageHtml(title: string, id: string): string {
  return `
    <a href="https://altadefinizionex.co/azione/${id}-${title}-streaming.html">
      <img src="/uploads/${title}.jpg" />
    </a>
    <a href="/film/page/12/?tipo=1">12</a>
  `;
}

describe('AltadefinizioneProvider home is a single page', () => {
  it('fetches one catalog page on getHome', async () => {
    const urls: string[] = [];
    const ctx: ProviderContext = {
      http: {
        getText: async (url: string) => {
          urls.push(url);
          return filmPageHtml('matrix', '2084');
        },
      } as never,
      logger: { warn() {}, info() {}, debug() {}, error() {} } as never,
      cache: {
        getFresh: async () => undefined,
        set: async () => undefined,
      } as never,
      providerState: {
        recordSuccess: async () => undefined,
        recordError: async () => undefined,
      } as never,
      cacheTtlMs: 1000,
    };

    const provider = new AltadefinizioneProvider(ctx, true, {
      id: 'altadefinizione',
      name: 'Altadefinizione',
      baseUrl: 'https://altadefinizionex.co',
      mirrors: ['https://altadefinizione.you'],
    });

    const home = await provider.getHome();
    expect(home.ok).toBe(true);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('/film/?tipo=1');
    expect(home.data?.[0]?.items.length).toBeGreaterThan(0);
  });

  it('skips a dead host on the next catalog request', async () => {
    const urls: string[] = [];
    const ctx: ProviderContext = {
      http: {
        getText: async (url: string) => {
          urls.push(url);
          if (url.includes('altadefinizionex.co')) {
            throw new Error('Timeout rete (sito lento o bloccato)');
          }
          return filmPageHtml('dune', '99');
        },
      } as never,
      logger: { warn() {}, info() {}, debug() {}, error() {} } as never,
      cache: {
        getFresh: async () => undefined,
        set: async () => undefined,
      } as never,
      providerState: {
        recordSuccess: async () => undefined,
        recordError: async () => undefined,
      } as never,
      cacheTtlMs: 1000,
    };

    const provider = new AltadefinizioneProvider(ctx, true, {
      id: 'altadefinizione',
      name: 'Altadefinizione',
      baseUrl: 'https://altadefinizionex.co',
      mirrors: ['https://altadefinizione.you'],
    });

    await provider.getHome();
    urls.length = 0;
    await provider.loadMoreCatalog();
    expect(urls.every((u) => u.includes('altadefinizione.you'))).toBe(true);
    expect(urls.some((u) => u.includes('altadefinizionex.co'))).toBe(false);
  });
});
