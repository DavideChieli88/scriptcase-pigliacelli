import { ProviderError } from '@/domain/errors';
import type {
  AnimeDetailsDto,
  AnimeSummaryDto,
  EpisodeDto,
  HomeFeedDto,
  StreamSourceDto,
} from '../dto';
import {
  absolutizeUrl,
  attrOf,
  parseHtmlDocument,
  queryAll,
  queryOne,
  textOf,
} from '../dom';
import type { HtmlParsers } from '../types';

/**
 * Reference parsers for a stable **fixture HTML contract**.
 * Real site adapters should copy this pattern and replace selectors —
 * do not couple these selectors to production third-party markup in core.
 *
 * Expected fixture markers (data-* attributes):
 * - [data-anime-card][data-id][data-title]
 * - [data-feed="recent"|"popular"|"featured"]
 * - [data-anime-details] with description / episodes
 * - [data-episode][data-number]
 * - [data-stream][data-url]
 */
export function createFixtureParsers(providerId: string): HtmlParsers {
  return {
    parseHomeHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const featuredEl = queryOne(doc, '[data-feed="featured"] [data-anime-card]');
      const featured = featuredEl ? cardToDto(featuredEl, baseUrl) : null;
      const recentlyAdded = queryAll(doc, '[data-feed="recent"] [data-anime-card]').map((el) =>
        cardToDto(el, baseUrl),
      );
      const popular = queryAll(doc, '[data-feed="popular"] [data-anime-card]').map((el) =>
        cardToDto(el, baseUrl),
      );
      if (!featured && !recentlyAdded.length && !popular.length) {
        throw new ProviderError('empty', 'No anime cards in home HTML', providerId);
      }
      const feed: HomeFeedDto = { featured, recentlyAdded, popular };
      return feed;
    },

    parseSearchHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const cards = queryAll(doc, '[data-anime-card]');
      return cards.map((el) => cardToDto(el, baseUrl));
    },

    parseDetailsHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const root = queryOne(doc, '[data-anime-details]');
      if (!root) {
        throw new ProviderError('parse', 'Missing [data-anime-details]', providerId);
      }
      const externalId = attrOf(root, 'data-id');
      const title = attrOf(root, 'data-title') || textOf(queryOne(root, '[data-title]'));
      if (!externalId || !title) {
        throw new ProviderError('parse', 'Details missing id/title', providerId);
      }
      const description = textOf(queryOne(root, '[data-description]'));
      const posterUrl = absolutizeUrl(
        attrOf(queryOne(root, '[data-poster]'), 'src') || attrOf(root, 'data-poster'),
        baseUrl,
      );
      const episodes = queryAll(root, '[data-episode]').map((el) => episodeToDto(el));
      const details: AnimeDetailsDto = {
        externalId,
        title,
        description: description || undefined,
        posterUrl,
        genres: splitGenres(attrOf(root, 'data-genres')),
        year: Number(attrOf(root, 'data-year')) || undefined,
        status: (attrOf(root, 'data-status') as AnimeSummaryDto['status']) || 'unknown',
        episodes,
        episodeCount: episodes.length,
      };
      return details;
    },

    parseEpisodeListHtml(html) {
      const doc = parseHtmlDocument(html);
      return queryAll(doc, '[data-episode]').map((el) => episodeToDto(el));
    },

    parseStreamHtml(html, baseUrl) {
      const doc = parseHtmlDocument(html);
      const nodes = queryAll(doc, '[data-stream]');
      const sources: StreamSourceDto[] = [];
      for (const el of nodes) {
        const url = absolutizeUrl(attrOf(el, 'data-url') || attrOf(el, 'href'), baseUrl);
        if (!url) continue;
        const typeAttr = attrOf(el, 'data-type');
        const type: StreamSourceDto['type'] =
          typeAttr === 'mp4' || typeAttr === 'hls' || typeAttr === 'other'
            ? typeAttr
            : undefined;
        sources.push({
          url,
          type,
          label: attrOf(el, 'data-label') || textOf(el) || undefined,
        });
      }
      if (!sources.length) {
        throw new ProviderError('empty', 'No stream sources in HTML', providerId);
      }
      return sources;
    },
  };
}

function cardToDto(el: Element, baseUrl: string): AnimeSummaryDto {
  const externalId = attrOf(el, 'data-id');
  const title = attrOf(el, 'data-title') || textOf(queryOne(el, '[data-title]')) || textOf(el);
  const posterUrl = absolutizeUrl(
    attrOf(queryOne(el, 'img'), 'src') || attrOf(el, 'data-poster'),
    baseUrl,
  );
  return {
    externalId,
    title,
    posterUrl,
    year: Number(attrOf(el, 'data-year')) || undefined,
    genres: splitGenres(attrOf(el, 'data-genres')),
    status: (attrOf(el, 'data-status') as AnimeSummaryDto['status']) || 'unknown',
  };
}

function episodeToDto(el: Element): EpisodeDto {
  const number = Number(attrOf(el, 'data-number') || textOf(el));
  return {
    externalId: attrOf(el, 'data-id') || undefined,
    number: Number.isFinite(number) ? number : 0,
    title: attrOf(el, 'data-title') || textOf(el) || undefined,
  };
}

function splitGenres(raw: string): string[] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Stub parsers that always report "not implemented" — for experimental site shells. */
export function createUnimplementedParsers(providerId: string): HtmlParsers {
  const boom = (name: string): never => {
    throw new ProviderError(
      'disabled',
      `Parser ${name} non implementato per ${providerId}`,
      providerId,
    );
  };
  return {
    parseHomeHtml: () => boom('parseHomeHtml'),
    parseSearchHtml: () => boom('parseSearchHtml'),
    parseDetailsHtml: () => boom('parseDetailsHtml'),
    parseEpisodeListHtml: () => boom('parseEpisodeListHtml'),
    parseStreamHtml: () => boom('parseStreamHtml'),
  };
}
