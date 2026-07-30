/**
 * Shared fetch helper for personal CORS proxy (Vite middleware + standalone server).
 */
export const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const ALLOWED_HOSTS = new Set([
  'www.animesaturn.net',
  'animesaturn.net',
  'www.animeunity.so',
  'animeunity.so',
  'play.saturncdn.net',
  'saturncdn.net',
  'img.saturncdn.net',
  'streampeaker.org',
  'commondatastorage.googleapis.com',
  'picsum.photos',
]);

export function isAllowedUrl(target) {
  try {
    const u = new URL(target);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (ALLOWED_HOSTS.has(u.hostname)) return true;
    return [...ALLOWED_HOSTS].some((h) => u.hostname.endsWith(`.${h}`) || u.hostname === h);
  } catch {
    return false;
  }
}

export async function proxyFetch(target, requestUa, extraHeaders = {}) {
  const upstream = await fetch(target, {
    headers: {
      'User-Agent': requestUa || DEFAULT_UA,
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      ...extraHeaders,
    },
    redirect: 'follow',
  });
  const contentType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';
  const text = await upstream.text();
  return { status: upstream.status, contentType, text };
}
