import { describe, expect, it } from 'vitest';
import { absolutizeUrl, joinAdapterUrl } from '@/providers/adapters/dom';

describe('joinAdapterUrl', () => {
  const origin = location.origin;

  it('keeps absolute http(s) hrefs', () => {
    expect(joinAdapterUrl('https://img.example/p.jpg', '/__as/')).toBe(
      'https://img.example/p.jpg',
    );
  });

  it('joins Vite proxy base with root-absolute paths without dropping prefix', () => {
    expect(joinAdapterUrl('/', '/__as/')).toBe(`${origin}/__as/`);
    expect(joinAdapterUrl('/filter?key=naruto', '/__as/')).toBe(
      `${origin}/__as/filter?key=naruto`,
    );
    expect(joinAdapterUrl('/anime/one-piece-PmTvj', '/__as/')).toBe(
      `${origin}/__as/anime/one-piece-PmTvj`,
    );
  });

  it('joins absolute site base normally', () => {
    expect(joinAdapterUrl('/', 'https://www.animesaturn.net/')).toBe(
      'https://www.animesaturn.net/',
    );
    expect(joinAdapterUrl('/anime/x', 'https://www.animesaturn.net/')).toBe(
      'https://www.animesaturn.net/anime/x',
    );
  });

  it('absolutizeUrl uses the same join rules', () => {
    expect(absolutizeUrl('/locandine/x.jpg', '/__as/')).toBe(
      `${origin}/__as/locandine/x.jpg`,
    );
    expect(absolutizeUrl('https://img.saturncdn.net/x.jpg', '/__as/')).toBe(
      'https://img.saturncdn.net/x.jpg',
    );
  });
});
