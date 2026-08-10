import type { AnimeSummary, Episode, WatchProgress } from '@/domain/models';
import { progressRepo } from '@/persistence/repositories/ProgressRepo';
import { historyRepo } from '@/persistence/repositories/HistoryRepo';
import { settingsService } from './SettingsService';
import { AppEvents, eventBus } from '@/state/EventBus';
import { percentOf, now } from '@/utils/time';
import { throttle } from '@/utils/throttle';
import { logger } from '@/utils/logger';

export class ProgressTracker {
  private readonly saveThrottled: ReturnType<typeof throttle> & {
    flush: () => void;
    cancel: () => void;
  };

  private pending: WatchProgress | null = null;
  private pendingAnime: AnimeSummary | null = null;
  private pendingEpisode: Episode | null = null;

  constructor() {
    this.saveThrottled = throttle(() => {
      void this.flush();
    }, 5000);
  }

  async load(episodeId: string): Promise<WatchProgress | undefined> {
    return progressRepo.get(episodeId);
  }

  record(
    anime: AnimeSummary,
    episode: Episode,
    currentTime: number,
    duration: number,
  ): void {
    const settings = settingsService.get();
    const percent = percentOf(currentTime, duration);
    const completed = percent >= settings.completionThreshold;

    this.pendingAnime = anime;
    this.pendingEpisode = episode;
    this.pending = {
      animeId: anime.id,
      episodeId: episode.id,
      providerId: anime.providerId,
      currentTime,
      duration,
      percent,
      completed,
      updatedAt: now(),
    };

    this.saveThrottled();
    eventBus.emit(AppEvents.PROGRESS_UPDATE, this.pending);
  }

  async flush(): Promise<void> {
    if (!this.pending) return;
    const progress = this.pending;
    const anime = this.pendingAnime;
    const episode = this.pendingEpisode;

    await progressRepo.save(progress);

    if (anime) {
      await this.recordHistory(anime, episode || undefined);
    }

    logger.debug(
      'Progress',
      `saved ${progress.episodeId} ${Math.round(progress.percent * 100)}%`,
    );
  }

  async recordHistory(anime: AnimeSummary, episode?: Episode): Promise<void> {
    const settings = settingsService.get();
    if (!settings.historyEnabled) return;

    const prev = await historyRepo.get(anime.id);

    await historyRepo.upsert({
      id: anime.id,
      animeId: anime.id,
      providerId: anime.providerId,
      title: anime.title || prev?.title || '',
      posterUrl: anime.posterUrl || prev?.posterUrl,
      episodeId: episode?.id ?? prev?.episodeId,
      episodeNumber: episode?.number ?? prev?.episodeNumber,
      updatedAt: now(),
    });
  }

  async markEpisode(
    anime: AnimeSummary,
    episode: Episode,
    completed: boolean,
  ): Promise<void> {
    const existing = await progressRepo.get(episode.id);
    const progress: WatchProgress = {
      animeId: anime.id,
      episodeId: episode.id,
      providerId: anime.providerId,
      currentTime: completed ? existing?.duration || existing?.currentTime || 0 : 0,
      duration: existing?.duration || 0,
      percent: completed ? 1 : 0,
      completed,
      updatedAt: now(),
    };
    await progressRepo.save(progress);
    await this.recordHistory(anime, episode);
    eventBus.emit(AppEvents.PROGRESS_UPDATE, progress);
  }

  /**
   * Prefer in-progress episode; else the episode after the last completed
   * (by episode number); else the first episode.
   */
  pickResumeEpisode(
    episodes: Episode[],
    progressList: WatchProgress[],
  ): Episode | undefined {
    if (!episodes.length) return undefined;
    const byId = new Map(progressList.map((p) => [p.episodeId, p]));

    const inProgress = progressList
      .filter((p) => !p.completed && p.percent > 0.02)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (inProgress) {
      const ep = episodes.find((e) => e.id === inProgress.episodeId);
      if (ep) return ep;
    }

    let lastCompletedNumber = 0;
    for (const ep of episodes) {
      if (byId.get(ep.id)?.completed) {
        lastCompletedNumber = Math.max(lastCompletedNumber, ep.number);
      }
    }

    if (lastCompletedNumber <= 0) return episodes[0];

    return (
      episodes.find((e) => e.number === lastCompletedNumber + 1) ||
      episodes.find((e) => e.number > lastCompletedNumber) ||
      episodes[0]
    );
  }

  /** Episode to play plus CTA label (`Continua ep. N` / `Guarda ep. N`). */
  resolvePlayAction(
    episodes: Episode[],
    progressList: WatchProgress[],
  ): { episode: Episode; label: string; continuing: boolean } | undefined {
    const episode = this.pickResumeEpisode(episodes, progressList);
    if (!episode) return undefined;

    const progress = progressList.find((p) => p.episodeId === episode.id);
    const continuing = Boolean(
      progress && !progress.completed && progress.percent > 0.02,
    );

    return {
      episode,
      continuing,
      label: continuing
        ? `Continua ep. ${episode.number}`
        : `Guarda ep. ${episode.number}`,
    };
  }

  async getAnimeProgress(animeId: string): Promise<WatchProgress[]> {
    return progressRepo.listByAnime(animeId);
  }

  cancel(): void {
    this.saveThrottled.cancel();
    this.pending = null;
    this.pendingAnime = null;
    this.pendingEpisode = null;
  }

  /** Clears all watch progress (empties “Continua a guardare”). */
  async clearAll(): Promise<void> {
    this.cancel();
    await progressRepo.clear();
    eventBus.emit(AppEvents.PROGRESS_UPDATE, null);
  }

  /** Removes one episode from Continua a guardare. */
  async removeContinue(episodeId: string): Promise<void> {
    if (this.pending?.episodeId === episodeId) {
      this.cancel();
    }
    await progressRepo.remove(episodeId);
    eventBus.emit(AppEvents.PROGRESS_UPDATE, null);
  }

  /** Removes one title from Ultimi visualizzati (does not clear progress). */
  async removeFromHistory(animeId: string): Promise<void> {
    await historyRepo.remove(animeId);
    eventBus.emit(AppEvents.PROGRESS_UPDATE, null);
  }
}

export const progressTracker = new ProgressTracker();
