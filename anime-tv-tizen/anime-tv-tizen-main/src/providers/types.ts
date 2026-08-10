import type {
  AnimeDetails,
  AnimeSummary,
  Episode,
  HomeFeed,
  ProviderId,
  StreamSource,
} from '@/domain/models';
import type { ProviderError } from '@/domain/errors';

export type ProviderResult<T> =
  | { ok: true; data: T; providerId: ProviderId; cached?: boolean }
  | { ok: false; error: ProviderError; providerId: ProviderId };

export interface ContentProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly enabled: boolean;
  getHome(): Promise<ProviderResult<HomeFeed>>;
  search(query: string): Promise<ProviderResult<AnimeSummary[]>>;
  getAnimeDetails(id: string): Promise<ProviderResult<AnimeDetails>>;
  getEpisodes(animeId: string): Promise<ProviderResult<Episode[]>>;
  getStreamSources(
    animeId: string,
    episodeId: string,
  ): Promise<ProviderResult<StreamSource[]>>;
}

export function okResult<T>(providerId: ProviderId, data: T, cached = false): ProviderResult<T> {
  return { ok: true, data, providerId, cached };
}

export function errResult<T>(providerId: ProviderId, error: ProviderError): ProviderResult<T> {
  return { ok: false, error, providerId };
}
