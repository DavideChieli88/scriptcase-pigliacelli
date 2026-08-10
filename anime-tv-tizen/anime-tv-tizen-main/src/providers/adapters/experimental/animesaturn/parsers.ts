import { ProviderError } from '@/domain/errors';
import type {
  AnimeDetailsDto,
  AnimeSummaryDto,
  EpisodeDto,
  HomeFeedDto,
  StreamSourceDto,
} from '../../dto';
import {
  absolutizeUrl,
  attrOf,
  parseHtmlDocument,
  queryAll,
  queryOne,
  textOf,
} from '../../dom';
import type { HtmlParsers } from '../../types';
import { enrichAnimesaturnStreams } from './resolveEmbed';

const PROVIDER_ID = 'animesaturn';

/** Parsers for www.animesaturn.net (HTML structure as of 2026). */
export function createAnimesaturnParsers(): HtmlParsers {
  return {
    parseHomeHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const featured = parseHeroFeatured(doc, baseUrl);
      const recentlyAdded = uniqueById(
        queryAll(doc, '[data-latest-rail] a.ac, a.ac[href^="/episode/"]')
          .map((el) => cardFromEpisodeOrAnime(el, baseUrl))
          .filter((x): x is AnimeSummaryDto => Boolean(x)),
      ).slice(0, 24);
      const popular = uniqueById(
        queryAll(doc, '.swiper[data-slider="rail"] a.ac[href^="/anime/"], a.ac[href^="/anime/"]')
          .map((el) => cardFromAnimeLink(el, baseUrl))
          .filter((x): x is AnimeSummaryDto => Boolean(x)),
      ).slice(0, 24);

      if (!featured && !recentlyAdded.length && !popular.length) {
        throw new ProviderError('empty', 'Home AnimeSaturn vuota / markup cambiato', PROVIDER_ID);
      }
      const feed: HomeFeedDto = {
        featured: featured || popular[0] || recentlyAdded[0] || null,
        recentlyAdded,
        popular: popular.length ? popular : recentlyAdded,
      };
      return feed;
    },

    parseSearchHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const cards = queryAll(doc, 'a.ac[href^="/anime/"]')
        .map((el) => cardFromAnimeLink(el, baseUrl))
        .filter((x): x is AnimeSummaryDto => Boolean(x));
      return uniqueById(cards);
    },

    parseDetailsHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const canonical =
        attrOf(queryOne(doc, 'link[rel="canonical"]'), 'href') ||
        attrOf(queryOne(doc, 'meta[property="og:url"]'), 'content');
      const externalId = extractAnimeId(canonical) || extractAnimeIdFromAny(doc);
      const title =
        textOf(queryOne(doc, 'h1')) ||
        attrOf(queryOne(doc, 'meta[property="og:title"]'), 'content').replace(/^AnimeSaturn\s*-\s*/i, '');
      if (!externalId || !title) {
        throw new ProviderError('parse', 'Scheda anime: id/titolo mancanti', PROVIDER_ID);
      }

      const posterUrl = absolutizeUrl(
        attrOf(queryOne(doc, '.ag-poster img, .anime-poster-card img'), 'src') ||
          attrOf(queryOne(doc, 'meta[property="og:image"]'), 'content'),
        baseUrl,
      );
      const description = textOf(queryOne(doc, '.ag-story .story-clip, .ag-story .text-pretty, .story-clip'));
      const status = mapStatus(textAroundLabel(doc, 'Stato'));
      const genres = queryAll(doc, '.ag-genres a, .chip-row a')
        .map((a) => textOf(a))
        .filter(Boolean);

      const episodes = parseEpisodeTiles(doc);
      const details: AnimeDetailsDto = {
        externalId,
        title: title.trim(),
        posterUrl,
        backdropUrl: posterUrl,
        description: description || undefined,
        genres: genres.length ? genres : undefined,
        status,
        episodes,
        episodeCount: episodes.length || undefined,
      };
      return details;
    },

    parseEpisodeListHtml(html) {
      return parseEpisodeTiles(parseHtmlDocument(html));
    },

    parseStreamHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const sources: StreamSourceDto[] = [];

      // Direct MP4/HLS in page (rare; usually only inside the embed iframe)
      for (const el of [
        ...queryAll(doc, 'video[src], video source[src], source[src]'),
      ]) {
        const raw = attrOf(el, 'src').replace(/&amp;/g, '&');
        const mediaUrl = absolutizeUrl(raw, baseUrl);
        if (!mediaUrl) continue;
        if (/\.m3u8(\?|$)/i.test(mediaUrl)) {
          sources.push({ url: mediaUrl, type: 'hls', label: 'HLS AnimeSaturn' });
        } else if (/\.mp4(\?|$)/i.test(mediaUrl) || /streampeaker\.org/i.test(mediaUrl)) {
          sources.push({ url: mediaUrl, type: 'mp4', label: 'MP4 AnimeSaturn' });
        }
      }

      // Alpine watchPage JSON may expose downloadUrl on some servers
      const alpineMp4 = extractAlpineDownloadUrls(html);
      for (const url of alpineMp4) {
        sources.push({ url, type: 'mp4', label: 'MP4 Download AnimeSaturn' });
      }

      const iframe =
        queryOne(doc, 'iframe#watch-iframe') ||
        queryOne(doc, 'iframe[src*="saturncdn"]') ||
        queryOne(doc, 'iframe[src*="embed"]');
      const rawSrc = attrOf(iframe, 'src');
      const embedUrl = absolutizeUrl(rawSrc.replace(/&amp;/g, '&'), baseUrl);
      if (embedUrl) {
        sources.push({
          url: embedUrl,
          type: 'other',
          label: 'Embed AnimeSaturn',
        });
      }

      if (!sources.length) {
        throw new ProviderError(
          'empty',
          'Nessun embed/stream trovato (selettore #watch-iframe)',
          PROVIDER_ID,
        );
      }
      return sources;
    },

    enrichStreamSources(sources) {
      // Do not use ExternalHtmlProvider's HttpClient here: browser fetch strips
      // Referer and saturncdn playlist returns 403. resolveEmbed uses proxy / tizen.download.
      return enrichAnimesaturnStreams(sources);
    },
  };
}

/** Pull direct download URLs from Alpine `watchPage({...})` JSON when present. */
function extractAlpineDownloadUrls(html: string): string[] {
  const out: string[] = [];
  const m = html.match(/watchPage\((\{[\s\S]*?\})\)/);
  if (!m) return out;
  try {
    const json = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\\u0026/g, '&');
    const data = JSON.parse(json) as {
      servers?: Array<{ downloadUrl?: string | null; link?: string; embed?: boolean }>;
    };
    for (const s of data.servers || []) {
      if (s.downloadUrl && /^https?:\/\//i.test(s.downloadUrl)) {
        out.push(s.downloadUrl);
      }
      // Non-embed direct link (unusual)
      if (s.link && s.embed === false && /\.mp4(\?|$)/i.test(s.link)) {
        out.push(s.link);
      }
    }
  } catch {
    /* ignore malformed alpine payload */
  }
  return out;
}

function parseHeroFeatured(doc: Document, baseUrl: string): AnimeSummaryDto | null {
  const slide = queryOne(doc, '.hero-slide');
  if (!slide) return null;
  const title = textOf(queryOne(slide, '.hero-title'));
  const detailsHref = attrOf(queryOne(slide, 'a.hero-btn-info[href^="/anime/"]'), 'href');
  const externalId = extractAnimeId(detailsHref);
  if (!externalId || !title) return null;
  const backdropUrl = absolutizeUrl(attrOf(queryOne(slide, 'img.hero-slide__bg'), 'src'), baseUrl);
  return {
    externalId,
    title,
    backdropUrl,
    posterUrl: backdropUrl,
    status: 'unknown',
  };
}

function cardFromAnimeLink(el: Element, baseUrl: string): AnimeSummaryDto | null {
  const href = attrOf(el, 'href');
  const externalId = extractAnimeId(href);
  if (!externalId) return null;
  const img = queryOne(el, '.ac__poster img, img');
  const title =
    attrOf(img, 'alt') ||
    textOf(queryOne(el, '.ac__title, .ac__caption h3, h3')) ||
    externalId;
  const posterUrl = absolutizeUrl(attrOf(img, 'src'), baseUrl);
  return {
    externalId,
    title: decodeHtmlEntities(title),
    posterUrl,
    status: 'unknown',
  };
}

function cardFromEpisodeOrAnime(el: Element, baseUrl: string): AnimeSummaryDto | null {
  const href = attrOf(el, 'href');
  if (href.includes('/anime/')) return cardFromAnimeLink(el, baseUrl);
  // /episode/{animeId}/ep-N → anime summary
  const m = href.match(/\/episode\/([^/]+)\/ep-\d+/i);
  if (!m) return null;
  const externalId = m[1];
  const img = queryOne(el, '.ac__poster img, img');
  const title =
    attrOf(img, 'alt') ||
    textOf(queryOne(el, '.ac__title, .ac__caption h3, h3')) ||
    externalId;
  return {
    externalId,
    title: decodeHtmlEntities(title),
    posterUrl: absolutizeUrl(attrOf(img, 'src'), baseUrl),
    status: 'unknown',
  };
}

function parseEpisodeTiles(doc: Document): EpisodeDto[] {
  const tiles = queryAll(doc, 'a.ep-tile[href*="/episode/"]');
  const byNum = new Map<number, EpisodeDto>();
  for (const el of tiles) {
    const href = attrOf(el, 'href');
    const m = href.match(/\/(ep-\d+)(?:\/|$)/i) || href.match(/\/ep-(\d+)/i);
    if (!m) continue;
    const externalId = m[1].startsWith('ep-') ? m[1] : `ep-${m[1]}`;
    const number = Number(externalId.replace(/^ep-/i, ''));
    if (!Number.isFinite(number) || number < 1) continue;
    byNum.set(number, {
      externalId,
      number,
      title: `Episodio ${number}`,
    });
  }
  return Array.from(byNum.values()).sort((a, b) => a.number - b.number);
}

function extractAnimeId(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const m = href.match(/\/anime\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : undefined;
}

function extractAnimeIdFromAny(doc: Document): string | undefined {
  for (const a of queryAll(doc, 'a[href*="/anime/"]')) {
    const id = extractAnimeId(attrOf(a, 'href'));
    if (id && !/\/ep-/i.test(attrOf(a, 'href'))) return id;
  }
  return undefined;
}

function mapStatus(raw: string): AnimeSummaryDto['status'] {
  const s = raw.toLowerCase();
  if (s.includes('corso')) return 'ongoing';
  if (s.includes('complet') || s.includes('finit')) return 'completed';
  return 'unknown';
}

function textAroundLabel(doc: Document, label: string): string {
  for (const el of queryAll(doc, '.ag-meta span, .ag-meta div, dt, dd, span')) {
    const t = textOf(el);
    if (t === label || t.startsWith(label)) {
      const parent = el.parentElement;
      return textOf(parent).replace(label, '').trim();
    }
  }
  return '';
}

function uniqueById(items: AnimeSummaryDto[]): AnimeSummaryDto[] {
  const seen = new Set<string>();
  const out: AnimeSummaryDto[] = [];
  for (const item of items) {
    if (!item.externalId || seen.has(item.externalId)) continue;
    seen.add(item.externalId);
    out.push(item);
  }
  return out;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
