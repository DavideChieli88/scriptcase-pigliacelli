import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageLoader } from '@/services/ImageLoader';

describe('ImageLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets fallback immediately when src is missing', () => {
    const loader = new ImageLoader('./fallback.svg', 2);
    const img = document.createElement('img');
    loader.observe(img);
    expect(img.src).toContain('fallback.svg');
    loader.disconnect();
  });

  it('stores dataset.src for lazy observation when IntersectionObserver exists', () => {
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe;
        unobserve = unobserve;
        disconnect = disconnect;
        constructor(cb: IntersectionObserverCallback) {
          void cb;
        }
      },
    );

    const loader = new ImageLoader('./fallback.svg', 2);
    const img = document.createElement('img');
    document.body.appendChild(img);
    loader.observe(img, 'https://example.com/poster.jpg');
    expect(img.dataset.src).toBe('https://example.com/poster.jpg');
    expect(img.decoding).toBe('async');
    expect(observe).toHaveBeenCalledWith(img);

    loader.unobserve(img);
    expect(unobserve).toHaveBeenCalledWith(img);
    expect(img.dataset.src).toBeUndefined();
    loader.disconnect();
    img.remove();
  });

  it('skips fallback flash for URLs already loaded once', async () => {
    let observerCb: IntersectionObserverCallback | null = null;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn((img: Element) => {
          observerCb?.([{ isIntersecting: true, target: img } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        });
        unobserve = vi.fn();
        disconnect = vi.fn();
        constructor(cb: IntersectionObserverCallback) {
          observerCb = cb;
        }
      },
    );

    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decoding = '';
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);

    const loader = new ImageLoader('./fallback.svg', 2);
    const first = document.createElement('img');
    document.body.appendChild(first);
    loader.observe(first, 'https://example.com/cached.jpg');
    await vi.waitFor(() => expect(first.src).toContain('cached.jpg'));

    const second = document.createElement('img');
    document.body.appendChild(second);
    loader.observe(second, 'https://example.com/cached.jpg');
    expect(second.src).toContain('cached.jpg');
    expect(second.dataset.src).toBeUndefined();

    loader.disconnect();
    first.remove();
    second.remove();
  });
});
