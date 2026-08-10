import { APP_CONFIG } from '@/app/config';
import { logger } from '@/utils/logger';

/**
 * Progressive image loading with lazy offscreen posters,
 * bounded concurrency, and fallback (TV memory safe).
 */
export class ImageLoader {
  private readonly observer: IntersectionObserver | null;
  private readonly fallback: string;
  private readonly maxConcurrent: number;
  private active = 0;
  private readonly queue: Array<() => void> = [];
  /** URLs that loaded successfully — skip fallback flash on remount. */
  private readonly ready = new Set<string>();

  constructor(
    fallback: string = APP_CONFIG.imageFallback,
    maxConcurrent: number = APP_CONFIG.imageMaxConcurrent,
  ) {
    this.fallback = fallback;
    this.maxConcurrent = Math.max(1, maxConcurrent);
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              this.observer?.unobserve(img);
              this.enqueue(() => this.load(img, src));
            }
          }
        },
        { rootMargin: '320px' },
      );
    } else {
      this.observer = null;
    }
  }

  observe(img: HTMLImageElement, src?: string): void {
    img.decoding = 'async';
    img.loading = 'lazy';
    img.onerror = () => {
      img.onerror = null;
      img.src = this.fallback;
    };

    if (!src) {
      img.src = this.fallback;
      return;
    }

    if (this.ready.has(src)) {
      img.src = src;
      delete img.dataset.src;
      return;
    }

    if (this.observer) {
      img.dataset.src = src;
      img.src = this.fallback;
      this.observer.observe(img);
    } else {
      this.enqueue(() => this.load(img, src));
    }
  }

  unobserve(img: HTMLImageElement): void {
    this.observer?.unobserve(img);
    delete img.dataset.src;
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.queue.length = 0;
    this.active = 0;
  }

  private enqueue(job: () => void): void {
    this.queue.push(job);
    this.pump();
  }

  private pump(): void {
    while (this.active < this.maxConcurrent && this.queue.length) {
      const job = this.queue.shift();
      if (!job) break;
      this.active++;
      job();
    }
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    this.pump();
  }

  private load(img: HTMLImageElement, src: string): void {
    if (!img.isConnected) {
      this.release();
      return;
    }

    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => {
      this.ready.add(src);
      if (img.isConnected) {
        img.src = src;
        delete img.dataset.src;
      }
      this.release();
    };
    probe.onerror = () => {
      logger.debug('ImageLoader', `fallback for ${src}`);
      if (img.isConnected) {
        img.src = this.fallback;
        delete img.dataset.src;
      }
      this.release();
    };
    probe.src = src;
  }
}

export const imageLoader = new ImageLoader();
