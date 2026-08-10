import { describe, expect, it } from 'vitest';
import {
  validateAnimeDetailsDto,
  validateAnimeSummaryDto,
  validateHomeFeedDto,
  validateStreamSourcesDto,
} from '@/providers/adapters/validate';
import { ProviderError } from '@/domain/errors';

describe('adapter DTO validators', () => {
  it('validates anime summary', () => {
    const dto = validateAnimeSummaryDto(
      { externalId: 'blade', title: 'Shonen Blade', year: '2023', genres: ['Azione', ''] },
      'test',
    );
    expect(dto.externalId).toBe('blade');
    expect(dto.year).toBe(2023);
    expect(dto.genres).toEqual(['Azione']);
  });

  it('rejects missing title', () => {
    expect(() =>
      validateAnimeSummaryDto({ externalId: 'x', title: '  ' }, 'test'),
    ).toThrow(ProviderError);
  });

  it('validates home feed and rejects empty', () => {
    const feed = validateHomeFeedDto(
      {
        featured: { externalId: 'a', title: 'A' },
        recentlyAdded: [],
        popular: [{ externalId: 'b', title: 'B' }],
      },
      'test',
    );
    expect(feed.popular).toHaveLength(1);

    expect(() =>
      validateHomeFeedDto({ featured: null, recentlyAdded: [], popular: [] }, 'test'),
    ).toThrow(/vuoto|empty/i);
  });

  it('validates details with episodes', () => {
    const details = validateAnimeDetailsDto(
      {
        externalId: 'a',
        title: 'A',
        description: 'Hello',
        episodes: [{ number: 1, title: 'Ep 1' }, { number: 2 }],
      },
      'test',
    );
    expect(details.episodes).toHaveLength(2);
    expect(details.episodeCount).toBe(2);
  });

  it('validates stream urls', () => {
    const sources = validateStreamSourcesDto(
      [{ url: 'https://cdn.example/video.mp4', label: '720p' }],
      'test',
    );
    expect(sources[0].type).toBe('mp4');

    expect(() => validateStreamSourcesDto([{ url: 'ftp://x' }], 'test')).toThrow(ProviderError);
  });
});
