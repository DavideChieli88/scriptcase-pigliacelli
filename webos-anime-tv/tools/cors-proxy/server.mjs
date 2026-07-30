#!/usr/bin/env node
/**
 * Personal CORS proxy for Anime TV (LAN / webOS device use).
 * In local browser dev, Vite already mounts /proxy — this process is optional.
 *
 * Usage: npm run proxy
 *   GET /fetch?url=<encoded>
 *   GET /health
 */
import http from 'node:http';
import { URL } from 'node:url';
import { DEFAULT_UA, isAllowedUrl, proxyFetch } from './fetch.mjs';

const PORT = Number(process.env.PORT || 8787);

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Proxy-UA,X-Proxy-Referer',
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
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
    const ua = (typeof req.headers['x-proxy-ua'] === 'string' && req.headers['x-proxy-ua']) || DEFAULT_UA;
    const referer = typeof req.headers['x-proxy-referer'] === 'string' ? req.headers['x-proxy-referer'] : undefined;
    const extra = referer ? { Referer: referer } : {};
    const upstream = await proxyFetch(target, ua, extra);
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
