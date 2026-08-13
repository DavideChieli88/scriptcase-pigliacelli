/**
 * TV-oriented poster loader for webOS (QNED / limited RAM):
 * - load only when near viewport (IntersectionObserver) or focused
 * - cap concurrent downloads
 * - drop `src` when off-screen so decoded bitmaps can be freed
 * - no IndexedDB image blobs (browser HTTP cache is enough)
 */

const MAX_CONCURRENT = 6;
const UNLOAD_DELAY_MS = 2800;
const ROOT_MARGIN = '160px 240px';

/** Tiny transparent GIF — avoids broken-image icon when src is cleared. */
const EMPTY_SRC =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

class LazyPosterController {
  private queue: HTMLImageElement[] = [];
  private active = 0;
  private io: IntersectionObserver | null = null;
  private unloadTimers = new WeakMap<HTMLImageElement, number>();
  private observed = new WeakSet<HTMLImageElement>();

  constructor() {
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const img = entry.target as HTMLImageElement;
            if (entry.isIntersecting) this.enqueue(img, false);
            else this.scheduleUnload(img);
          }
        },
        { root: null, rootMargin: ROOT_MARGIN, threshold: 0.01 },
      );
    }
  }

  /** Bind a poster img to lazy loading. Does not set src until visible/focused. */
  bind(img: HTMLImageElement, url: string, options?: { eager?: boolean }): void {
    if (!url) return;
    img.dataset.lazySrc = url;
    img.decoding = 'async';
    img.setAttribute('draggable', 'false');
    if (!img.getAttribute('alt')) img.alt = '';
    img.classList.add('is-lazy');
    if (!img.src || img.src === EMPTY_SRC || img.src.endsWith('/')) {
      img.src = EMPTY_SRC;
      img.classList.add('is-pending');
    }

    if (options?.eager) {
      this.enqueue(img, true);
      return;
    }

    if (this.io) {
      if (!this.observed.has(img)) {
        this.observed.add(img);
        this.io.observe(img);
      }
    } else {
      // Older webOS without IO: still queue-limited, load soon after bind.
      this.enqueue(img, false);
    }
  }

  /** Prefer loading this poster and nearby cards (remote D-pad focus). */
  prioritizeNear(el: HTMLElement | null | undefined): void {
    if (!el) return;
    const card = (el.closest('.card') as HTMLElement | null) || el;
    const own = card.querySelector('img[data-lazy-src]') as HTMLImageElement | null;
    if (own) this.enqueue(own, true);

    const track = card.parentElement;
    if (!track) return;
    const siblings = [...track.children];
    const idx = siblings.indexOf(card);
    if (idx < 0) return;
    for (const offset of [-2, -1, 1, 2]) {
      const sibling = siblings[idx + offset] as HTMLElement | undefined;
      const img = sibling?.querySelector?.('img[data-lazy-src]') as HTMLImageElement | null;
      if (img) this.enqueue(img, false);
    }
  }

  /** Re-scan after large DOM inserts (e.g. load-more catalog). */
  hydrate(root: ParentNode = document): void {
    root.querySelectorAll('img[data-lazy-src]').forEach((node) => {
      const img = node as HTMLImageElement;
      if (!img.dataset.lazySrc) return;
      if (this.io && !this.observed.has(img)) {
        this.observed.add(img);
        this.io.observe(img);
      }
    });
  }

  private cancelUnload(img: HTMLImageElement): void {
    const t = this.unloadTimers.get(img);
    if (t != null) {
      window.clearTimeout(t);
      this.unloadTimers.delete(img);
    }
  }

  private scheduleUnload(img: HTMLImageElement): void {
    this.cancelUnload(img);
    const timer = window.setTimeout(() => {
      this.unloadTimers.delete(img);
      if (!img.isConnected) return;
      const url = img.dataset.lazySrc;
      if (!url) return;
      // Still on screen? (scroll / focus race)
      const rect = img.getBoundingClientRect();
      const vw = window.innerWidth || 1920;
      const vh = window.innerHeight || 1080;
      const margin = 80;
      const visible =
        rect.bottom > -margin &&
        rect.right > -margin &&
        rect.top < vh + margin &&
        rect.left < vw + margin;
      if (visible) return;

      img.src = EMPTY_SRC;
      img.classList.add('is-pending');
      delete img.dataset.lazyReady;
    }, UNLOAD_DELAY_MS);
    this.unloadTimers.set(img, timer);
  }

  private enqueue(img: HTMLImageElement, front: boolean): void {
    this.cancelUnload(img);
    if (!img.isConnected) return;
    const url = img.dataset.lazySrc;
    if (!url) return;
    if (img.dataset.lazyReady === '1' && img.src && !img.src.startsWith('data:')) return;

    this.queue = this.queue.filter((q) => q !== img && q.isConnected);
    if (front) this.queue.unshift(img);
    else this.queue.push(img);
    this.pump();
  }

  private pump(): void {
    while (this.active < MAX_CONCURRENT && this.queue.length) {
      const img = this.queue.shift()!;
      if (!img.isConnected) continue;
      const url = img.dataset.lazySrc;
      if (!url) continue;
      if (img.dataset.lazyReady === '1' && img.src && !img.src.startsWith('data:')) continue;

      this.active += 1;
      const finish = () => {
        this.active = Math.max(0, this.active - 1);
        this.pump();
      };

      const onDone = () => {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onError);
        img.classList.remove('is-pending');
        img.dataset.lazyReady = '1';
        finish();
      };
      const onError = () => {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onError);
        img.classList.add('is-pending');
        delete img.dataset.lazyReady;
        img.src = EMPTY_SRC;
        finish();
        this.replaceWithPlaceholder(img);
      };

      img.addEventListener('load', onDone);
      img.addEventListener('error', onError);
      img.classList.add('is-pending');
      img.src = url;
    }
  }

  private replaceWithPlaceholder(img: HTMLImageElement): void {
    if (!img.isConnected || !img.parentElement) return;
    const ph = document.createElement('div');
    if (img.classList.contains('details-cover')) {
      ph.className = 'details-cover';
    } else {
      ph.className = 'card-poster placeholder';
      ph.textContent = 'Nessuna cover';
    }
    img.replaceWith(ph);
  }
}

export const lazyPoster = new LazyPosterController();

export function bindLazyPoster(
  img: HTMLImageElement,
  url: string,
  options?: { eager?: boolean },
): void {
  lazyPoster.bind(img, url, options);
}
