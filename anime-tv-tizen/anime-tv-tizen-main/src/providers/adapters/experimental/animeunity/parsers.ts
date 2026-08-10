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
import type { EpisodeListParseResult, HtmlParsers } from '../../types';
import { enrichAnimeunityStreams } from './resolveEmbed';

const PROVIDER_ID = 'animeunity';

/** Parsers for www.animeunity.so (HTML + embedded/JSON payloads as of 2026). */
export function createAnimeunityParsers(): HtmlParsers {
  return {
    parseHomeHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const recentlyAdded = uniqueById(
        queryAll(doc, '.latest-anime-container a[href*="/anime/"]')
          .map((el) => cardFromAnimeAnchor(el, baseUrl))
          .filter((x): x is AnimeSummaryDto => Boolean(x)),
      ).slice(0, 24);

      if (!recentlyAdded.length) {
        throw new ProviderError('empty', 'Home AnimeUnity vuota / markup cambiato', PROVIDER_ID);
      }

      const feed: HomeFeedDto = {
        featured: recentlyAdded[0] || null,
        recentlyAdded,
        popular: recentlyAdded,
      };
      return feed;
    },

    parseSearchHtml(html, baseUrl) {
      const records = extractJsonAttr(html, 'records');
      if (!Array.isArray(records)) {
        throw new ProviderError('parse', 'Archivio: attributo records mancante', PROVIDER_ID);
      }
      return uniqueById(
        records
          .map((item) => summaryFromRecord(item, baseUrl))
          .filter((x): x is AnimeSummaryDto => Boolean(x)),
      );
    },

    parseDetailsHtml(html, baseUrl) {
      const anime = extractJsonAttr(html, 'anime');
      if (!anime || typeof anime !== 'object') {
        throw new ProviderError('parse', 'Scheda: attributo anime mancante', PROVIDER_ID);
      }
      const rec = anime as Record<string, unknown>;
      const id = Number(rec.id);
      const slug = String(rec.slug || '');
      if (!Number.isFinite(id) || id < 1 || !slug) {
        throw new ProviderError('parse', 'Scheda: id/slug mancanti', PROVIDER_ID);
      }
      const externalId = `${id}-${slug}`;
      const title =
        String(rec.title_eng || rec.title_it || rec.title || '').trim() || slug;
      const posterUrl = absolutizeUrl(String(rec.imageurl || ''), baseUrl) || undefined;
      const backdropUrl =
        absolutizeUrl(String(rec.imageurl_cover || rec.cover || ''), baseUrl) || posterUrl;
      const genres = Array.isArray(rec.genres)
        ? rec.genres
            .map((g) =>
              g && typeof g === 'object' ? String((g as { name?: string }).name || '') : '',
            )
            .filter(Boolean)
        : undefined;
      const yearRaw = String(rec.date || '').trim();
      const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined;

      // Episodes come from info_api via episodesPath (partial list on page is ignored).
      const details: AnimeDetailsDto = {
        externalId,
        title,
        posterUrl,
        backdropUrl,
        description: String(rec.plot || '').trim() || undefined,
        genres: genres?.length ? genres : undefined,
        status: mapStatus(String(rec.status || '')),
        year,
        episodes: [],
        episodeCount: Number(rec.episodes_count) || undefined,
      };
      return details;
    },

    parseEpisodeListHtml(html) {
      return parseEpisodesJson(html);
    },


    parseStreamHtml(html) {
      // Prefer plain-text /embed-url/{id} response; fall back to video-player attr.
      const plain = html.trim();
      const fromPlain =
        /^https?:\/\//i.test(plain) && !/[<>]/.test(plain)
          ? plain.replace(/&amp;/g, '&')
          : '';
      const embed = fromPlain || extractQuotedAttr(html, 'embed_url');
      const url = decodeHtmlEntities((embed || '').trim()).replace(/&amp;/g, '&');
      if (!url || !/^https?:\/\//i.test(url)) {
        throw new ProviderError('empty', 'Nessun embed_url (embed-url API / video-player)', PROVIDER_ID);
      }
      const sources: StreamSourceDto[] = [
        {
          url,
          type: 'other',
          label: 'Embed AnimeUnity',
        },
      ];
      return sources;
    },

    enrichStreamSources(sources) {
      // iframe blocked by CSP frame-ancestors; resolve vixcloud → MP4 downloadUrl.
      return enrichAnimeunityStreams(sources);
    },
  };
}

function parseEpisodesJson(text: string): EpisodeListParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProviderError('parse', 'info_api episodi: JSON non valido', PROVIDER_ID);
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = String((data as { error?: unknown }).error || 'errore sconosciuto');
    throw new ProviderError('parse', `info_api episodi: ${msg}`, PROVIDER_ID);
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { episodes?: unknown }).episodes)
      ? (data as { episodes: unknown[] }).episodes
      : null;
  if (!list) {
    throw new ProviderError('parse', 'info_api episodi: lista mancante', PROVIDER_ID);
  }

  const totalRaw =
    data && typeof data === 'object'
      ? Number((data as { episodes_count?: unknown }).episodes_count)
      : NaN;
  const totalCount = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : undefined;

  const byNum = new Map<number, EpisodeDto>();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const number = Number(rec.number);
    const dbId = Number(rec.id);
    // Stream lookup needs DB id (`/embed-url/{id}`), not episode number.
    if (!Number.isFinite(number) || number < 1) continue;
    if (!Number.isFinite(dbId) || dbId < 1) continue;
    byNum.set(number, {
      externalId: String(dbId),
      number,
      title: `Episodio ${number}`,
    });
  }
  return {
    episodes: Array.from(byNum.values()).sort((a, b) => a.number - b.number),
    totalCount,
  };
}

function cardFromAnimeAnchor(el: Element, baseUrl: string): AnimeSummaryDto | null {
  const href = attrOf(el, 'href');
  const externalId = extractAnimeId(href);
  if (!externalId) return null;
  const container = el.closest('.latest-anime-container') || el.parentElement;
  const titleEl =
    (container && queryOne(container, '.latest-anime-title')) ||
    queryOne(el, 'strong, img');
  const title =
    textOf(titleEl) ||
    attrOf(queryOne(el, 'img') || el, 'alt') ||
    externalId;
  const img = container ? queryOne(container, 'img') : queryOne(el, 'img');
  return {
    externalId,
    title: decodeHtmlEntities(title).trim(),
    posterUrl: absolutizeUrl(attrOf(img, 'src'), baseUrl) || undefined,
    status: 'unknown',
  };
}

function summaryFromRecord(item: unknown, baseUrl: string): AnimeSummaryDto | null {
  if (!item || typeof item !== 'object') return null;
  const rec = item as Record<string, unknown>;
  const id = Number(rec.id);
  const slug = String(rec.slug || '');
  if (!Number.isFinite(id) || id < 1 || !slug) return null;
  const title = String(rec.title_eng || rec.title_it || rec.title || slug).trim();
  return {
    externalId: `${id}-${slug}`,
    title,
    posterUrl: absolutizeUrl(String(rec.imageurl || ''), baseUrl) || undefined,
    backdropUrl: absolutizeUrl(String(rec.imageurl_cover || ''), baseUrl) || undefined,
    status: mapStatus(String(rec.status || '')),
  };
}

function extractAnimeId(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const m = href.match(/\/anime\/(\d+-[a-z0-9-]+)/i);
  return m ? decodeURIComponent(m[1]) : undefined;
}

function mapStatus(raw: string): AnimeSummaryDto['status'] {
  const s = raw.toLowerCase();
  if (s.includes('corso')) return 'ongoing';
  if (s.includes('terminat') || s.includes('complet') || s.includes('finit')) return 'completed';
  return 'unknown';
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

/** Extract HTML attribute that holds entity-encoded or raw JSON (`attr="{...}"` / `attr="[...]"`). */
export function extractJsonAttr(html: string, name: string): unknown {
  const raw = extractQuotedAttr(html, name);
  if (raw == null) return null;
  try {
    return JSON.parse(decodeHtmlEntities(raw));
  } catch {
    throw new ProviderError('parse', `JSON attr ${name} non valido`, PROVIDER_ID);
  }
}

/**
 * Read attr="..." value. For `{`/`[` payloads, brace-balance so raw quotes inside JSON do not truncate.
 */
export function extractQuotedAttr(html: string, name: string): string | null {
  const key = `${name}="`;
  const start = html.indexOf(key);
  if (start < 0) return null;
  let i = start + key.length;
  const first = html[i];
  if (first !== '{' && first !== '[') {
    const end = html.indexOf('"', i);
    return end < 0 ? null : html.slice(i, end);
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      if (depth === 0) return html.slice(i, j);
      inString = true;
      continue;
    }
    if (c === '{' || c === '[') depth += 1;
    else if (c === '}' || c === ']') depth -= 1;
  }
  return null;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
