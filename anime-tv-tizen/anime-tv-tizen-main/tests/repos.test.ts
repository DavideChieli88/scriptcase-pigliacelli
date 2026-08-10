import { beforeEach, describe, expect, it } from 'vitest';
import { resetDbHandle, openDatabase } from '@/persistence/db';
import { settingsRepo } from '@/persistence/repositories/SettingsRepo';
import { progressRepo } from '@/persistence/repositories/ProgressRepo';
import { watchlistRepo } from '@/persistence/repositories/WatchlistRepo';
import { historyRepo } from '@/persistence/repositories/HistoryRepo';
import { cacheRepo } from '@/persistence/repositories/CacheRepo';
import { DEFAULT_SETTINGS } from '@/domain/models';

describe('repositories', () => {
  beforeEach(async () => {
    resetDbHandle();
    // Drop DB between tests
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('anime-tv-db');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
    await openDatabase();
  });

  it('stores and loads settings', async () => {
    await settingsRepo.set('debugMode', true);
    expect(await settingsRepo.get('debugMode')).toBe(true);
    const all = await settingsRepo.getAll();
    expect(all.preferredProviderId).toBe(DEFAULT_SETTINGS.preferredProviderId);
    expect(all.debugMode).toBe(true);
  });

  it('saves watch progress', async () => {
    await progressRepo.save({
      animeId: 'mock:a',
      episodeId: 'mock:a:ep1',
      providerId: 'mock',
      currentTime: 30,
      duration: 100,
      percent: 0.3,
      completed: false,
      updatedAt: Date.now(),
    });
    const row = await progressRepo.get('mock:a:ep1');
    expect(row?.percent).toBe(0.3);
    const recent = await progressRepo.listRecent();
    expect(recent.length).toBe(1);
  });

  it('removes progress by episode and by anime', async () => {
    await progressRepo.save({
      animeId: 'mock:a',
      episodeId: 'mock:a:ep1',
      providerId: 'mock',
      currentTime: 30,
      duration: 100,
      percent: 0.3,
      completed: false,
      updatedAt: Date.now(),
    });
    await progressRepo.save({
      animeId: 'mock:a',
      episodeId: 'mock:a:ep2',
      providerId: 'mock',
      currentTime: 10,
      duration: 100,
      percent: 0.1,
      completed: false,
      updatedAt: Date.now(),
    });
    await progressRepo.remove('mock:a:ep1');
    expect(await progressRepo.get('mock:a:ep1')).toBeUndefined();
    expect(await progressRepo.get('mock:a:ep2')).toBeTruthy();
    await progressRepo.removeByAnime('mock:a');
    expect(await progressRepo.get('mock:a:ep2')).toBeUndefined();
  });

  it('manages watchlist and history', async () => {
    await watchlistRepo.add({
      animeId: 'mock:a',
      providerId: 'mock',
      title: 'Test',
      addedAt: Date.now(),
    });
    expect(await watchlistRepo.has('mock:a')).toBe(true);
    await historyRepo.upsert({
      id: 'mock:a',
      animeId: 'mock:a',
      providerId: 'mock',
      title: 'Test',
      updatedAt: Date.now(),
    });
    expect((await historyRepo.list()).length).toBe(1);
  });

  it('caches metadata with get/set', async () => {
    await cacheRepo.set('k1', { hello: 'world' }, { ttlMs: 60_000 });
    const value = await cacheRepo.get<{ hello: string }>('k1');
    expect(value?.hello).toBe('world');
  });
});
