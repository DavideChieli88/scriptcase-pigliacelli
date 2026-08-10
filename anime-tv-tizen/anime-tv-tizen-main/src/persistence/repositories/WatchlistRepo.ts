import type { WatchlistEntry } from '@/domain/models';
import { idbRequest, withStore } from '../db';
import { STORE } from '../schema';

export class WatchlistRepository {
  async add(entry: WatchlistEntry): Promise<void> {
    await withStore(STORE.watchlist, 'readwrite', (store) => {
      store.put(entry);
    });
  }

  async remove(animeId: string): Promise<void> {
    await withStore(STORE.watchlist, 'readwrite', (store) => {
      store.delete(animeId);
    });
  }

  async has(animeId: string): Promise<boolean> {
    const row = await withStore(STORE.watchlist, 'readonly', (store) =>
      idbRequest(store.get(animeId) as IDBRequest<WatchlistEntry | undefined>),
    );
    return Boolean(row);
  }

  async list(): Promise<WatchlistEntry[]> {
    const all = await withStore(STORE.watchlist, 'readonly', (store) =>
      idbRequest(store.getAll() as IDBRequest<WatchlistEntry[]>),
    );
    return all.sort((a, b) => b.addedAt - a.addedAt);
  }

  async clear(): Promise<void> {
    await withStore(STORE.watchlist, 'readwrite', (store) => {
      store.clear();
    });
  }
}

export const watchlistRepo = new WatchlistRepository();
