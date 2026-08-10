import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbHandle, openDatabase } from '@/persistence/db';
import { ProviderRegistry } from '@/providers/registry';
import { MockProvider } from '@/providers/mock/MockProvider';
import { providerStateRepo } from '@/persistence/repositories/ProviderStateRepo';
import { catalogService } from '@/services/CatalogService';
import { settingsService } from '@/services/SettingsService';
import { cacheService } from '@/services/CacheService';
import { providerRegistry } from '@/providers/registry';
import { ProviderError } from '@/domain/errors';
import type { ContentProvider, ProviderResult } from '@/providers/types';
import type { HomeFeed } from '@/domain/models';

describe('ProviderRegistry', () => {
  it('orders preferred first in resolveChain', async () => {
    const registry = new ProviderRegistry();
    registry.register(new MockProvider('a', 'A'));
    registry.register(new MockProvider('b', 'B'));
    const chain = await registry.resolveChain('b');
    expect(chain.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('cycles nextEnabled', () => {
    const registry = new ProviderRegistry();
    registry.register(new MockProvider('a', 'A'));
    registry.register(new MockProvider('b', 'B'));
    expect(registry.nextEnabled('a')?.id).toBe('b');
    expect(registry.nextEnabled('b')?.id).toBe('a');
  });
});

describe('Catalog multi-provider fallback', () => {
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
    await cacheService.clear();

    // Reset global registry entries used by catalogService
    for (const p of providerRegistry.list()) {
      providerRegistry.unregister(p.id);
    }
  });

  it('falls through to second provider when first fails without cache', async () => {
    const failing: ContentProvider = {
      id: 'fail',
      label: 'Fail',
      enabled: true,
      async getHome(): Promise<ProviderResult<HomeFeed>> {
        return {
          ok: false,
          providerId: 'fail',
          error: new ProviderError('network', 'down', 'fail'),
        };
      },
      search: async () => ({ ok: true, data: [], providerId: 'fail' }),
      getAnimeDetails: async () => ({
        ok: false,
        providerId: 'fail',
        error: new ProviderError('empty', 'x', 'fail'),
      }),
      getEpisodes: async () => ({ ok: true, data: [], providerId: 'fail' }),
      getStreamSources: async () => ({ ok: true, data: [], providerId: 'fail' }),
    };
    const ok = new MockProvider('ok', 'OK');
    providerRegistry.register(failing);
    providerRegistry.register(ok);
    await settingsService.update({ preferredProviderId: 'fail' });

    const home = await catalogService.getHome('fail');
    expect(home.providerId).toBe('ok');
    expect(home.popular.length).toBeGreaterThan(0);
    expect(home.alternatives.some((a) => a.id === 'fail')).toBe(true);
  });

  it('records provider backoff state on failure', async () => {
    const failing: ContentProvider = {
      id: 'only-fail',
      label: 'OnlyFail',
      enabled: true,
      async getHome(): Promise<ProviderResult<HomeFeed>> {
        return {
          ok: false,
          providerId: 'only-fail',
          error: new ProviderError('network', 'down', 'only-fail'),
        };
      },
      search: async () => ({ ok: true, data: [], providerId: 'only-fail' }),
      getAnimeDetails: async () => ({
        ok: false,
        providerId: 'only-fail',
        error: new ProviderError('empty', 'x', 'only-fail'),
      }),
      getEpisodes: async () => ({ ok: true, data: [], providerId: 'only-fail' }),
      getStreamSources: async () => ({ ok: true, data: [], providerId: 'only-fail' }),
    };
    providerRegistry.register(failing);
    await catalogService.getHome('only-fail');
    const state = await providerStateRepo.get('only-fail');
    expect(state?.lastError).toBe('down');
    expect(state?.disabledUntil).toBeGreaterThan(Date.now());
  });
});
