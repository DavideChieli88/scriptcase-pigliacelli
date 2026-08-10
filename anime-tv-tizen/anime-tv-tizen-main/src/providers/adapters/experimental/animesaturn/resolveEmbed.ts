import type { StreamSourceDto } from '../../dto';
import { ProviderError } from '@/domain/errors';
import { fetchTextWithReferer } from '@/providers/http/fetchWithReferer';
import { debugLog } from '@/utils/debugLog';

const PROVIDER_ID = 'animesaturn';
const PLAY_ORIGIN = 'https://play.saturncdn.net';

export interface SaturnEmbedParams {
  id: string;
  token: string;
  expires: string;
  embedUrl: string;
}

/** Parse play.saturncdn.net/embed/{id}?token=&expires= */
export function parseSaturnEmbedUrl(url: string): SaturnEmbedParams | null {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : PLAY_ORIGIN);
    if (!/saturncdn\.net$/i.test(u.hostname) && !u.pathname.includes('/embed/')) {
      return null;
    }
    const m = u.pathname.match(/\/embed\/(\d+)/);
    if (!m) return null;
    const token = u.searchParams.get('token');
    const expires = u.searchParams.get('expires');
    if (!token || !expires) return null;
    const embedUrl = `${PLAY_ORIGIN}/embed/${m[1]}?token=${encodeURIComponent(token)}&expires=${encodeURIComponent(expires)}`;
    return { id: m[1], token, expires, embedUrl };
  } catch {
    return null;
  }
}

/** XOR-decrypt base64 payload with repeating key (saturncdn playlist scheme). */
export function xorDecryptBase64(payload: string, key: string): string {
  if (!payload || !key) return '';
  const binary = atob(payload);
  let out = '';
  for (let i = 0; i < binary.length; i++) {
    out += String.fromCharCode(binary.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

export function inferMediaType(url: string): 'mp4' | 'hls' | 'other' {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8') || lower.includes('m3u8')) return 'hls';
  if (lower.includes('.mp4') || lower.includes('mp4')) return 'mp4';
  return 'other';
}

/**
 * Prefer Vite `/__sc` proxy in dev (or when VITE_SATURNCDN_PROXY_PREFIX is set).
 * Absolute CDN URL is used on Tizen, where Referer is set via tizen.download.
 */
export function maybeProxySaturnPlayUrl(absoluteUrl: string): string {
  const envPrefix = (import.meta.env as ImportMetaEnv & { VITE_SATURNCDN_PROXY_PREFIX?: string })
    .VITE_SATURNCDN_PROXY_PREFIX;
  const prefix =
    envPrefix ||
    (import.meta.env.DEV ? '/__sc' : '') ||
    (typeof window !== 'undefined' && /:(5173|4173)$/.test(window.location.host) ? '/__sc' : '');
  if (!prefix) return absoluteUrl;
  if (absoluteUrl.startsWith(PLAY_ORIGIN)) {
    return absoluteUrl.replace(PLAY_ORIGIN, prefix.replace(/\/$/, ''));
  }
  return absoluteUrl;
}

export function buildPlaylistUrl(params: SaturnEmbedParams): string {
  const absolute = `${PLAY_ORIGIN}/embed/${params.id}/playlist?token=${encodeURIComponent(params.token)}&expires=${encodeURIComponent(params.expires)}`;
  return maybeProxySaturnPlayUrl(absolute);
}

export interface PlaylistFetch {
  (url: string, headers?: Record<string, string>): Promise<string>;
}

/**
 * Resolve a saturncdn embed into a direct media StreamSourceDto.
 * Playlist requires Referer = embed page (proxy or tizen.download).
 */
export async function resolveSaturnEmbed(
  embedUrl: string,
  fetchText?: PlaylistFetch,
): Promise<StreamSourceDto> {
  const params = parseSaturnEmbedUrl(embedUrl);
  if (!params) {
    throw new ProviderError('parse', 'Embed saturncdn non valido', PROVIDER_ID);
  }

  const playlistUrl = buildPlaylistUrl(params);
  debugLog.push('network', 'info', 'animesaturn resolve playlist', {
    playlistUrl: playlistUrl.slice(0, 120),
    embedUrl: params.embedUrl.slice(0, 80),
    viaProxy: playlistUrl.startsWith('/'),
    hasTizenDownload: typeof window !== 'undefined' && Boolean(window.tizen?.download),
  });

  // Never use ExternalHtmlProvider HttpClient here — browser strips Referer → 403.
  // Tests may inject fetchText; production always uses Referer-aware helper.
  const raw =
    fetchText && import.meta.env.MODE === 'test'
      ? await fetchText(playlistUrl, {
          Accept: 'application/json',
          Referer: params.embedUrl,
          'X-Embed-Referer': params.embedUrl,
        })
      : await fetchTextWithReferer(playlistUrl, params.embedUrl);
  let data: { d?: string; p?: string; ok?: boolean };
  try {
    data = JSON.parse(raw) as { d?: string; p?: string; ok?: boolean };
  } catch {
    throw new ProviderError('parse', 'Playlist saturncdn non JSON', PROVIDER_ID);
  }
  if (data.ok === false || !data.d) {
    throw new ProviderError('empty', 'Playlist saturncdn vuota / referer rifiutato', PROVIDER_ID);
  }

  const src = xorDecryptBase64(data.d, params.token);
  if (!src || src.startsWith('youtube/')) {
    throw new ProviderError(
      'empty',
      src?.startsWith('youtube/') ? 'Sorgente YouTube non supportata' : 'URL media vuoto',
      PROVIDER_ID,
    );
  }

  const type = inferMediaType(src);
  debugLog.push('network', 'info', 'animesaturn media resolved', {
    type,
    url: src.slice(0, 100),
  });
  return {
    url: src,
    type: type === 'other' ? 'mp4' : type,
    label: type === 'hls' ? 'HLS AnimeSaturn' : 'MP4 AnimeSaturn',
  };
}

/** Prefer resolved media; keep embed as last-resort fallback. */
export async function enrichAnimesaturnStreams(
  sources: StreamSourceDto[],
  fetchText?: PlaylistFetch,
): Promise<StreamSourceDto[]> {
  const out: StreamSourceDto[] = [];
  for (const source of sources) {
    // Already a direct media URL (e.g. scraped from watch HTML)
    if (source.type === 'mp4' || source.type === 'hls') {
      out.push(source);
      continue;
    }
    if (source.type === 'other' && /saturncdn\.net|\/embed\/\d+/i.test(source.url)) {
      try {
        // Intentionally do not forward provider HttpClient (strips Referer).
        const resolved = await resolveSaturnEmbed(
          source.url,
          import.meta.env.MODE === 'test' ? fetchText : undefined,
        );
        out.push(resolved);
        continue;
      } catch (err) {
        debugLog.push('provider', 'error', 'animesaturn embed resolve failed', {
          message: err instanceof Error ? err.message : String(err),
          embed: source.url.slice(0, 80),
        });
        out.push(source);
        continue;
      }
    }
    out.push(source);
  }
  out.sort((a, b) => rank(a) - rank(b));
  return out;
}

function rank(s: StreamSourceDto): number {
  if (s.type === 'mp4') return 0;
  if (s.type === 'hls') return 1;
  return 2;
}
