import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDbHandle, openDatabase } from '@/persistence/db';
import { catalogService } from '@/services/CatalogService';
import { cacheService } from '@/services/CacheService';
import { providerRegistry } from '@/providers/registry';
import { mockProvider } from '@/providers/mock/MockProvider';
import { settingsService } from '@/services/SettingsService';
import { ProviderError } from '@/domain/errors';
import type { ContentProvider, ProviderResult } from '@/providers/types';
import type { HomeFeed } from '@/domain/models';
import { cacheRepo } from '@/persistence/repositories/CacheRepo';

describe('CatalogService offline-first', () => {
  beforeEach(async () => {
    resetDbHandle();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('anime-tv-db');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
    await openDatabase();
    await settingsService.load();
    providerRegistry.register(mockProvider);
    await cacheService.clear();
  });

  it('loads home from mock and caches it', async () => {
    const home = await catalogService.getHome('mock');
    expect(home.popular.length).toBeGreaterThan(0);
    expect(home.fromCache).toBeFalsy();

    const cached = await cacheService.getMetadata<HomeFeed>('home:mock');
    expect(cached?.popular.length).toBeGreaterThan(0);
  });

  it('serves fresh home cache without hitting the provider', async () => {
    await catalogService.getHome('mock');

    const getHome = vi.fn(async (): Promise<ProviderResult<HomeFeed>> => ({
      ok: false,
      providerId: 'mock',
      error: new ProviderError('network', 'should not be called', 'mock'),
    }));
    const tracking: ContentProvider = {
      id: 'mock',
      label: 'Tracking',
      enabled: true,
      getHome,
      search: (...args) => mockProvider.search(...args),
      getAnimeDetails: (...args) => mockProvider.getAnimeDetails(...args),
      getEpisodes: (...args) => mockProvider.getEpisodes(...args),
      getStreamSources: (...args) => mockProvider.getStreamSources(...args),
    };
    providerRegistry.register(tracking);

    const home = await catalogService.getHome('mock');
    expect(getHome).not.toHaveBeenCalled();
    expect(home.popular.length).toBeGreaterThan(0);
    expect(home.fromCache).toBeFalsy();
    expect(home.error).toBeUndefined();
  });

  it('falls back to stale cache when provider fails', async () => {
    const seed = await mockProvider.getHome();
    if (!seed.ok) throw new Error('mock seed failed');
    // Expired entry: fresh miss, stale hit.
    await cacheRepo.set('home:mock', seed.data, { category: 'metadata', ttlMs: 1 });
    await new Promise((r) => setTimeout(r, 5));

    const failing: ContentProvider = {
      id: 'mock',
      label: 'Failing',
      enabled: true,
      async getHome(): Promise<ProviderResult<HomeFeed>> {
        return {
          ok: false,
          providerId: 'mock',
          error: new ProviderError('network', 'down', 'mock'),
        };
      },
      search: (...args) => mockProvider.search(...args),
      getAnimeDetails: (...args) => mockProvider.getAnimeDetails(...args),
      getEpisodes: (...args) => mockProvider.getEpisodes(...args),
      getStreamSources: (...args) => mockProvider.getStreamSources(...args),
    };
    providerRegistry.register(failing);

    const home = await catalogService.getHome('mock');
    expect(home.popular.length).toBeGreaterThan(0);
    expect(home.fromCache).toBe(true);
    expect(home.error).toMatch(/cache/i);
    expect(Array.isArray(home.alternatives)).toBe(true);
  });
});
