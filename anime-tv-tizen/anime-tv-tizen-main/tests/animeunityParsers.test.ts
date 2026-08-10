import { describe, expect, it } from 'vitest';
import {
  createAnimeunityParsers,
  extractJsonAttr,
} from '@/providers/adapters/experimental/animeunity/parsers';
import {
  validateHomeFeedDto,
  validateAnimeDetailsDto,
  validateStreamSourcesDto,
  validateAnimeSummaryDto,
  validateEpisodeDto,
} from '@/providers/adapters/validate';
import { mapHomeFeedDto, mapDetailsDto } from '@/providers/adapters/mapToDomain';

const BASE = 'https://www.animeunity.so/';

const HOME_HTML = `
<html><body>
  <div class="latest-anime-container">
    <a href="https://www.animeunity.so/anime/7720-thunder-3">
      <img src="https://img.example/t.jpg" alt="" height="85" width="58">
    </a>
    <a href="https://www.animeunity.so/anime/7720-thunder-3" class="unstile-a">
      <strong class="latest-anime-title">Thunder 3</strong>
    </a>
  </div>
  <div class="latest-anime-container">
    <a href="/anime/100-demo-show">
      <img src="/p/demo.jpg" alt="Demo">
    </a>
    <strong class="latest-anime-title">Demo Show</strong>
  </div>
</body></html>`;

const SEARCH_HTML = `
<html><body>
  <archivio records="[{&quot;id&quot;:1469,&quot;slug&quot;:&quot;naruto&quot;,&quot;title_eng&quot;:&quot;Naruto&quot;,&quot;imageurl&quot;:&quot;https://img.example/n.jpg&quot;,&quot;status&quot;:&quot;Terminato&quot;}]">
  </archivio>
</body></html>`;

const DETAILS_HTML = `
<html><body>
  <video-player
    anime="{&quot;id&quot;:7720,&quot;slug&quot;:&quot;thunder-3&quot;,&quot;title_eng&quot;:&quot;Thunder 3&quot;,&quot;plot&quot;:&quot;Plot here&quot;,&quot;status&quot;:&quot;In Corso&quot;,&quot;date&quot;:&quot;2026&quot;,&quot;imageurl&quot;:&quot;https://img.example/cover.jpg&quot;,&quot;imageurl_cover&quot;:&quot;https://img.example/banner.jpg&quot;,&quot;episodes_count&quot;:3,&quot;genres&quot;:[{&quot;name&quot;:&quot;Adventure&quot;}]}"
    episodes="[{&quot;number&quot;:&quot;1&quot;,&quot;scws_id&quot;:1}]"
    embed_url="https://vixcloud.co/embed/775006?token=abc&amp;expires=123"
  ></video-player>
</body></html>`;

const EPISODES_JSON = JSON.stringify({
  episodes_count: 3,
  episodes: [
    { id: 1001, number: '1', scws_id: 775006 },
    { id: 1002, number: '2', scws_id: 775007 },
    { id: 1003, number: '3', scws_id: 775008 },
  ],
});

describe('animeunity parsers', () => {
  const parsers = createAnimeunityParsers();

  it('parses home latest rail', () => {
    const raw = parsers.parseHomeHtml(HOME_HTML, BASE);
    const dto = validateHomeFeedDto(raw, 'animeunity');
    const mapped = mapHomeFeedDto(dto, 'animeunity');
    expect(mapped.featured?.title).toBe('Thunder 3');
    expect(mapped.featured?.id).toBe('animeunity:7720-thunder-3');
    expect(mapped.recentlyAdded.some((a) => a.id.includes('100-demo-show'))).toBe(true);
  });

  it('parses archivio records attr', () => {
    const raw = parsers.parseSearchHtml(SEARCH_HTML, BASE);
    expect(raw).toHaveLength(1);
    const dto = validateAnimeSummaryDto(raw[0], 'animeunity');
    expect(dto.externalId).toBe('1469-naruto');
    expect(dto.title).toBe('Naruto');
    expect(dto.status).toBe('completed');
  });

  it('parses details from video-player anime attr', () => {
    const raw = parsers.parseDetailsHtml(DETAILS_HTML, BASE);
    const dto = validateAnimeDetailsDto(raw, 'animeunity');
    const mapped = mapDetailsDto(dto, 'animeunity');
    expect(mapped.id).toBe('animeunity:7720-thunder-3');
    expect(mapped.title).toBe('Thunder 3');
    expect(mapped.status).toBe('ongoing');
    expect(mapped.genres).toContain('Adventure');
    expect(mapped.episodes).toHaveLength(0);
  });

  it('parses info_api episode list JSON', () => {
    const raw = parsers.parseEpisodeListHtml(EPISODES_JSON, BASE);
    const episodes = Array.isArray(raw) ? raw : raw.episodes;
    const totalCount = Array.isArray(raw) ? undefined : raw.totalCount;
    expect(episodes.map((e) => validateEpisodeDto(e, 'animeunity'))).toHaveLength(3);
    expect(episodes[0].externalId).toBe('1001');
    expect(episodes[2].externalId).toBe('1003');
    expect(episodes[2].number).toBe(3);
    expect(totalCount).toBe(3);
  });

  it('skips episodes without DB id (required for /embed-url)', () => {
    const raw = parsers.parseEpisodeListHtml(
      JSON.stringify({
        episodes_count: 1,
        episodes: [{ number: '1', scws_id: 1 }],
      }),
      BASE,
    );
    const episodes = Array.isArray(raw) ? raw : raw.episodes;
    expect(episodes).toHaveLength(0);
  });

  it('parses plain-text /embed-url response', () => {
    const raw = parsers.parseStreamHtml(
      'https://vixcloud.co/embed/224314?token=abc&expires=123\n',
      BASE,
    );
    const dtos = validateStreamSourcesDto(raw, 'animeunity');
    expect(dtos[0].url).toContain('vixcloud.co/embed/224314');
  });

  it('surfaces info_api range errors', () => {
    expect(() =>
      parsers.parseEpisodeListHtml(
        JSON.stringify({ error: "You can't fetch for a range bigger than 120" }),
        BASE,
      ),
    ).toThrow(/range bigger than 120/);
  });

  it('parses embed_url stream', () => {
    const raw = parsers.parseStreamHtml(DETAILS_HTML, BASE);
    const dtos = validateStreamSourcesDto(raw, 'animeunity');
    expect(dtos[0].type).toBe('other');
    expect(dtos[0].url).toContain('vixcloud.co/embed/775006');
    expect(dtos[0].url).toContain('token=abc');
  });

  it('extractJsonAttr parses entity-encoded anime JSON', () => {
    const ok = extractJsonAttr(
      `anime="{&quot;id&quot;:7720,&quot;slug&quot;:&quot;thunder-3&quot;,&quot;title_eng&quot;:&quot;Thunder 3&quot;}"`,
      'anime',
    ) as { id: number; slug: string };
    expect(ok.id).toBe(7720);
    expect(ok.slug).toBe('thunder-3');
  });
});
