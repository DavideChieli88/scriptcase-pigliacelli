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

export function parseFilmCards(html: string, baseUrl: string, limit = 36): AnimeSummary[] {
  const out: AnimeSummary[] = [];
  const seen = new Set<string>();
  // Absolute or root-relative film detail links.
  const re =
    /href="((?:https?:\/\/[^"]+)?\/([a-z0-9-]+)\/(\d+)-([a-z0-9-]+)-(?:streaming|stream)[^"]*\.html)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && out.length < limit) {
    const href = match[1];
    const genre = match[2];
    const numericId = match[3];
    const slug = match[4];
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
