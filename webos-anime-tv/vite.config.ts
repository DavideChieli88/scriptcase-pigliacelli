import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { isAllowedUrl, proxyFetch, DEFAULT_UA } from './tools/cors-proxy/fetch.mjs';

/** In-dev /proxy so `npm run dev` works without a second terminal. */
function animeTvProxyPlugin() {
  return {
    name: 'anime-tv-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/proxy')) return next();

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Proxy-UA,X-Proxy-Referer');
          res.end();
          return;
        }

        try {
          const reqUrl = new URL(req.url, 'http://localhost');
          if (reqUrl.pathname === '/proxy/health') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, service: 'anime-tv-vite-proxy' }));
            return;
          }

          if (reqUrl.pathname !== '/proxy/fetch') {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: 'Not found' }));
            return;
          }

          const target = reqUrl.searchParams.get('url');
          if (!target || !isAllowedUrl(target)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'URL missing or host not allowed' }));
            return;
          }

          const ua = (req.headers['x-proxy-ua'] as string | undefined) || DEFAULT_UA;
          const referer = req.headers['x-proxy-referer'] as string | undefined;
          const extra: Record<string, string> = {};
          if (referer) extra.Referer = referer;
          const upstream = await proxyFetch(target, ua, extra);
          res.statusCode = upstream.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', upstream.contentType);
          res.end(upstream.text);
        } catch (err) {
          console.error('[anime-tv-dev-proxy]', err);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [animeTvProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: false,
  },
});
