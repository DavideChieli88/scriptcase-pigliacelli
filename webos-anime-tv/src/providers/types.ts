import type {
  AnimeDetails,
  AnimeSummary,
  Episode,
  HomeSection,
  ProviderResult,
  StreamSource,
} from '../domain/models';
import type { HttpClient } from '../core/net/HttpClient';
import type { Logger } from '../core/logging/Logger';
import type { CacheRepository } from '../persistence/repositories/CacheRepository';
import type { ProviderStateRepository } from '../persistence/repositories/ProviderStateRepository';

export interface ProviderCapabilities {
  home: boolean;
  search: boolean;
  details: boolean;
  episodes: boolean;
  stream: boolean;
  offlineCache: boolean;
}

export interface ProviderContext {
  http: HttpClient;
  logger: Logger;
  cache: CacheRepository;
  providerState: ProviderStateRepository;
  cacheTtlMs: number;
}

export interface ContentProvider {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  capabilities: ProviderCapabilities;
  getHome(): Promise<ProviderResult<HomeSection[]>>;
  search(query: string): Promise<ProviderResult<AnimeSummary[]>>;
  getAnimeDetails(animeId: string): Promise<ProviderResult<AnimeDetails>>;
  getEpisodes(animeId: string): Promise<ProviderResult<Episode[]>>;
  getStreamSources(episodeId: string): Promise<ProviderResult<StreamSource[]>>;
}

export function okResult<T>(providerId: string, data: T): ProviderResult<T> {
  return { providerId, ok: true, data };
}

export function errResult<T = never>(
  providerId: string,
  code: NonNullable<ProviderResult['error']>['code'],
  message: string,
  retryable = true,
): ProviderResult<T> {
  return {
    providerId,
    ok: false,
    error: { code, message, providerId, retryable },
  };
}
