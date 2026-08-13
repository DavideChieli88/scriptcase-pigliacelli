import type { AnimeSummary, StreamSource } from '../../domain/models';

const PROVIDER_ID = 'altadefinizione';

export function absUrl(baseUrl: string, href: string | undefined | null): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function titleFromSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** `/genre/123-slug-streaming.html` or `/genre/123-slug.html` → catalog id parts. */
export function filmIdFromHref(href: string): {
  id: string;
  genre: string;
  numericId: string;
  slug: string;
} | null {
  try {
    const path = href.startsWith('http') ? new URL(href).pathname : href;
    const m = path.match(
      /\/([a-z0-9-]+)\/(\d+)-([a-z0-9-]+?)(?:-(?:streaming|stream))?\.html$/i,
    );
    if (!m) return null;
    const genre = m[1]!;
    const numericId = m[2]!;
    const slug = m[3]!;
    if (/serie-tv|miniserie/i.test(genre)) return null;
    return { id: `${genre}/${numericId}-${slug}`, genre, numericId, slug };
  } catch {
    return null;
  }
}

export function parseSearchTotal(html: string): number | undefined {
  const m = html.match(/Found\s+(\d+)\s+responses/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

/** Highest `/film/page/N/` link in pagination (DLE catalog). */
export function parseMaxFilmPage(html: string): number | undefined {
  let max = 0;
  for (const m of html.matchAll(/\/film\/page\/(\d+)\//gi)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? max : undefined;
}

/**
 * Search pages use `<div class="movie" data-link="…">` (cleaner than all page hrefs).
 * Also picks titles from `.movie-title` when present.
 */
export function parseFilmSearchResults(html: string, baseUrl: string, limit = 120): AnimeSummary[] {
  const out: AnimeSummary[] = [];
  const seen = new Set<string>();
  const blocks = html.split(/<div\s+class="movie"/i).slice(1);

  for (const block of blocks) {
    if (out.length >= limit) break;
    const head = block.slice(0, 900);
    const body = block.slice(0, 2500);
    const link =
      head.match(/data-link="([^"]+)"/i)?.[1] ||
      body.match(/href="((?:https?:\/\/[^"]+)?\/[^"]+\.html)"/i)?.[1];
    if (!link) continue;
    const parsed = filmIdFromHref(link);
    if (!parsed || seen.has(parsed.id)) continue;
    if (/serie-tv/i.test(link)) continue;
    seen.add(parsed.id);

    const title =
      body.match(/class="movie-title"[^>]*>\s*<a[^>]*>([^<]+)</i)?.[1]?.trim() ||
      titleFromSlug(parsed.slug);
    const yearRaw = head.match(/data-year="(\d{4})"/i)?.[1];
    const img =
      body.match(/(?:src|data-src)="([^"]*\/uploads\/[^"]+)"/i)?.[1] ||
      body.match(/(?:src|data-src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1];

    out.push({
      id: parsed.id,
      providerId: PROVIDER_ID,
      title,
      slug: parsed.id,
      coverUrl: absUrl(baseUrl, img),
      year: yearRaw ? Number(yearRaw) : undefined,
      genres: parsed.genre !== 'film' ? [titleFromSlug(parsed.genre)] : undefined,
      status: 'unknown',
    });
  }
  return out;
}

export function parseFilmCards(html: string, baseUrl: string, limit = 36): AnimeSummary[] {
  const out: AnimeSummary[] = [];
  const seen = new Set<string>();
  // Absolute or root-relative film detail links (-streaming optional).
  const re =
    /href="((?:https?:\/\/[^"]+)?\/([a-z0-9-]+)\/(\d+)-([a-z0-9-]+?)(?:-(?:streaming|stream))?\.html)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && out.length < limit) {
    const href = match[1]!;
    const genre = match[2]!;
    const numericId = match[3]!;
    const slug = match[4]!;
    if (/serie-tv|miniserie/i.test(genre) || /serie-tv/i.test(href)) continue;
    const id = `${genre}/${numericId}-${slug}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const window = html.slice(Math.max(0, match.index - 80), match.index + 700);
    const img =
      window.match(/(?:src|data-src)="([^"]*\/uploads\/[^"]+)"/i)?.[1] ||
      window.match(/(?:src|data-src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1];

    out.push({
      id,
      providerId: PROVIDER_ID,
      title: titleFromSlug(slug),
      slug: id,
      coverUrl: absUrl(baseUrl, img),
      genres: genre && genre !== 'film' ? [titleFromSlug(genre)] : undefined,
      status: 'unknown',
    });
  }
  return out;
}

export function parseFilmDetails(
  html: string,
  baseUrl: string,
  animeId: string,
): {
  title: string;
  description?: string;
  coverUrl?: string;
  year?: number;
  genres?: string[];
  imdbDigits?: string;
  embedUrl?: string;
} {
  const ogTitle = html.match(/property="og:title"[^>]*content="([^"]+)"/i)?.[1];
  const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/i)?.[1];
  const ogDesc = html.match(/property="og:description"[^>]*content="([^"]+)"/i)?.[1];
  const title =
    ogTitle?.replace(/\s*streaming.*$/i, '').trim() ||
    titleFromSlug(animeId.split('/').pop()?.replace(/^\d+-/, '') ?? animeId);

  const imdbMeta = html.match(/d2b-imdb["'\s:=]+(?:content=["'])?tt?(\d+)/i)?.[1];
  const imdbInline = html.match(/'tt(\d+)'\.replace\('tt'/i)?.[1] || html.match(/\btt(\d{5,})\b/i)?.[1];
  const imdbDigits = imdbMeta || imdbInline;

  const embedAssign = html.match(
    /dle-player['"]?\)?\.src\s*=\s*['"](https?:\/\/[^'"]+vidxgo[^'"]*\/)['"]\s*\+\s*['"]tt(\d+)['"]\.replace/i,
  );
  const embedUrl = embedAssign
    ? `${embedAssign[1]}${embedAssign[2]}`
    : imdbDigits
      ? `https://v.vidxgo.co/${imdbDigits}`
      : undefined;

  const yearMatch = html.match(/\b(19|20)\d{2}\b/);
  const genreFromId = animeId.split('/')[0];

  return {
    title,
    description: ogDesc,
    coverUrl: absUrl(baseUrl, ogImage),
    year: yearMatch ? Number(yearMatch[0]) : undefined,
    genres: genreFromId && genreFromId !== 'film' ? [titleFromSlug(genreFromId)] : undefined,
    imdbDigits: imdbDigits ?? undefined,
    embedUrl,
  };
}

/** Decode vidxgo inline XOR+base64 blobs (same algorithm shipped in their page). */
export function decodeXorBase64(key: string, b64: string): string {
  const binary = atob(b64);
  let out = '';
  for (let i = 0; i < binary.length; i++) {
    out += String.fromCharCode(binary.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

export function extractDecodedScripts(embedHtml: string): string[] {
  const out: string[] = [];
  const re = /var k=['"]([^'"]+)['"],d=atob\(['"]([^'"]+)['"]\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(embedHtml))) {
    try {
      out.push(decodeXorBase64(match[1], match[2]));
    } catch {
      // skip bad blob
    }
  }
  return out;
}

export function sourcesFromVidxgoEmbed(embedHtml: string): StreamSource[] {
  const decoded = extractDecodedScripts(embedHtml).join('\n');
  // Embeds escape slashes as \/ inside JS strings — normalize before URL matching.
  const haystack = `${embedHtml}\n${decoded}`.replace(/\\\//g, '/');
  const sources: StreamSource[] = [];
  const seen = new Set<string>();

  const push = (url: string, quality?: string) => {
    const clean = url.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    const type = /\.m3u8(\?|$)/i.test(clean) ? 'hls' : /\.mp4(\?|$)/i.test(clean) ? 'mp4' : 'other';
    if (type === 'other' && !/\/playlist\/|\/hls\//i.test(clean)) return;
    sources.push({
      url: clean,
      type: type === 'other' ? 'hls' : type,
      quality,
      label: quality ? `Altadefinizione ${quality}` : 'Altadefinizione',
    });
  };

  const currentSrc = haystack.match(
    /currentSrc\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
  )?.[1];
  if (currentSrc) push(currentSrc, 'default');

  for (const m of haystack.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    const url = m[0].replace(/[,;)\]]+$/, '');
    if (/\.m3u8(\?|$)/i.test(url) || /\.mp4(\?|$)/i.test(url) || /\/playlist\//i.test(url)) {
      push(url);
    }
  }

  for (const m of haystack.matchAll(/["'](\/[^"'\\\s]+(?:m3u8|playlist|hls)[^"'\\\s]*)["']/gi)) {
    push(`https://v.vidxgo.co${m[1]}`);
  }

  return sources;
}
