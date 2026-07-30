import fs from 'node:fs';

const html = fs.readFileSync('tmp-ep.html', 'utf8');
const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
console.log('scripts', scripts);

const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .filter((s) => s.trim().length > 20);
console.log(
  'inline count',
  inline.length,
  'sizes',
  inline.map((s) => s.length),
);
for (const s of inline.slice(0, 8)) {
  console.log('INLINE----');
  console.log(s.slice(0, 800));
}

for (const k of ['__NEXT_DATA__', '__NUXT__', 'application/json', 'episodeId', 'stream_url', 'playlist', 'astro-island', 'data-page']) {
  console.log(k, html.includes(k));
}

// Extract likely API paths
console.log(
  'api-like',
  [...html.matchAll(/["'`](\/api\/[^"'`]+)["'`]/gi)].map((m) => m[1]).slice(0, 40),
);
console.log(
  'fetch-like',
  [...html.matchAll(/fetch\(([^)]+)\)/gi)].map((m) => m[1]).slice(0, 20),
);

// Print a portion around "player" classnames
const playerIdx = html.toLowerCase().indexOf('player');
if (playerIdx >= 0) console.log('player ctx', html.slice(playerIdx - 100, playerIdx + 400));

const watchIdx = html.toLowerCase().indexOf('guarda');
if (watchIdx >= 0) console.log('guarda ctx', html.slice(watchIdx - 50, watchIdx + 300));
