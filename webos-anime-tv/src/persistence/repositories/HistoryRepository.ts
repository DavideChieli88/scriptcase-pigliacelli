import { BaseRepository } from './BaseRepository';
import { STORE, type HistoryRecord } from '../types';
import { compositeKey } from '../../core/utils';

export class HistoryRepository extends BaseRepository<HistoryRecord> {
  constructor(db: IDBDatabase) {
    super(db, STORE.history);
  }

  async upsertOpen(input: {
    providerId: string;
    animeId: string;
    title: string;
    coverUrl?: string;
  }): Promise<HistoryRecord> {
    const id = compositeKey(input.providerId, input.animeId);
    const existing = await this.get(id);
    const record = this.stamp(
      {
        id,
        providerId: input.providerId,
        animeId: input.animeId,
        title: input.title || existing?.title || input.animeId,
        // Prefer freshest non-empty cover.
        coverUrl: input.coverUrl || existing?.coverUrl,
        openedAt: Date.now(),
      },
      existing,
    );
    await this.put(record);
    return record;
  }

  async updateCover(providerId: string, animeId: string, coverUrl: string, title?: string): Promise<void> {
    const id = compositeKey(providerId, animeId);
    const existing = await this.get(id);
    if (!existing) return;
    await this.put(
      this.stamp(
        {
          ...existing,
          title: title || existing.title,
          coverUrl,
        },
        existing,
      ),
    );
  }

  async listRecent(limit = 40): Promise<HistoryRecord[]> {
    const all = await this.getAll();
    return all.sort((a, b) => b.openedAt - a.openedAt).slice(0, limit);
  }
}
