import type { WatchProgress } from '../domain/models';
import type { ProgressRepository } from '../persistence/repositories/ProgressRepository';
import type { LastSeenRepository } from '../persistence/repositories/LastSeenRepository';
import { clamp } from '../core/utils';
import { logger } from '../core/logging/Logger';

export interface ProgressTrackerOptions {
  heartbeatMs: number;
  completionThreshold: number;
}

export class ProgressTracker {
  private timer = 0;
  private video: HTMLVideoElement | null = null;
  private meta: {
    animeId: string;
    episodeId: string;
    providerId: string;
    animeTitle?: string;
    episodeNumber?: number;
    coverUrl?: string;
  } | null = null;

  constructor(
    private progressRepo: ProgressRepository,
    private lastSeenRepo: LastSeenRepository,
    private options: ProgressTrackerOptions,
  ) {}

  setCompletionThreshold(value: number): void {
    this.options.completionThreshold = value;
  }

  attach(
    video: HTMLVideoElement,
    meta: {
      animeId: string;
      episodeId: string;
      providerId: string;
      animeTitle?: string;
      episodeNumber?: number;
      coverUrl?: string;
    },
  ): void {
    this.detach();
    this.video = video;
    this.meta = meta;
    this.timer = window.setInterval(() => void this.tick(), this.options.heartbeatMs);
    video.addEventListener('pause', this.onPause);
    video.addEventListener('ended', this.onEnded);
  }

  detach(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
    if (this.video) {
      this.video.removeEventListener('pause', this.onPause);
      this.video.removeEventListener('ended', this.onEnded);
    }
    this.video = null;
    this.meta = null;
  }

  private onPause = (): void => {
    void this.tick(true);
  };

  private onEnded = (): void => {
    void this.tick(true, true);
  };

  async tick(force = false, forceCompleted = false): Promise<WatchProgress | null> {
    if (!this.video || !this.meta) return null;
    if (!force && this.video.paused) return null;

    const duration = this.video.duration || 0;
    const currentTime = this.video.currentTime || 0;
    if (!duration || Number.isNaN(duration)) return null;

    const percent = clamp(currentTime / duration, 0, 1);
    const completed = forceCompleted || percent >= this.options.completionThreshold;

    const progress: WatchProgress = {
      animeId: this.meta.animeId,
      episodeId: this.meta.episodeId,
      providerId: this.meta.providerId,
      currentTime: completed ? duration : currentTime,
      duration,
      percent: completed ? 1 : percent,
      completed,
      updatedAt: Date.now(),
    };

    await this.progressRepo.saveProgress(progress, {
      animeTitle: this.meta.animeTitle,
      episodeNumber: this.meta.episodeNumber,
      coverUrl: this.meta.coverUrl,
    });

    await this.lastSeenRepo.set({
      providerId: this.meta.providerId,
      animeId: this.meta.animeId,
      episodeId: this.meta.episodeId,
      title: this.meta.animeTitle ?? this.meta.animeId,
      episodeNumber: this.meta.episodeNumber,
      coverUrl: this.meta.coverUrl,
    });

    logger.debug('Progress saved', progress);
    return progress;
  }
}
