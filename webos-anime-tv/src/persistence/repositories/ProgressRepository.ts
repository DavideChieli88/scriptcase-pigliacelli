import { BaseRepository } from './BaseRepository';
import { STORE, type ProgressRecord } from '../types';
import { compositeKey } from '../../core/utils';
import type { WatchProgress } from '../../domain/models';

export class ProgressRepository extends BaseRepository<ProgressRecord> {
  constructor(db: IDBDatabase) {
    super(db, STORE.progress);
  }

  async saveProgress(
    progress: WatchProgress,
    meta?: { animeTitle?: string; episodeNumber?: number; coverUrl?: string },
  ): Promise<ProgressRecord> {
    const id = compositeKey(progress.providerId, progress.episodeId);
    const existing = await this.get(id);
    const record = this.stamp(
      {
        id,
        animeId: progress.animeId,
        episodeId: progress.episodeId,
        providerId: progress.providerId,
        currentTime: progress.currentTime,
        duration: progress.duration,
        percent: progress.percent,
        completed: progress.completed,
        animeTitle: meta?.animeTitle,
        episodeNumber: meta?.episodeNumber,
        coverUrl: meta?.coverUrl,
      },
      existing,
    );
    await this.put(record);
    return record;
  }

  async listContinue(limit = 20): Promise<ProgressRecord[]> {
    const all = await this.getAll();
    return all
      .filter((p) => !p.completed && p.percent > 0.02 && p.percent < 0.98)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  async getForEpisode(providerId: string, episodeId: string): Promise<ProgressRecord | undefined> {
    return this.get(compositeKey(providerId, episodeId));
  }

  async markEpisodeWatched(providerId: string, episodeId: string, animeId: string, watched: boolean): Promise<void> {
    const id = compositeKey(providerId, episodeId);
    const existing = await this.get(id);
    const ts = Date.now();
    if (watched) {
      await this.put(
        this.stamp(
          {
            id,
            animeId,
            episodeId,
            providerId,
            currentTime: existing?.duration ?? 1,
            duration: existing?.duration ?? 1,
            percent: 1,
            completed: true,
            animeTitle: existing?.animeTitle,
            episodeNumber: existing?.episodeNumber,
            coverUrl: existing?.coverUrl,
          },
          existing,
        ),
      );
    } else if (existing) {
      await this.put(
        this.stamp(
          {
            ...existing,
            completed: false,
            percent: Math.min(existing.percent, 0.95),
            updatedAt: ts,
          },
          existing,
        ),
      );
    }
  }
}
