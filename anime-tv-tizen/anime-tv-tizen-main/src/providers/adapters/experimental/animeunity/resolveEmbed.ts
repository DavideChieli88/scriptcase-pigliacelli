import type { StreamSourceDto } from '../../dto';
import { ProviderError } from '@/domain/errors';
import { fetchTextWithReferer } from '@/providers/http/fetchWithReferer';
import { debugLog } from '@/utils/debugLog';

const PROVIDER_ID = 'animeunity';
const DEFAULT_REFERER = 'https://www.animeunity.so/';

export interface PlaylistFetch {
  (url: string, headers?: Record<string, string>): Promise<string>;
}

/** Parse https://vixcloud.co/embed/{id}?token=&expires= */
export function parseVixcloudEmbedUrl(url: string): { id: string; embedUrl: string } | null {
  try {
    const u = new URL(url);
    if (!/vixcloud\.co$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/\/embed\/(\d+)/);
    if (!m) return null;
    return { id: m[1], embedUrl: u.toString() };
  } catch {
    return null;
  }
}

/** Pull direct MP4 from `window.downloadUrl = '…'` in embed HTML. */
export function extractVixcloudDownloadUrl(html: string): string | null {
  const m =
    html.match(/window\.downloadUrl\s*=\s*'([^']+)'/) ||
    html.match(/window\.downloadUrl\s*=\s*"([^"]+)"/);
  if (!m) return null;
  const url = m[1].trim().replace(/&amp;/g, '&');
  return /^https?:\/\//i.test(url) ? url : null;
}

/**
 * Resolve a vixcloud embed into a direct media StreamSourceDto.
 * Embed iframes are blocked outside animeunity (CSP frame-ancestors).
 */
export async function resolveVixcloudEmbed(
  embedUrl: string,
  fetchText?: PlaylistFetch,
  referer: string = DEFAULT_REFERER,
): Promise<StreamSourceDto> {
  const params = parseVixcloudEmbedUrl(embedUrl);
  if (!params) {
    throw new ProviderError('parse', 'Embed vixcloud non valido', PROVIDER_ID);
  }

  debugLog.push('network', 'info', 'animeunity resolve embed', {
    embedUrl: params.embedUrl.slice(0, 100),
    referer: referer.slice(0, 60),
    hasTizenDownload: typeof window !== 'undefined' && Boolean(window.tizen?.download),
  });

  const html =
    fetchText && import.meta.env.MODE === 'test'
      ? await fetchText(params.embedUrl, { Referer: referer, 'X-Embed-Referer': referer })
      : await fetchTextWithReferer(params.embedUrl, referer, {
          Accept: 'text/html,application/xhtml+xml,*/*',
        });

  const downloadUrl = extractVixcloudDownloadUrl(html);
  if (!downloadUrl) {
    throw new ProviderError('empty', 'downloadUrl assente nell\'embed vixcloud', PROVIDER_ID);
  }

  const type = inferMediaType(downloadUrl);
  debugLog.push('network', 'info', 'animeunity media resolved', {
    type,
    url: downloadUrl.slice(0, 100),
  });
  return {
    url: downloadUrl,
    type: type === 'other' ? 'mp4' : type,
    label: type === 'hls' ? 'HLS AnimeUnity' : 'MP4 AnimeUnity',
  };
}

/** Prefer resolved media; keep embed as last-resort fallback. */
export async function enrichAnimeunityStreams(
  sources: StreamSourceDto[],
  fetchText?: PlaylistFetch,
): Promise<StreamSourceDto[]> {
  const out: StreamSourceDto[] = [];
  for (const source of sources) {
    if (source.type === 'mp4' || source.type === 'hls') {
      out.push(source);
      continue;
    }
    if (source.type === 'other' && /vixcloud\.co\/embed\//i.test(source.url)) {
      try {
        const resolved = await resolveVixcloudEmbed(
          source.url,
          import.meta.env.MODE === 'test' ? fetchText : undefined,
        );
        out.push(resolved);
        continue;
      } catch (err) {
        debugLog.push('provider', 'error', 'animeunity embed resolve failed', {
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

function inferMediaType(url: string): 'mp4' | 'hls' | 'other' {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8') || lower.includes('m3u8')) return 'hls';
  if (lower.includes('.mp4') || lower.includes('mp4')) return 'mp4';
  return 'other';
}

function rank(s: StreamSourceDto): number {
  if (s.type === 'mp4') return 0;
  if (s.type === 'hls') return 1;
  return 2;
}
