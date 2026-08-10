import { ProviderError } from '@/domain/errors';
import type {
  AnimeDetailsDto,
  AnimeSummaryDto,
  EpisodeDto,
  HomeFeedDto,
  StreamSourceDto,
} from './dto';

function fail(providerId: string, message: string): never {
  throw new ProviderError('parse', message, providerId);
}

function asRecord(value: unknown, providerId: string, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(providerId, `${label}: expected object`);
  }
  return value as Record<string, unknown>;
}

function optString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function reqString(value: unknown, providerId: string, field: string): string {
  const s = optString(value);
  if (!s) fail(providerId, `Missing/invalid string: ${field}`);
  return s;
}

function optNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optUrl(value: unknown): string | undefined {
  const s = optString(value);
  if (!s) return undefined;
  if (s.startsWith('//')) return `https:${s}`;
  return s;
}

function optStatus(value: unknown): AnimeSummaryDto['status'] | undefined {
  if (value === 'ongoing' || value === 'completed' || value === 'unknown') return value;
  return undefined;
}

export function validateAnimeSummaryDto(
  raw: unknown,
  providerId: string,
): AnimeSummaryDto {
  const o = asRecord(raw, providerId, 'AnimeSummaryDto');
  const genresRaw = o.genres;
  const genres = Array.isArray(genresRaw)
    ? genresRaw.map((g) => optString(g)).filter((g): g is string => Boolean(g))
    : undefined;

  return {
    externalId: reqString(o.externalId, providerId, 'externalId'),
    title: reqString(o.title, providerId, 'title'),
    posterUrl: optUrl(o.posterUrl),
    backdropUrl: optUrl(o.backdropUrl),
    year: optNumber(o.year),
    genres: genres?.length ? genres : undefined,
    status: optStatus(o.status) ?? 'unknown',
  };
}

export function validateEpisodeDto(raw: unknown, providerId: string): EpisodeDto {
  const o = asRecord(raw, providerId, 'EpisodeDto');
  const number = optNumber(o.number);
  if (number === undefined || number < 1) {
    fail(providerId, 'EpisodeDto.number must be >= 1');
  }
  return {
    externalId: optString(o.externalId),
    number,
    title: optString(o.title),
    thumbnailUrl: optUrl(o.thumbnailUrl),
  };
}

export function validateHomeFeedDto(raw: unknown, providerId: string): HomeFeedDto {
  const o = asRecord(raw, providerId, 'HomeFeedDto');
  const featured =
    o.featured === null || o.featured === undefined
      ? null
      : validateAnimeSummaryDto(o.featured, providerId);

  const recentlyAdded = Array.isArray(o.recentlyAdded)
    ? o.recentlyAdded.map((item) => validateAnimeSummaryDto(item, providerId))
    : fail(providerId, 'HomeFeedDto.recentlyAdded must be an array');

  const popular = Array.isArray(o.popular)
    ? o.popular.map((item) => validateAnimeSummaryDto(item, providerId))
    : fail(providerId, 'HomeFeedDto.popular must be an array');

  if (!featured && recentlyAdded.length === 0 && popular.length === 0) {
    throw new ProviderError('empty', 'Home feed vuoto dopo validazione', providerId);
  }

  return { featured, recentlyAdded, popular };
}

export function validateAnimeDetailsDto(
  raw: unknown,
  providerId: string,
): AnimeDetailsDto {
  const o = asRecord(raw, providerId, 'AnimeDetailsDto');
  const base = validateAnimeSummaryDto(o, providerId);
  const episodesRaw = o.episodes;
  if (!Array.isArray(episodesRaw)) {
    fail(providerId, 'AnimeDetailsDto.episodes must be an array');
  }
  const episodes = episodesRaw.map((ep) => validateEpisodeDto(ep, providerId));
  return {
    ...base,
    description: optString(o.description),
    episodeCount: optNumber(o.episodeCount) ?? episodes.length,
    episodes,
  };
}

export function validateStreamSourcesDto(
  raw: unknown,
  providerId: string,
): StreamSourceDto[] {
  if (!Array.isArray(raw)) {
    fail(providerId, 'Stream sources must be an array');
  }
  const sources = raw.map((item, i) => {
    const o = asRecord(item, providerId, `StreamSourceDto[${i}]`);
    const url = reqString(o.url, providerId, 'url');
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
      fail(providerId, `StreamSourceDto[${i}].url must be http(s)`);
    }
    const type =
      o.type === 'mp4' || o.type === 'hls' || o.type === 'other' ? o.type : undefined;
    return {
      url,
      type: type ?? inferStreamType(url),
      label: optString(o.label),
    };
  });
  if (!sources.length) {
    throw new ProviderError('empty', 'Nessuna sorgente stream valida', providerId);
  }
  return sources;
}

function inferStreamType(url: string): StreamSourceDto['type'] {
  if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
  if (/\.mp4(\?|$)/i.test(url)) return 'mp4';
  return 'other';
}
