import type { StreamSource } from '../../domain/models';

export interface SaturnWatchApi {
  ok: boolean;
  error?: string;
  videoUrl?: string;
  activeEmbed?: boolean;
  servers?: Array<{ id: number; name: string; link?: string }>;
}

export interface SaturnPlaylist {
  d?: string;
  p?: string;
  t?: string;
  ok?: boolean;
}

/** XOR+base64 decode used by AnimeSaturn embed player. */
export function decodeSaturnPayload(encoded: string, key: string): string {
  if (!encoded) return '';
  const binary = atob(encoded);
  let out = '';
  const k = key || 'as';
  for (let i = 0; i < binary.length; i++) {
    out += String.fromCharCode(binary.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  }
  return out;
}

/**
 * Convert episode/anime path ids to `/api/watch/{slug}/ep-N`.
 * Accepts: episode/slug/ep-1 | anime/slug/ep-1 | slug/ep-1 | full URL
 */
export function toWatchApiPath(episodeId: string, baseUrl: string): string {
  let path = episodeId.trim();
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    // keep raw
  }
  path = path.replace(/^\//, '');
  path = path.replace(/^episode\//i, '').replace(/^anime\//i, '');
  path = path.replace(/^api\/watch\//i, '');
  if (!path) throw new Error(`Invalid episode id: ${episodeId}`);
  return new URL(`/api/watch/${path}`, baseUrl).toString();
}

export function playlistUrlFromEmbed(embedUrl: string): { playlistUrl: string; token: string; referer: string } {
  const u = new URL(embedUrl);
  const parts = u.pathname.split('/').filter(Boolean);
  const id = parts[parts.length - 1];
  const token = u.searchParams.get('token');
  const expires = u.searchParams.get('expires');
  if (!id || !token || !expires) {
    throw new Error('Embed URL missing token/expires');
  }
  const playlistUrl = `${u.origin}/embed/${id}/playlist?token=${encodeURIComponent(token)}&expires=${expires}`;
  return { playlistUrl, token, referer: embedUrl };
}

export function streamTypeFromUrl(url: string): StreamSource['type'] {
  if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
  if (/\.mp4(\?|$)/i.test(url)) return 'mp4';
  return 'other';
}

export function sourcesFromDecoded(url: string, label: string): StreamSource[] {
  if (!url) return [];
  if (url.startsWith('youtube/')) {
    return [];
  }
  return [
    {
      url,
      type: streamTypeFromUrl(url),
      label,
    },
  ];
}
