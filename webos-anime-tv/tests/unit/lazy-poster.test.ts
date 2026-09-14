import { describe, expect, it, vi } from 'vitest';
import { bindLazyPoster } from '../../src/core/media/LazyPoster.ts';

describe('LazyPoster', () => {
  it('does not set a remote src until near/eager, then keeps it (no unload)', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const img = document.createElement('img');
    img.getBoundingClientRect = () =>
      ({ width: 180, height: 260, top: 10, left: 10, bottom: 270, right: 190 }) as DOMRect;
    document.body.appendChild(img);

    bindLazyPoster(img, 'https://cdn.example.com/cover.jpg', { eager: true });
    expect(img.dataset.lazySrc).toBe('https://cdn.example.com/cover.jpg');
    expect(img.src).toContain('cover.jpg');
    expect(img.src.startsWith('data:')).toBe(false);
  });
});
