import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFixtureParsers } from '@/providers/adapters/_template/parsers';
import { ExternalHtmlProvider } from '@/providers/adapters/ExternalHtmlProvider';
import { createAlphaProvider } from '@/providers/adapters/experimental/alpha';
import { HttpClient } from '@/providers/http/HttpClient';
import {
  validateHomeFeedDto,
  validateAnimeDetailsDto,
  validateStreamSourcesDto,
} from '@/providers/adapters/validate';
import { mapHomeFeedDto, mapDetailsDto, mapStreamDtos } from '@/providers/adapters/mapToDomain';
import type { AdapterConfig } from '@/providers/adapters/types';

const HOME_HTML = `
<html><body>
  <section data-feed="featured">
    <article data-anime-card data-id="blade" data-title="Shonen Blade" data-year="2023" data-genres="Azione,Avventura"></article>
  </section>
  <section data-feed="recent">
    <article data-anime-card data-id="neon" data-title="Neon District"></article>
  </section>
  <section data-feed="popular">
    <article data-anime-card data-id="sakura" data-title="Sakura Lines"></article>
  </section>
</body></html>`;

const DETAILS_HTML = `
<html><body>
  <div data-anime-details data-id="blade" data-title="Shonen Blade" data-year="2023" data-genres="Azione" data-status="ongoing">
    <p data-description>Una lama leggendaria.</p>
    <img data-poster src="/posters/blade.jpg" />
    <a data-episode data-number="1" data-title="Episodio 1"></a>
    <a data-episode data-number="2" data-title="Episodio 2"></a>
  </div>
</body></html>`;

const STREAM_HTML = `
<html><body>
  <a data-stream data-url="https://cdn.example/ep1.mp4" data-type="mp4" data-label="720p">720p</a>
</body></html>`;

const fixtureConfig: AdapterConfig = {
  id: 'template',
  label: 'Template',
  baseUrl: 'https://example.invalid/',
  enabled: true,
  minIntervalMs: 0,
  routes: {
    homePath: '/',
    searchPath: (q) => `/search?q=${encodeURIComponent(q)}`,
    detailsPath: (id) => `/anime/${id}`,
    streamPath: (a, e) => `/watch/${a}/${e}`,
  },
};

describe('fixture parsers', () => {
  const parsers = createFixtureParsers('template');

  it('parses home feed cards', () => {
    const raw = parsers.parseHomeHtml(HOME_HTML, 'https://example.invalid/');
    const dto = validateHomeFeedDto(raw, 'template');
    const mapped = mapHomeFeedDto(dto, 'template');
    expect(mapped.featured?.title).toBe('Shonen Blade');
    expect(mapped.featured?.id).toBe('template:blade');
    expect(mapped.recentlyAdded[0].title).toBe('Neon District');
    expect(mapped.popular[0].title).toBe('Sakura Lines');
  });

  it('parses details and episodes', () => {
    const raw = parsers.parseDetailsHtml(DETAILS_HTML, 'https://example.invalid/');
    const dto = validateAnimeDetailsDto(raw, 'template');
    const mapped = mapDetailsDto(dto, 'template');
    expect(mapped.description).toContain('lama');
    expect(mapped.episodes).toHaveLength(2);
    expect(mapped.posterUrl).toBe('https://example.invalid/posters/blade.jpg');
  });

  it('parses stream sources', () => {
    const raw = parsers.parseStreamHtml(STREAM_HTML, 'https://example.invalid/');
    const dto = validateStreamSourcesDto(raw, 'template');
    expect(mapStreamDtos(dto)[0].url).toContain('.mp4');
  });
});

describe('ExternalHtmlProvider pipeline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches HTML and returns domain home feed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(HOME_HTML, { status: 200 })),
    );
    const http = new HttpClient({ name: 'FixtureHttp', minIntervalMs: 0, retries: 0 });
    const provider = new ExternalHtmlProvider(
      fixtureConfig,
      createFixtureParsers('template'),
      http,
    );
    const home = await provider.getHome();
    expect(home.ok).toBe(true);
    if (!home.ok) return;
    expect(home.data.featured?.title).toBe('Shonen Blade');
  });

  it('alpha stub returns disabled when parsers unimplemented', async () => {
    const alpha = createAlphaProvider({ enabled: true, baseUrl: 'https://example.invalid' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { status: 200 })));
    const home = await alpha.getHome();
    expect(home.ok).toBe(false);
    if (home.ok) return;
    expect(home.error.kind).toBe('disabled');
  });
});
