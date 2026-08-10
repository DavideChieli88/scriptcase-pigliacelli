import type { AnimeSummary, Episode, StreamSource } from '@/domain/models';
import { AppEvents, eventBus } from '@/state/EventBus';
import { progressTracker } from './ProgressTracker';
import { settingsService } from './SettingsService';
import { formatDuration } from '@/utils/time';
import { logger } from '@/utils/logger';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerSession {
  anime: AnimeSummary;
  episode: Episode;
  source: StreamSource;
}

/**
 * HTML5 video abstraction with resume, throttled progress, next-episode signal.
 */
export class PlayerService {
  private video: HTMLVideoElement | null = null;
  private session: PlayerSession | null = null;
  private state: PlayerState = 'idle';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private nextEpisodePrompted = false;

  attach(video: HTMLVideoElement): void {
    this.detach();
    this.video = video;
    video.addEventListener('play', this.onPlay);
    video.addEventListener('pause', this.onPause);
    video.addEventListener('ended', this.onEnded);
    video.addEventListener('error', this.onError);
    video.addEventListener('timeupdate', this.onTimeUpdate);
  }

  detach(): void {
    this.stopHeartbeat();
    if (!this.video) return;
    this.video.removeEventListener('play', this.onPlay);
    this.video.removeEventListener('pause', this.onPause);
    this.video.removeEventListener('ended', this.onEnded);
    this.video.removeEventListener('error', this.onError);
    this.video.removeEventListener('timeupdate', this.onTimeUpdate);
    this.video = null;
  }

  async load(session: PlayerSession, resumeAt?: number): Promise<void> {
    if (!this.video) throw new Error('Video element not attached');
    this.session = session;
    this.nextEpisodePrompted = false;
    this.setState('loading');

    const { source } = session;
    if (source.type === 'hls') {
      logger.warn('Player', 'HLS not natively guaranteed on Tizen 6.5 — prefer MP4');
    }

    this.video.src = source.url;
    this.video.load();

    await new Promise<void>((resolve, reject) => {
      const video = this.video!;
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('Video load failed'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('error', onErr);
      };
      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('error', onErr);
    });

    const start =
      resumeAt !== undefined
        ? resumeAt
        : (await progressTracker.load(session.episode.id))?.currentTime || 0;

    if (start > 2 && Number.isFinite(start)) {
      try {
        this.video.currentTime = start;
      } catch {
        /* ignore seek errors */
      }
    }

    await progressTracker.recordHistory(session.anime, session.episode);
    await this.play();
  }

  async play(): Promise<void> {
    if (!this.video) return;
    try {
      await this.video.play();
      this.setState('playing');
      this.startHeartbeat();
    } catch (err) {
      logger.error('Player', 'play() failed', err);
      this.setState('error');
      throw err instanceof Error ? err : new Error('play() failed');
    }
  }

  pause(): void {
    this.video?.pause();
    this.setState('paused');
    void this.saveProgress(true);
  }

  togglePlayPause(): void {
    if (!this.video) return;
    if (this.video.paused) void this.play().catch(() => undefined);
    else this.pause();
  }

  seek(deltaSeconds: number): void {
    if (!this.video || !Number.isFinite(this.video.duration)) return;
    const next = Math.max(0, Math.min(this.video.duration, this.video.currentTime + deltaSeconds));
    this.video.currentTime = next;
    this.recordProgress();
  }

  getCurrentTime(): number {
    return this.video?.currentTime ?? 0;
  }

  getDuration(): number {
    return this.video?.duration ?? 0;
  }

  getState(): PlayerState {
    return this.state;
  }

  getSession(): PlayerSession | null {
    return this.session;
  }

  formatTimes(): { current: string; duration: string; percent: number } {
    const current = this.getCurrentTime();
    const duration = this.getDuration();
    return {
      current: formatDuration(current),
      duration: formatDuration(duration),
      percent: duration > 0 ? current / duration : 0,
    };
  }

  async destroy(): Promise<void> {
    await this.saveProgress(true);
    this.stopHeartbeat();
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    }
    this.session = null;
    this.setState('idle');
  }

  private recordProgress(): void {
    if (!this.session || !this.video) return;
    progressTracker.record(
      this.session.anime,
      this.session.episode,
      this.video.currentTime,
      this.video.duration || 0,
    );
  }

  private async saveProgress(force = false): Promise<void> {
    this.recordProgress();
    if (force) await progressTracker.flush();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const interval = settingsService.get().progressSaveIntervalMs || 5000;
    this.heartbeatTimer = setInterval(() => {
      this.recordProgress();
      void progressTracker.flush();
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setState(state: PlayerState): void {
    this.state = state;
    eventBus.emit(AppEvents.PLAYER_STATE, state);
  }

  private readonly onPlay = (): void => {
    this.setState('playing');
    this.startHeartbeat();
  };

  private readonly onPause = (): void => {
    this.setState('paused');
    void this.saveProgress(true);
  };

  private readonly onEnded = (): void => {
    this.setState('ended');
    void this.saveProgress(true);
    eventBus.emit(AppEvents.PLAYER_STATE, 'ended');
  };

  private readonly onError = (): void => {
    this.setState('error');
    logger.error('Player', 'video error', this.video?.error);
  };

  private readonly onTimeUpdate = (): void => {
    if (!this.video) return;
    const times = this.formatTimes();
    eventBus.emit(AppEvents.PLAYER_TIME, times);

    const threshold = settingsService.get().nextEpisodePromptThreshold;
    if (!this.nextEpisodePrompted && times.percent >= threshold) {
      this.nextEpisodePrompted = true;
      eventBus.emit(AppEvents.PLAYER_NEXT_PROMPT, this.session);
    }
  };
}

export const playerService = new PlayerService();
