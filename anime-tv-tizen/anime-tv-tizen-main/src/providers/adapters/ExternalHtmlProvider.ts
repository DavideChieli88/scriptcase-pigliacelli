import type {
  AnimeDetails,
  AnimeSummary,
  Episode,
  HomeFeed,
  StreamSource,
} from '@/domain/models';
import { ProviderError } from '@/domain/errors';
import { parseAnimeId } from '@/domain/ids';
import type { ContentProvider, ProviderResult } from '@/providers/types';
import { errResult, okResult } from '@/providers/types';
import { HttpClient } from '@/providers/http/HttpClient';
import { debugLog } from '@/utils/debugLog';
import { logger } from '@/utils/logger';
import type { AdapterConfig, EpisodeListParseResult, HtmlParsers } from './types';
import {
  validateAnimeDetailsDto,
  validateHomeFeedDto,
  validateStreamSourcesDto,
  validateAnimeSummaryDto,
  validateEpisodeDto,
} from './validate';
import {
  mapDetailsDto,
  mapHomeFeedDto,
  mapStreamDtos,
  mapSummaryDto,
  mapEpisodeDto,
} from './mapToDomain';
import { joinAdapterUrl } from './dom';
import type { EpisodeDto } from './dto';

/**
 * Generic HTML adapter: HttpClient → parsers → DTO validate → domain.
 * Site-specific selectors live only in HtmlParsers implementations.
 */
export class ExternalHtmlProvider implements ContentProvider {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;

  private readonly config: AdapterConfig;
  private readonly parsers: HtmlParsers;
  private readonly http: HttpClient;

  constructor(config: AdapterConfig, parsers: HtmlParsers, http?: HttpClient) {
    this.config = config;
    this.parsers = parsers;
    this.id = config.id;
    this.label = config.label;
    this.enabled = config.enabled;
    this.http = http ?? new HttpClient({
      name: `Http:${config.id}`,
      minIntervalMs: config.minIntervalMs ?? 500,
      timeoutMs: config.timeoutMs ?? 12000,
      userAgent: config.userAgent,
    });
  }

  async getHome(): Promise<ProviderResult<HomeFeed>> {
    return this.run('getHome', async () => {
      const html = await this.fetchText(this.url(this.config.routes.homePath));
      const raw = this.parsers.parseHomeHtml(html, this.config.baseUrl);
      debugLog.push('parser', 'debug', `${this.id}.parseHomeHtml done`);
      const dto = validateHomeFeedDto(raw, this.id);
      return mapHomeFeedDto(dto, this.id);
    });
  }

  async search(query: string): Promise<ProviderResult<AnimeSummary[]>> {
    return this.run('search', async () => {
      const path = this.config.routes.searchPath(query);
      const html = await this.fetchText(this.url(path));
      const raw = this.parsers.parseSearchHtml(html, this.config.baseUrl);
      debugLog.push('parser', 'debug', `${this.id}.parseSearchHtml`, { count: Array.isArray(raw) ? raw.length : 0 });
      if (!Array.isArray(raw)) {
        throw new ProviderError('parse', 'search parser must return an array', this.id);
      }
      const list = raw.map((item) => validateAnimeSummaryDto(item, this.id));
      return list.map((dto) => mapSummaryDto(dto, this.id));
    });
  }

  async getAnimeDetails(id: string): Promise<ProviderResult<AnimeDetails>> {
    return this.run('getAnimeDetails', async () => {
      const externalId = this.externalIdFrom(id);
      const html = await this.fetchText(this.url(this.config.routes.detailsPath(externalId)));
      const raw = this.parsers.parseDetailsHtml(html, this.config.baseUrl);
      debugLog.push('parser', 'debug', `${this.id}.parseDetailsHtml`, { externalId });
      let dto = validateAnimeDetailsDto(raw, this.id);

      if (this.config.routes.episodesPath) {
        const epRaw = await this.fetchEpisodeList(externalId);
        const episodes = epRaw.map((e) => validateEpisodeDto(e, this.id));
        dto = {
          ...dto,
          episodes,
          episodeCount: episodes.length || dto.episodeCount,
        };
        dto = validateAnimeDetailsDto(dto, this.id);
      }

      return mapDetailsDto(dto, this.id);
    });
  }

  async getEpisodes(animeId: string): Promise<ProviderResult<Episode[]>> {
    const details = await this.getAnimeDetails(animeId);
    if (!details.ok) return details;
    return okResult(this.id, details.data.episodes);
  }

  async getStreamSources(
    animeId: string,
    episodeId: string,
  ): Promise<ProviderResult<StreamSource[]>> {
    return this.run('getStreamSources', async () => {
      const animeExternal = this.externalIdFrom(animeId);
      const episodeExternal = this.episodeExternalFrom(episodeId, animeExternal);
      const html = await this.fetchText(
        this.url(this.config.routes.streamPath(animeExternal, episodeExternal)),
      );
      const raw = this.parsers.parseStreamHtml(html, this.config.baseUrl);
      debugLog.push('parser', 'debug', `${this.id}.parseStreamHtml`, {
        animeExternal,
        episodeExternal,
      });
      let dtos = validateStreamSourcesDto(raw, this.id);
      if (this.parsers.enrichStreamSources) {
        // Second arg kept for interface compat; AnimeSaturn ignores HttpClient (Referer).
        const enriched = await this.parsers.enrichStreamSources(dtos, async () => {
          throw new ProviderError(
            'network',
            'enrichStreamSources must not use provider HttpClient for referer-gated URLs',
            this.id,
          );
        });
        dtos = validateStreamSourcesDto(enriched, this.id);
        debugLog.push('parser', 'debug', `${this.id}.enrichStreamSources`, {
          count: dtos.length,
          types: dtos.map((s) => s.type),
        });
      }
      return mapStreamDtos(dtos);
    });
  }

  /** Exposed for unit tests — map episode list without network. */
  mapEpisodesForTest(animeExternalId: string, raw: unknown[]): Episode[] {
    return raw
      .map((e) => validateEpisodeDto(e, this.id))
      .map((dto) => mapEpisodeDto(dto, this.id, animeExternalId));
  }

  private async fetchEpisodeList(externalId: string): Promise<EpisodeDto[]> {
    const episodesPath = this.config.routes.episodesPath;
    if (!episodesPath) return [];

    const pageSize = this.config.routes.episodesPageSize;
    if (!pageSize || pageSize < 1) {
      const epHtml = await this.fetchText(this.url(episodesPath(externalId)));
      return normalizeEpisodeList(
        this.parsers.parseEpisodeListHtml(epHtml, this.config.baseUrl),
      ).episodes;
    }

    const byNum = new Map<number, EpisodeDto>();
    let start = 1;
    let total = Number.POSITIVE_INFINITY;
    let pages = 0;
    const maxPages = 50;

    while (start <= total && pages < maxPages) {
      const end = Math.min(start + pageSize - 1, Number.isFinite(total) ? total : start + pageSize - 1);
      const epHtml = await this.fetchText(
        this.url(episodesPath(externalId, { start, end })),
      );
      const parsed = normalizeEpisodeList(
        this.parsers.parseEpisodeListHtml(epHtml, this.config.baseUrl),
      );
      pages += 1;

      if (parsed.totalCount && parsed.totalCount > 0) {
        total = parsed.totalCount;
      }

      for (const ep of parsed.episodes) {
        byNum.set(ep.number, ep);
      }

      // No total and short page → last window; empty page → stop.
      if (!Number.isFinite(total)) {
        if (parsed.episodes.length === 0 || parsed.episodes.length < pageSize) break;
      } else if (end >= total) {
        break;
      }

      start = end + 1;
    }

    debugLog.push('parser', 'debug', `${this.id}.fetchEpisodeList`, {
      externalId,
      pages,
      count: byNum.size,
      total: Number.isFinite(total) ? total : undefined,
    });

    return Array.from(byNum.values()).sort((a, b) => a.number - b.number);
  }

  private externalIdFrom(animeId: string): string {
    const { externalId } = parseAnimeId(animeId);
    return externalId || animeId;
  }

  private episodeExternalFrom(episodeId: string, animeExternalId: string): string {
    // episode id forms: provider:anime:epN | provider:anime:custom
    const parts = episodeId.split(':');
    if (parts.length >= 3) {
      const tail = parts.slice(2).join(':');
      if (tail.startsWith('ep') && /^\d+$/.test(tail.slice(2))) {
        return tail.slice(2);
      }
      return tail;
    }
    void animeExternalId;
    return episodeId;
  }

  private url(path: string): string {
    try {
      return joinAdapterUrl(path, this.config.baseUrl);
    } catch {
      throw new ProviderError('parse', `Invalid URL path: ${path}`, this.id);
    }
  }

  private async fetchText(
    url: string,
    headers?: Record<string, string>,
  ): Promise<string> {
    debugLog.push('network', 'debug', `${this.id} fetch`, { url });
    const res = await this.http.get(url, headers ? { headers } : undefined);
    if (!res.text || !res.text.trim()) {
      throw new ProviderError('empty', `Empty response from ${url}`, this.id);
    }
    return res.text;
  }

  private async run<T>(
    op: string,
    fn: () => Promise<T>,
  ): Promise<ProviderResult<T>> {
    if (!this.enabled) {
      return errResult(
        this.id,
        new ProviderError('disabled', `Provider ${this.id} disabilitato`, this.id),
      );
    }
    try {
      const data = await fn();
      return okResult(this.id, data);
    } catch (err) {
      const error =
        err instanceof ProviderError
          ? err
          : new ProviderError('unknown', `${op} failed`, this.id, err);
      logger.warn('ExternalAdapter', `${this.id}.${op} failed`, error.message);
      debugLog.push('provider', 'error', `${this.id}.${op}`, { message: error.message });
      return errResult(this.id, error);
    }
  }
}

function normalizeEpisodeList(
  raw: EpisodeDto[] | EpisodeListParseResult,
): EpisodeListParseResult {
  if (Array.isArray(raw)) return { episodes: raw };
  return {
    episodes: Array.isArray(raw.episodes) ? raw.episodes : [],
    totalCount: raw.totalCount,
  };
}
