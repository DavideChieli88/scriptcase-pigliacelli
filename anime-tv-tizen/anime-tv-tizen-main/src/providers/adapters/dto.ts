/**
 * Adapter-layer DTOs — raw normalized shapes before domain mapping.
 * Parsers must return these (or throw ProviderError parse/empty).
 */

export interface AnimeSummaryDto {
  externalId: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  year?: number;
  genres?: string[];
  status?: 'ongoing' | 'completed' | 'unknown';
}

export interface EpisodeDto {
  externalId?: string;
  number: number;
  title?: string;
  thumbnailUrl?: string;
}

export interface AnimeDetailsDto extends AnimeSummaryDto {
  description?: string;
  episodeCount?: number;
  episodes: EpisodeDto[];
}

export interface HomeFeedDto {
  featured: AnimeSummaryDto | null;
  recentlyAdded: AnimeSummaryDto[];
  popular: AnimeSummaryDto[];
}

export interface StreamSourceDto {
  url: string;
  type?: 'mp4' | 'hls' | 'other';
  label?: string;
}
