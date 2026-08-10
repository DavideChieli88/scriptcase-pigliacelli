import type { ProviderId } from './models';

/** Build canonical anime id: providerId:externalId */
export function makeAnimeId(providerId: ProviderId, externalId: string): string {
  return `${providerId}:${externalId}`;
}

export function makeEpisodeId(
  providerId: ProviderId,
  animeExternalId: string,
  episodeNumber: number,
): string {
  return `${providerId}:${animeExternalId}:ep${episodeNumber}`;
}

export function parseAnimeId(id: string): { providerId: ProviderId; externalId: string } {
  const idx = id.indexOf(':');
  if (idx <= 0) {
    return { providerId: 'unknown', externalId: id };
  }
  return {
    providerId: id.slice(0, idx),
    externalId: id.slice(idx + 1),
  };
}
