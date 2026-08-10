import { describe, expect, it } from 'vitest';
import { createAnimesaturnParsers } from '@/providers/adapters/experimental/animesaturn/parsers';
import {
  validateHomeFeedDto,
  validateAnimeDetailsDto,
  validateStreamSourcesDto,
  validateAnimeSummaryDto,
} from '@/providers/adapters/validate';
import { mapHomeFeedDto, mapDetailsDto } from '@/providers/adapters/mapToDomain';

const BASE = 'https://www.animesaturn.net/';

const HOME_HTML = `
<html><body>
  <div class="swiper-slide">
    <div class="hero-slide">
      <img class="hero-slide__bg" src="https://img.example/hero.png" alt="">
      <h2 class="hero-title">Featured Title</h2>
      <a href="/anime/featured-title-Ab12c" class="hero-btn hero-btn-info">Dettagli</a>
    </div>
  </div>
  <div data-latest-rail>
    <a href="/episode/recent-anime-Xx9/ep-4" class="ac group">
      <div class="ac__poster"><img src="/p/recent.jpg" alt="Recent Anime"></div>
      <div class="ac__caption"><h3 class="ac__title">Recent Anime</h3></div>
    </a>
  </div>
  <h2>Più visti questa settimana</h2>
  <div class="swiper" data-slider="rail">
    <a href="/anime/one-piece-PmTvj" class="ac group">
      <div class="ac__poster"><img src="/p/op.jpg" alt="One Piece"></div>
      <h3 class="ac__title">One Piece</h3>
    </a>
  </div>
</body></html>`;

const DETAILS_HTML = `
<html><body>
  <link rel="canonical" href="https://www.animesaturn.net/anime/one-piece-PmTvj">
  <h1>One Piece</h1>
  <div class="ag-poster"><img src="/locandine/op.png" alt="One Piece"></div>
  <div class="ag-story"><div class="story-clip">Monkey D. Rufy è un pirata.</div></div>
  <div class="ag-meta"><span>Stato</span><span class="font-semibold">In corso</span></div>
  <div class="ag-genres chip-row"><a href="/filter?genres=Azione">Azione</a></div>
  <a href="/episode/one-piece-PmTvj/ep-1" class="ep-tile" title="Episodio 1">1</a>
  <a href="/episode/one-piece-PmTvj/ep-2" class="ep-tile" title="Episodio 2">2</a>
  <a href="/episode/one-piece-PmTvj/ep-1" class="ep-tile">1</a>
</body></html>`;

const WATCH_HTML = `
<html><body>
  <iframe id="watch-iframe"
    src="https://play.saturncdn.net/embed/13230?token=abc&amp;expires=123"
    title="One Piece Episodio 1"></iframe>
</body></html>`;

const SEARCH_HTML = `
<html><body>
  <a href="/anime/naruto-shippuden-ita-PjvU1" class="ac group">
    <div class="ac__poster"><img src="/p/n.jpg" alt="Naruto Shippuden (ITA)"></div>
  </a>
</body></html>`;

describe('animesaturn parsers', () => {
  const parsers = createAnimesaturnParsers();

  it('parses home featured + rails', () => {
    const raw = parsers.parseHomeHtml(HOME_HTML, BASE);
    const dto = validateHomeFeedDto(raw, 'animesaturn');
    const mapped = mapHomeFeedDto(dto, 'animesaturn');
    expect(mapped.featured?.title).toBe('Featured Title');
    expect(mapped.featured?.id).toBe('animesaturn:featured-title-Ab12c');
    expect(mapped.recentlyAdded.some((a) => a.id.includes('recent-anime-Xx9'))).toBe(true);
    expect(mapped.popular.some((a) => a.id.includes('one-piece-PmTvj'))).toBe(true);
  });

  it('parses details episodes uniquely', () => {
    const raw = parsers.parseDetailsHtml(DETAILS_HTML, BASE);
    const dto = validateAnimeDetailsDto(raw, 'animesaturn');
    const mapped = mapDetailsDto(dto, 'animesaturn');
    expect(mapped.id).toBe('animesaturn:one-piece-PmTvj');
    expect(mapped.status).toBe('ongoing');
    expect(mapped.episodes).toHaveLength(2);
    expect(mapped.episodes[0].id).toContain('ep-1');
  });

  it('parses search cards', () => {
    const raw = parsers.parseSearchHtml(SEARCH_HTML, BASE);
    expect(raw).toHaveLength(1);
    const dto = validateAnimeSummaryDto(raw[0], 'animesaturn');
    expect(dto.externalId).toBe('naruto-shippuden-ita-PjvU1');
  });

  it('parses watch embed iframe', () => {
    const raw = parsers.parseStreamHtml(WATCH_HTML, BASE);
    const sources = validateStreamSourcesDto(raw, 'animesaturn');
    expect(sources[0].type).toBe('other');
    expect(sources[0].url).toContain('play.saturncdn.net/embed/');
    expect(sources[0].url).toContain('token=abc');
    expect(sources[0].url).not.toContain('&amp;');
  });

  it('exposes enrichStreamSources hook', () => {
    expect(typeof parsers.enrichStreamSources).toBe('function');
  });
});
