import { describe, expect, it } from 'vitest';
import { percentOf, clamp } from '@/utils/time';
import { MockProvider } from '@/providers/mock/MockProvider';

describe('progress math', () => {
  it('computes percent safely', () => {
    expect(percentOf(45, 100)).toBe(0.45);
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(120, 100)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  it('marks completed above threshold', () => {
    const threshold = 0.9;
    expect(percentOf(91, 100) >= threshold).toBe(true);
    expect(percentOf(80, 100) >= threshold).toBe(false);
  });
});

describe('MockProvider streams', () => {
  it('returns a stream source for known anime', async () => {
    const provider = new MockProvider();
    const home = await provider.getHome();
    expect(home.ok).toBe(true);
    if (!home.ok) return;
    const anime = home.data.popular[0];
    const details = await provider.getAnimeDetails(anime.id);
    expect(details.ok).toBe(true);
    if (!details.ok) return;
    const ep = details.data.episodes[0];
    const streams = await provider.getStreamSources(anime.id, ep.id);
    expect(streams.ok).toBe(true);
    if (!streams.ok) return;
    expect(streams.data[0].type).toBe('mp4');
  });
});
