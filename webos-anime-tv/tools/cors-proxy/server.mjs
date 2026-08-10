#!/usr/bin/env node
/**
 * Personal CORS proxy for Anime TV (LAN / webOS device use).
 * In local browser dev, Vite already mounts /proxy — this process is optional.
 *
 * Usage: npm run proxy
 *   GET /fetch?url=<encoded>&referer=<optional>
 *   GET /vidxgo/playlist?imdb=<digits>&referer=<film-page>
 *   GET /health
 */
import http from 'node:http';
import { URL } from 'node:url';
import {
  DEFAULT_UA,
  isAllowedUrl,
  isHlsPlaylist,
  proxyFetch,
  resolveVidxgoPlaylist,
  rewriteM3u8Playlist,
} from './fetch.mjs';

const PORT = Number(process.env.PORT || 8787);

function isBinaryContentType(contentType) {
  return /octet-stream|mp2t|video\/|audio\/|image\//i.test(contentType || '');
}

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const payload = isBuf ? body : typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Proxy-UA,X-Proxy-Referer',
    'Content-Type': isBuf
      ? headers['Content-Type'] || 'application/octet-stream'
      : typeof body === 'string'
        ? headers['Content-Type'] || 'text/plain; charset=utf-8'
        : 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (reqUrl.pathname === '/health') {
    send(res, 200, { ok: true, service: 'anime-tv-cors-proxy' });
    return;
  }

  if (reqUrl.pathname === '/vidxgo/playlist') {
    const imdb = reqUrl.searchParams.get('imdb') || '';
    const referer = reqUrl.searchParams.get('referer') || 'https://altadefinizionex.co/';
    if (!/^\d{5,}$/.test(imdb.replace(/^tt/i, ''))) {
      send(res, 400, { ok: false, error: 'imdb digits required' });
      return;
    }
    try {
      const resolved = await resolveVidxgoPlaylist(imdb, referer);
      send(res, 200, { ok: true, ...resolved });
    } catch (err) {
      console.error('[cors-proxy] vidxgo playlist', err);
      send(res, 502, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (reqUrl.pathname !== '/fetch') {
    send(res, 404, { ok: false, error: 'Not found' });
    return;
  }

  const target = reqUrl.searchParams.get('url');
  if (!target || !isAllowedUrl(target)) {
    send(res, 400, { ok: false, error: 'URL missing or host not allowed' });
    return;
  }

  try {
    const ua =
      (typeof req.headers['x-proxy-ua'] === 'string' && req.headers['x-proxy-ua']) || DEFAULT_UA;
    const referer =
      reqUrl.searchParams.get('referer') ||
      (typeof req.headers['x-proxy-referer'] === 'string' ? req.headers['x-proxy-referer'] : undefined);
    /** @type {Record<string, string>} */
    const extra = {};
    if (referer) {
      extra.Referer = referer;
      try {
        extra.Origin = new URL(referer).origin;
      } catch {
        // ignore
      }
    }
    const upstream = await proxyFetch(target, ua, extra);
    const hostHeader = typeof req.headers.host === 'string' ? req.headers.host : `127.0.0.1:${PORT}`;
    const fetchPath = `http://${hostHeader}/fetch`;
    if (upstream.status < 400 && isHlsPlaylist(upstream.contentType, upstream.text)) {
      const body = rewriteM3u8Playlist(
        upstream.text,
        target,
        fetchPath,
        referer || 'https://v.vidxgo.co/',
      );
      send(res, upstream.status, body, {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
      });
      return;
    }
    if (isBinaryContentType(upstream.contentType) || /\.ts(\?|$)/i.test(target)) {
      send(res, upstream.status, upstream.buffer, { 'Content-Type': upstream.contentType });
      return;
    }
    send(res, upstream.status, upstream.text, { 'Content-Type': upstream.contentType });
  } catch (err) {
    console.error('[cors-proxy] upstream error', err);
    send(res, 502, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[cors-proxy] listening on http://0.0.0.0:${PORT}`);
  console.log(
    `[cors-proxy] example: http://127.0.0.1:${PORT}/fetch?url=${encodeURIComponent('https://www.animesaturn.net/')}`,
  );
});
