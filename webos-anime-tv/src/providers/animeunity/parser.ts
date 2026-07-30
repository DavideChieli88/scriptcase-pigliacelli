import { parseHtmlDocument, stripTags } from '../../core/utils';
import type { AnimeSummary, Episode, StreamSource } from '../../domain/models';

const PROVIDER_ID = 'animeunity';

export interface AnimeUnityRecord {
  id: number;
  slug: string;
  title?: string;
  title_eng?: string;
  title_it?: string;
  imageurl?: string;
  imageurl_cover?: string;
  plot?: string;
  date?: string;
  score?: string | number;
  dub?: number | boolean;
  status?: string | number;
  type?: string;
  episodes_count?: number;
  genres?: Array<{ name?: string } | string>;
}

export interface AnimeUnityApiEpisode {
  id: number;
  number: string | number;
  anime_id?: number;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function extractArchivioRecords(html: string): AnimeUnityRecord[] {
  const m =
    html.match(/id=["']archivio["'][^>]*records=["']([^"']*)["']/i) ||
    html.match(/\brecords=["'](\[[^"']*)["']/i);
  if (!m?.[1]) return [];
  try {
    const parsed = JSON.parse(decodeEntities(m[1])) as AnimeUnityRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordToSummary(record: AnimeUnityRecord): AnimeSummary {
  const id = `${record.id}-${record.slug}`;
  const year = record.date ? Number(String(record.date).slice(0, 4)) : undefined;
  const genres = (record.genres ?? [])
    .map((g) => (typeof g === 'string' ? g : g.name))
    .filter((g): g is string => !!g);
  const statusRaw = String(record.status ?? '').toLowerCase();
  const status =
    statusRaw.includes('1') || /complet|finished/i.test(statusRaw)
      ? ('completed' as const)
      : statusRaw.includes('0') || /ongo|corso/i.test(statusRaw)
        ? ('ongoing' as const)
        : ('unknown' as const);

  return {
    id,
    providerId: PROVIDER_ID,
    title: record.title_it || record.title || record.title_eng || id,
    slug: id,
    coverUrl: record.imageurl,
    backdropUrl: record.imageurl_cover || record.imageurl,
    year: Number.isFinite(year) ? year : undefined,
    genres: genres.length ? genres : undefined,
    rating: record.score != null ? Number(record.score) : undefined,
    description: record.plot,
    status,
  };
}

export function parseHomeSummaries(html: string, limit = 24): AnimeSummary[] {
  const doc = parseHtmlDocument(html);
  const out: AnimeSummary[] = [];
  const seen = new Set<string>();

  for (const a of doc.querySelectorAll('a[href*="/anime/"]')) {
    const href = a.getAttribute('href') ?? '';
    const m = href.match(/\/anime\/(\d+-[^/?#]+)/i);
    if (!m) continue;
    const id = m[1];
    if (seen.has(id)) continue;
    const titleEl = a.querySelector('.latest-anime-title, strong, .title') ?? a;
    const title = stripTags(titleEl.textContent ?? '').trim();
    if (!title || title.length < 2) continue;
    const img = a.querySelector('img')?.getAttribute('src') ?? undefined;
    seen.add(id);
    out.push({
      id,
      providerId: PROVIDER_ID,
      title,
      slug: id,
      coverUrl: img,
      status: 'unknown',
    });
    if (out.length >= limit) break;
  }

  // Fallback: pair absolute anime URLs near titles in raw HTML
  if (!out.length) {
    const re =
      /href="(https?:\/\/[^"]+\/anime\/(\d+-[^"/?#]+))"[^>]*>\s*(?:<[^>]+>\s*)*<strong class="latest-anime-title">([^<]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) && out.length < limit) {
      const id = match[2];
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        providerId: PROVIDER_ID,
        title: match[3].trim(),
        slug: id,
        status: 'unknown',
      });
    }
  }

  return out;
}

export function parseAnimePageMeta(html: string, animeId: string): {
  title: string;
  description?: string;
  coverUrl?: string;
  episodesCount: number;
  genres?: string[];
} {
  const doc = parseHtmlDocument(html);
  const title =
    stripTags(doc.querySelector('h1.title, h1')?.textContent ?? '') || animeId;
  const description = stripTags(doc.querySelector('.description')?.textContent ?? '') || undefined;
  const coverUrl =
    doc.querySelector('img.cover')?.getAttribute('src') ||
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    undefined;
  const player = doc.querySelector('video-player');
  const episodesCount = Number(player?.getAttribute('episodes_count') ?? 0) || 0;
  const genres = [...doc.querySelectorAll('.info-wrapper small, .genres a, .genre')]
    .map((el) => stripTags(el.textContent ?? '').replace(/,/g, '').trim())
    .filter(Boolean);
  return {
    title,
    description,
    coverUrl: coverUrl ?? undefined,
    episodesCount,
    genres: genres.length ? genres : undefined,
  };
}

export function mapApiEpisodes(
  animeId: string,
  episodes: AnimeUnityApiEpisode[],
): Episode[] {
  return episodes.map((ep) => ({
    id: `${animeId}/${ep.id}`,
    animeId,
    providerId: PROVIDER_ID,
    number: Number(ep.number),
    title: `Episodio ${ep.number}`,
    streamAvailable: true,
  }));
}

export function extractEmbedUrl(html: string): string | undefined {
  const doc = parseHtmlDocument(html);
  const fromDom = doc.querySelector('video-player')?.getAttribute('embed_url');
  if (fromDom) return decodeEntities(fromDom);
  const m = html.match(/embed_url=["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]) : undefined;
}

export function resolveVixcloudPlaylist(embedHtml: string): StreamSource[] {
  const scripts = [...embedHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const script = scripts.find((s) => s.includes('window.video'));
  if (!script) return [];

  const domain = script.match(/url:\s*'([^']+)'/)?.[1];
  const token = script.match(/token':\s*'([^']+)'/)?.[1];
  const expires = script.match(/expires':\s*'([^']+)'/)?.[1];
  if (!domain || !token || !expires) return [];

  const url = `${domain}${domain.includes('?') ? '&' : '?'}token=${token}&referer=&expires=${expires}&h=1`;
  return [
    {
      url,
      type: 'hls',
      quality: 'default',
      label: 'AnimeUnity HLS',
    },
  ];
}
