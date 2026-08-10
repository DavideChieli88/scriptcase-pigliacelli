import { describe, expect, it } from 'vitest';
import { MockProvider } from '@/providers/mock/MockProvider';

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('returns home feed with rails', async () => {
    const result = await provider.getHome();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.featured).toBeTruthy();
    expect(result.data.recentlyAdded.length).toBeGreaterThan(0);
    expect(result.data.popular.length).toBeGreaterThan(0);
  });

  it('searches by title', async () => {
    const result = await provider.search('neon');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.some((a) => a.title.toLowerCase().includes('neon'))).toBe(true);
  });

  it('loads details with episodes', async () => {
    const home = await provider.getHome();
    if (!home.ok || !home.data.featured) throw new Error('no featured');
    const details = await provider.getAnimeDetails(home.data.featured.id);
    expect(details.ok).toBe(true);
    if (!details.ok) return;
    expect(details.data.episodes.length).toBeGreaterThan(0);
    expect(details.data.description).toBeTruthy();
  });
});
