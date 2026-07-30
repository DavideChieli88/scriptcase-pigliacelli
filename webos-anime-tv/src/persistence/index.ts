import { openDatabase, clearAllStores } from './db';
import type { AppConfig } from '../core/config/AppConfig';
import { SettingsRepository } from './repositories/SettingsRepository';
import { HistoryRepository } from './repositories/HistoryRepository';
import { ProgressRepository } from './repositories/ProgressRepository';
import { WatchlistRepository } from './repositories/WatchlistRepository';
import { CacheRepository } from './repositories/CacheRepository';
import { ProviderStateRepository } from './repositories/ProviderStateRepository';
import { LastSeenRepository } from './repositories/LastSeenRepository';

export interface Persistence {
  db: IDBDatabase;
  settings: SettingsRepository;
  history: HistoryRepository;
  progress: ProgressRepository;
  watchlist: WatchlistRepository;
  cache: CacheRepository;
  providerState: ProviderStateRepository;
  lastSeen: LastSeenRepository;
  resetAll(): Promise<void>;
}

export async function createPersistence(config: AppConfig): Promise<Persistence> {
  const db = await openDatabase();
  const settings = new SettingsRepository(db);
  await settings.getOrCreate(config);

  return {
    db,
    settings,
    history: new HistoryRepository(db),
    progress: new ProgressRepository(db),
    watchlist: new WatchlistRepository(db),
    cache: new CacheRepository(db, config.cacheMaxEntries),
    providerState: new ProviderStateRepository(db),
    lastSeen: new LastSeenRepository(db),
    async resetAll() {
      await clearAllStores(db);
      await settings.getOrCreate(config);
    },
  };
}
