/**
 * External adapter contracts.
 * Concrete site parsers must live under adapters/* and stay out of UI/core.
 * Feature-flagged OFF by default — see app/config.ts.
 */

import type {
  AnimeDetailsDto,
  AnimeSummaryDto,
  EpisodeDto,
  HomeFeedDto,
  StreamSourceDto,
} from './dto';

export interface AdapterConfig {
  id: string;
  label: string;
  baseUrl: string;
  /** Must stay false unless explicitly enabled via flag + config. */
  enabled: boolean;
  userAgent?: string;
  minIntervalMs?: number;
  timeoutMs?: number;
  routes: AdapterRoutes;
}

export interface EpisodeRange {
  start: number;
  end: number;
}

export interface AdapterRoutes {
  homePath: string;
  searchPath: (query: string) => string;
  detailsPath: (externalId: string) => string;
  /** If episodes are on a separate URL; otherwise details page embeds them. */
  episodesPath?: (externalId: string, range?: EpisodeRange) => string;
  /**
   * When set with `episodesPath`, fetch episode windows of this size and merge
   * (e.g. AnimeUnity info_api rejects ranges larger than 120).
   */
  episodesPageSize?: number;
  streamPath: (animeExternalId: string, episodeExternalId: string) => string;
}

/** Optional richer episode-list parse result for paginated APIs. */
export interface EpisodeListParseResult {
  episodes: EpisodeDto[];
  /** Total episode count when known (drives further page fetches). */
  totalCount?: number;
}

export interface HtmlParsers {
  parseHomeHtml(html: string, baseUrl: string): HomeFeedDto;
  parseSearchHtml(html: string, baseUrl: string): AnimeSummaryDto[];
  parseDetailsHtml(html: string, baseUrl: string): AnimeDetailsDto;
  parseEpisodeListHtml(
    html: string,
    baseUrl: string,
  ): EpisodeDto[] | EpisodeListParseResult;
  parseStreamHtml(html: string, baseUrl: string): StreamSourceDto[];
  /**
   * Optional second pass (e.g. resolve embed → direct media).
   * Receives validated DTOs and a fetch helper with optional headers.
   */
  enrichStreamSources?(
    sources: StreamSourceDto[],
    fetchText: (url: string, headers?: Record<string, string>) => Promise<string>,
  ): Promise<StreamSourceDto[]>;
}
