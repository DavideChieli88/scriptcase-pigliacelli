import type {
  AnimeDetails,
  AnimeSummary,
  Episode,
  HomeFeed,
  StreamSource,
} from '@/domain/models';
import { makeAnimeId, makeEpisodeId } from '@/domain/ids';
import { stripHtml } from '@/utils/sanitize';
import type {
  AnimeDetailsDto,
  AnimeSummaryDto,
  EpisodeDto,
  HomeFeedDto,
  StreamSourceDto,
} from './dto';

export function mapSummaryDto(dto: AnimeSummaryDto, providerId: string): AnimeSummary {
  return {
    id: makeAnimeId(providerId, dto.externalId),
    providerId,
    title: dto.title,
    posterUrl: dto.posterUrl,
    backdropUrl: dto.backdropUrl,
    year: dto.year,
    genres: dto.genres,
    status: dto.status ?? 'unknown',
  };
}

export function mapEpisodeDto(
  dto: EpisodeDto,
  providerId: string,
  animeExternalId: string,
): Episode {
  const animeId = makeAnimeId(providerId, animeExternalId);
  return {
    id:
      dto.externalId != null && dto.externalId !== ''
        ? `${providerId}:${animeExternalId}:${dto.externalId}`
        : makeEpisodeId(providerId, animeExternalId, dto.number),
    animeId,
    providerId,
    number: dto.number,
    title: dto.title,
    thumbnailUrl: dto.thumbnailUrl,
  };
}

export function mapDetailsDto(dto: AnimeDetailsDto, providerId: string): AnimeDetails {
  const summary = mapSummaryDto(dto, providerId);
  return {
    ...summary,
    description: dto.description ? stripHtml(dto.description) : undefined,
    episodeCount: dto.episodeCount ?? dto.episodes.length,
    episodes: dto.episodes.map((ep) => mapEpisodeDto(ep, providerId, dto.externalId)),
  };
}

export function mapHomeFeedDto(dto: HomeFeedDto, providerId: string): HomeFeed {
  return {
    featured: dto.featured ? mapSummaryDto(dto.featured, providerId) : null,
    recentlyAdded: dto.recentlyAdded.map((a) => mapSummaryDto(a, providerId)),
    popular: dto.popular.map((a) => mapSummaryDto(a, providerId)),
  };
}

export function mapStreamDtos(dtos: StreamSourceDto[]): StreamSource[] {
  return dtos.map((s) => ({
    url: s.url,
    type: s.type ?? 'other',
    label: s.label,
  }));
}
