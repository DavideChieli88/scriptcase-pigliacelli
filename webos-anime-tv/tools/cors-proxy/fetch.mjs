/**
 * Shared fetch helper for personal CORS proxy (Vite middleware + standalone server).
 * Uses node:https/http (not global fetch) so Referer/Origin are actually sent —
 * undici/fetch treats them as forbidden and strips them (vidxgo → 403).
 */
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

export const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const ALLOWED_HOSTS = new Set([
  'www.animesaturn.net',
  'animesaturn.net',
  'www.animeunity.so',
  'animeunity.so',
  'img.animeunity.so',
  'vixcloud.co',
  'www.vixcloud.co',
  'altadefinizionex.co',
  'www.altadefinizionex.co',
  'altadefinizionegratis.trade',
  'www.altadefinizionegratis.trade',
  'v.vidxgo.co',
  'vidxgo.co',
  'd2b.you',
  'image.tmdb.org',
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

function isD2bCdn(hostname) {
  return hostname === 'd2b.you' || hostname.endsWith('.d2b.you');
}

function needsEmbedHeaders(hostname) {
  return /vidxgo|vixcloud|saturncdn|streampeaker/i.test(hostname);
}

/**
 * Rewrite HLS playlist so variant/segment URIs go through the CORS proxy
 * (CDN only allows Origin https://v.vidxgo.co — TV apps must not hit it directly).
 * @param {string} body
 * @param {string} playlistUrl absolute playlist URL
 * @param {string} proxyFetchPath e.g. `/fetch` or `/proxy/fetch`
 * @param {string} [referer]
 */
export function rewriteM3u8Playlist(body, playlistUrl, proxyFetchPath, referer) {
  const base = new URL(playlistUrl);
  const ref = referer || 'https://v.vidxgo.co/';
  const wrap = (rawUri) => {
    const abs = new URL(rawUri, base).toString();
    return `${proxyFetchPath}?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(ref)}`;
  };

  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/gi, (_m, uri) => `URI="${wrap(uri)}"`);
      }
      return wrap(trimmed);
    })
    .join('\n');
}

export function isHlsPlaylist(contentType, text) {
  if (/mpegurl|m3u8/i.test(contentType || '')) return true;
  return /^\s*#EXTM3U/i.test(text || '');
}

/**
 * @param {string} target
 * @param {string} [requestUa]
 * @param {Record<string, string>} [extraHeaders]
 * @returns {Promise<{ status: number, contentType: string, text: string, buffer: Buffer, setCookie: string[] }>}
 */
export function proxyFetch(target, requestUa, extraHeaders = {}) {
  const url = new URL(target);
  const lib = url.protocol === 'https:' ? https : http;

  /** @type {Record<string, string>} */
  const headers = {
    'User-Agent': requestUa || DEFAULT_UA,
    Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
    ...extraHeaders,
  };

  if (isD2bCdn(url.hostname)) {
    // CDN WAF expects browser-like Sec-Fetch-* (without these → 403).
    const referer = headers.Referer || headers.referer || 'https://v.vidxgo.co/';
    headers.Referer = referer;
    headers.Origin = 'https://v.vidxgo.co';
    headers.Accept = '*/*';
    headers['Sec-Fetch-Dest'] = headers['Sec-Fetch-Dest'] || 'empty';
    headers['Sec-Fetch-Mode'] = headers['Sec-Fetch-Mode'] || 'cors';
    headers['Sec-Fetch-Site'] = headers['Sec-Fetch-Site'] || 'cross-site';
  } else if (needsEmbedHeaders(url.hostname)) {
    const referer = headers.Referer || headers.referer || 'https://altadefinizionex.co/';
    headers.Referer = referer;
    try {
      headers.Origin = headers.Origin || new URL(referer).origin;
    } catch {
      headers.Origin = headers.Origin || 'https://altadefinizionex.co';
    }
    headers['Sec-Fetch-Dest'] = headers['Sec-Fetch-Dest'] || 'iframe';
    headers['Sec-Fetch-Mode'] = headers['Sec-Fetch-Mode'] || 'navigate';
    headers['Sec-Fetch-Site'] = headers['Sec-Fetch-Site'] || 'cross-site';
  }

  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      {
        method: 'GET',
        headers,
        timeout: 25000,
        // Some cache nodes present expired certs on :8443
        rejectUnauthorized: url.port !== '8443',
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const status = res.statusCode || 0;
          const raw = res.headers['set-cookie'];
          const setCookie = Array.isArray(raw) ? raw : raw ? [raw] : [];
          if (status >= 300 && status < 400 && res.headers.location) {
            const next = new URL(res.headers.location, url).toString();
            const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
            const nextExtra = { ...extraHeaders };
            if (cookieHeader) {
              nextExtra.Cookie = [extraHeaders.Cookie, cookieHeader].filter(Boolean).join('; ');
            }
            proxyFetch(next, requestUa, nextExtra).then(resolve, reject);
            return;
          }
          resolve({
            status,
            contentType: res.headers['content-type'] || 'text/plain; charset=utf-8',
            text: buf.toString('utf8'),
            buffer: buf,
            setCookie,
          });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Upstream timeout for ${target}`));
    });
    req.end();
  });
}

/**
 * Vidxgo signed playlist: open embed (cookies) then GET /t/{imdb}.
 * @param {string} imdbDigits
 * @param {string} pageReferer film page on Altadefinizione
 */
export async function resolveVidxgoPlaylist(imdbDigits, pageReferer) {
  const id = String(imdbDigits).replace(/^tt/i, '');
  const embedUrl = `https://v.vidxgo.co/${id}`;
  const embed = await proxyFetch(embedUrl, DEFAULT_UA, {
    Referer: pageReferer || 'https://altadefinizionex.co/',
  });
  if (embed.status >= 400) {
    throw new Error(`Vidxgo embed HTTP ${embed.status}`);
  }
  const cookie = embed.setCookie.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
  const tokenUrl = `https://v.vidxgo.co/t/${encodeURIComponent(id)}`;
  const tokenRes = await proxyFetch(tokenUrl, DEFAULT_UA, {
    Referer: embedUrl,
    Origin: 'https://v.vidxgo.co',
    Accept: 'application/json,text/plain,*/*',
    ...(cookie ? { Cookie: cookie } : {}),
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  });
  if (tokenRes.status >= 400) {
    throw new Error(`Vidxgo token HTTP ${tokenRes.status}: ${tokenRes.text.slice(0, 120)}`);
  }
  let data;
  try {
    data = JSON.parse(tokenRes.text);
  } catch {
    throw new Error('Vidxgo token response non JSON');
  }
  if (!data?.url) {
    throw new Error('Vidxgo token senza url');
  }
  return {
    url: String(data.url).replace(/\\\//g, '/'),
    expire: data.expire,
    embedUrl,
  };
}
