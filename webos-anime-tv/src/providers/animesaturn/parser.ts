import { parseHtmlDocument, stripTags } from '../../core/utils';
import type { AnimeDetails, AnimeSummary, Episode, HomeSection, StreamSource } from '../../domain/models';

const PROVIDER_ID = 'animesaturn';

function absUrl(baseUrl: string, href: string | null | undefined): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function idFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '').replace(/\/$/, '') || url;
  } catch {
    return url;
  }
}

export function parseHomeSections(html: string, baseUrl: string): HomeSection[] {
  const doc = parseHtmlDocument(html);
  // Strict anime detail links only (avoid matching "animesaturn" / promo banners).
  const cards = [...doc.querySelectorAll('a[href*="/anime/"]')].filter((a) => {
    const href = a.getAttribute('href') ?? '';
    try {
      const path = new URL(href, baseUrl).pathname;
      return /^\/anime\/[a-z0-9-]+\/?$/i.test(path);
    } catch {
      return false;
    }
  });

  const seen = new Set<string>();
  const items: AnimeSummary[] = [];

  for (const a of cards) {
    const href = absUrl(baseUrl, a.getAttribute('href'));
    if (!href || seen.has(href)) continue;
    const container = a.closest('article, .card, .anime-card, li, .swiper-slide') ?? a.parentElement;
    const img =
      a.querySelector('img') ||
      container?.querySelector('img') ||
      null;
    const title =
      a.getAttribute('title') ||
      img?.getAttribute('alt') ||
      stripTags(a.textContent ?? '') ||
      'Senza titolo';
    const cleaned = title.replace(/\s+/g, ' ').trim();
    if (cleaned.length < 2) continue;
    if (/telegram|domini ufficiali|unisciti/i.test(cleaned)) continue;

    const coverSrc =
      img?.getAttribute('src') ||
      img?.getAttribute('data-src') ||
      img?.getAttribute('data-lazy-src') ||
      undefined;

    seen.add(href);
    items.push({
      id: idFromUrl(href),
      providerId: PROVIDER_ID,
      title: cleaned,
      coverUrl: absUrl(baseUrl, coverSrc),
      slug: idFromUrl(href),
      status: 'unknown',
    });
    if (items.length >= 24) break;
  }

  return [
    { id: 'popular', title: 'Popolari', items: items.slice(0, 12) },
    { id: 'recent', title: 'Aggiunti di recente', items: items.slice(0, 12).reverse() },
  ];
}

export function parseSearchResults(html: string, baseUrl: string): AnimeSummary[] {
  const sections = parseHomeSections(html, baseUrl);
  return sections[0]?.items ?? [];
}

export function parseAnimeDetails(html: string, baseUrl: string, animeId: string): AnimeDetails {
  const doc = parseHtmlDocument(html);
  const title =
    stripTags(doc.querySelector('h1')?.textContent ?? '') ||
    stripTags(doc.querySelector('title')?.textContent ?? '') ||
    animeId;
  const description =
    stripTags(
      doc.querySelector('.description, .desc, #desc, [itemprop="description"], .anime-desc')?.textContent ??
        doc.querySelector('meta[name="description"]')?.getAttribute('content') ??
        '',
    ) || undefined;
  const cover =
    absUrl(
      baseUrl,
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        doc.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content') ||
        doc.querySelector('.cover img, .locandina img, img.cover')?.getAttribute('src') ||
        doc.querySelector('img[src*="locandine"], img[src*="copertine"]')?.getAttribute('src') ||
        undefined,
    ) || undefined;

  const cleanTitle = title
    .replace(/\s*[-–|]\s*AnimeSaturn.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const episodes = parseEpisodeList(html, baseUrl, animeId);

  return {
    id: animeId,
    providerId: PROVIDER_ID,
    title: cleanTitle || animeId,
    description,
    coverUrl: cover,
    backdropUrl: cover,
    status: 'unknown',
    episodes,
  };
}

export function parseEpisodeList(html: string, baseUrl: string, animeId: string): Episode[] {
  const doc = parseHtmlDocument(html);
  const links = [...doc.querySelectorAll('a')].filter((a) => {
    const href = a.getAttribute('href') ?? '';
    return /\/episode\//i.test(href);
  });

  const episodes: Episode[] = [];
  const seen = new Set<string>();

  for (const a of links) {
    const href = absUrl(baseUrl, a.getAttribute('href'));
    if (!href || seen.has(href)) continue;
    const text = stripTags(a.textContent ?? '');
    const fromPath = href.match(/\/ep-(\d+)/i)?.[1];
    const fromText = text.match(/(\d{1,4})/)?.[1];
    const number = Number(fromPath || fromText || episodes.length + 1);
    seen.add(href);
    episodes.push({
      id: idFromUrl(href),
      animeId,
      providerId: PROVIDER_ID,
      number,
      title: text || `Episodio ${number}`,
      streamAvailable: true,
      watched: false,
    });
  }

  return episodes.sort((a, b) => a.number - b.number);
}

export function parseStreamSources(html: string, baseUrl: string): StreamSource[] {
  const sources: StreamSource[] = [];
  const seen = new Set<string>();

  const push = (url: string, type: StreamSource['type'], label: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    sources.push({ url, type, label });
  };

  for (const m of html.matchAll(/https?:\/\/[^"'\\\s<>]+\.mp4[^"'\\\s<>]*/gi)) {
    push(m[0], 'mp4', 'MP4');
  }
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s<>]+\.m3u8[^"'\\\s<>]*/gi)) {
    push(m[0], 'hls', 'HLS');
  }
  for (const m of html.matchAll(/["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/gi)) {
    const url = m[1];
    push(url, url.includes('.m3u8') ? 'hls' : 'mp4', 'Embedded');
  }

  const doc = parseHtmlDocument(html);
  for (const el of doc.querySelectorAll('video source, video, iframe')) {
    const src = el.getAttribute('src') || el.getAttribute('data-src');
    const abs = absUrl(baseUrl, src);
    if (!abs || abs.includes('a-ads.com') || abs.includes('googletag')) continue;
    push(abs, abs.includes('.m3u8') ? 'hls' : 'mp4', 'DOM');
  }

  return sources;
}
