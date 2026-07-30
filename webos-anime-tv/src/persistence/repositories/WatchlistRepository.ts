import { BaseRepository } from './BaseRepository';
import { STORE, type WatchlistRecord } from '../types';
import { compositeKey } from '../../core/utils';
import type { AnimeSummary } from '../../domain/models';

export class WatchlistRepository extends BaseRepository<WatchlistRecord> {
  constructor(db: IDBDatabase) {
    super(db, STORE.watchlist);
  }

  async toggle(anime: AnimeSummary): Promise<boolean> {
    const id = compositeKey(anime.providerId, anime.id);
    const existing = await this.get(id);
    if (existing) {
      await this.delete(id);
      return false;
    }
    await this.put(
      this.stamp({
        id,
        providerId: anime.providerId,
        animeId: anime.id,
        title: anime.title,
        coverUrl: anime.coverUrl,
        year: anime.year,
        genres: anime.genres,
      }),
    );
    return true;
  }

  async has(providerId: string, animeId: string): Promise<boolean> {
    return !!(await this.get(compositeKey(providerId, animeId)));
  }

  async list(): Promise<WatchlistRecord[]> {
    const all = await this.getAll();
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
