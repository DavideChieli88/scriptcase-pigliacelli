import type { WatchProgress } from '@/domain/models';
import { idbRequest, withStore } from '../db';
import { STORE } from '../schema';

export class ProgressRepository {
  async save(progress: WatchProgress): Promise<void> {
    await withStore(STORE.progress, 'readwrite', (store) => {
      store.put(progress);
    });
  }

  async get(episodeId: string): Promise<WatchProgress | undefined> {
    return withStore(STORE.progress, 'readonly', (store) =>
      idbRequest(store.get(episodeId) as IDBRequest<WatchProgress | undefined>),
    );
  }

  async listByAnime(animeId: string): Promise<WatchProgress[]> {
    return withStore(STORE.progress, 'readonly', (store) => {
      const index = store.index('animeId');
      return idbRequest(index.getAll(animeId) as IDBRequest<WatchProgress[]>);
    });
  }

  async listRecent(limit = 20): Promise<WatchProgress[]> {
    const all = await withStore(STORE.progress, 'readonly', (store) =>
      idbRequest(store.getAll() as IDBRequest<WatchProgress[]>),
    );
    return all
      .filter((p) => !p.completed && p.percent > 0.02)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  async markCompleted(episodeId: string, completed: boolean): Promise<void> {
    const existing = await this.get(episodeId);
    if (!existing) return;
    await this.save({
      ...existing,
      completed,
      percent: completed ? Math.max(existing.percent, 1) : existing.percent,
      updatedAt: Date.now(),
    });
  }

  async remove(episodeId: string): Promise<void> {
    await withStore(STORE.progress, 'readwrite', (store) => {
      store.delete(episodeId);
    });
  }

  async removeByAnime(animeId: string): Promise<void> {
    const rows = await this.listByAnime(animeId);
    if (!rows.length) return;
    await withStore(STORE.progress, 'readwrite', (store) => {
      for (const row of rows) {
        store.delete(row.episodeId);
      }
    });
  }

  async clear(): Promise<void> {
    await withStore(STORE.progress, 'readwrite', (store) => {
      store.clear();
    });
  }
}

export const progressRepo = new ProgressRepository();
