import { logger } from '../core/logging/Logger';
import type { StreamSource } from '../domain/models';
import type { ProgressTracker } from './ProgressTracker';

export interface PlayerBindMeta {
  animeId: string;
  episodeId: string;
  providerId: string;
  animeTitle?: string;
  episodeNumber?: number;
  coverUrl?: string;
  resumeAt?: number;
}

type HlsInstance = {
  destroy: () => void;
  loadSource: (url: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  on: (event: string, cb: (...args: never[]) => void) => void;
};

type HlsConstructor = {
  new (config?: Record<string, unknown>): HlsInstance;
  isSupported: () => boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
};

function mediaErrorMessage(video: HTMLVideoElement): string {
  const err = video.error;
  if (!err) return 'Video load error';
  switch (err.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'Caricamento video interrotto';
    case MediaError.MEDIA_ERR_NETWORK:
      return 'Errore di rete nel caricamento video';
    case MediaError.MEDIA_ERR_DECODE:
      return 'Impossibile decodificare il video';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'Formato/URL video non supportato';
    default:
      return `Video load error (${err.code})`;
  }
}

function preferSources(sources: StreamSource[]): StreamSource[] {
  const score = (s: StreamSource) => {
    if (s.type === 'mp4') return 0;
    if (s.type === 'hls') return 1;
    return 2;
  };
  return [...sources].sort((a, b) => score(a) - score(b));
}

export class PlayerService {
  private video: HTMLVideoElement | null = null;
  private source: StreamSource | null = null;
  private hls: HlsInstance | null = null;

  constructor(private progressTracker: ProgressTracker) {}

  bind(video: HTMLVideoElement): void {
    this.video = video;
  }

  async play(source: StreamSource, meta: PlayerBindMeta): Promise<void> {
    await this.playFirstWorking([source], meta);
  }

  async playFirstWorking(sources: StreamSource[], meta: PlayerBindMeta): Promise<void> {
    if (!this.video) throw new Error('Video element not bound');
    if (!sources.length) throw new Error('Nessuna sorgente video');

    let lastError = 'Video load error';
    for (const source of preferSources(sources)) {
      try {
        await this.loadSource(source, meta);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        logger.warn('Source failed', { url: source.url, type: source.type, lastError });
        this.destroyHls();
      }
    }
    throw new Error(lastError);
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  private async loadSource(source: StreamSource, meta: PlayerBindMeta): Promise<void> {
    if (!this.video) throw new Error('Video element not bound');
    this.destroyHls();
    this.source = source;
    this.video.preload = 'metadata';
    this.video.crossOrigin = null;
    this.video.removeAttribute('src');

    const isHls = source.type === 'hls' || /\.m3u8(\?|$)/i.test(source.url);

    if (isHls) {
      await this.attachHls(source.url);
    } else {
      this.video.src = source.url;
    }

    this.progressTracker.attach(this.video, meta);
    await this.waitForMetadata(meta);

    try {
      await this.video.play();
    } catch (e) {
      logger.warn('Autoplay blocked or failed', e);
    }
  }

  private async attachHls(url: string): Promise<void> {
    if (!this.video) throw new Error('Video element not bound');

    if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = url;
      return;
    }

    const { default: Hls } = (await import('hls.js')) as { default: HlsConstructor };
    if (!Hls.isSupported()) {
      throw new Error('HLS non supportato su questo dispositivo');
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
    });
    this.hls = hls;

    await new Promise<void>((resolve, reject) => {
      const onError = (...args: never[]) => {
        const data = args[1] as { fatal?: boolean; type?: string; details?: string } | undefined;
        if (!data?.fatal) return;
        logger.warn('HLS fatal error', data);
        hls.destroy();
        if (this.hls === hls) this.hls = null;
        reject(new Error(`HLS error: ${data.details || data.type || 'fatal'}`));
      };
      hls.on(Hls.Events.MANIFEST_PARSED, (() => resolve()) as (...args: never[]) => void);
      hls.on(Hls.Events.ERROR, onError);
      hls.loadSource(url);
      hls.attachMedia(this.video!);
    });
  }

  private waitForMetadata(meta: PlayerBindMeta): Promise<void> {
    if (!this.video) return Promise.reject(new Error('Video element not bound'));

    return new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        if (meta.resumeAt && meta.resumeAt > 5 && Number.isFinite(meta.resumeAt)) {
          try {
            this.video!.currentTime = meta.resumeAt;
          } catch {
            // ignore seek failures before enough data
          }
        }
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(mediaErrorMessage(this.video!)));
      };
      const cleanup = () => {
        this.video?.removeEventListener('loadedmetadata', onReady);
        this.video?.removeEventListener('error', onError);
      };
      if (this.video!.readyState >= 1) {
        onReady();
        return;
      }
      this.video!.addEventListener('loadedmetadata', onReady);
      this.video!.addEventListener('error', onError);
    });
  }

  pause(): void {
    this.video?.pause();
  }

  resume(): void {
    void this.video?.play();
  }

  togglePlayPause(): void {
    if (!this.video) return;
    if (this.video.paused) this.resume();
    else this.pause();
  }

  seekBy(deltaSeconds: number): void {
    if (!this.video || !Number.isFinite(this.video.duration)) return;
    const next = Math.max(0, Math.min(this.video.duration, this.video.currentTime + deltaSeconds));
    this.video.currentTime = next;
  }

  seekToRatio(ratio: number): void {
    if (!this.video || !Number.isFinite(this.video.duration) || this.video.duration <= 0) return;
    const r = Math.max(0, Math.min(1, ratio));
    this.video.currentTime = this.video.duration * r;
  }

  getProgressRatio(): number {
    if (!this.video || !this.video.duration) return 0;
    return Math.max(0, Math.min(1, this.video.currentTime / this.video.duration));
  }

  async stop(): Promise<void> {
    await this.progressTracker.tick(true);
    this.progressTracker.detach();
    this.destroyHls();
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    }
    this.source = null;
  }

  getCurrentTime(): number {
    return this.video?.currentTime ?? 0;
  }

  getDuration(): number {
    return this.video?.duration ?? 0;
  }

  getSource(): StreamSource | null {
    return this.source;
  }
}
