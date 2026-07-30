import { DEFAULT_UA } from './fetch.mjs';

const eps = await (
  await fetch('https://www.animesaturn.net/api/home/episodes?page=1', {
    headers: { 'User-Agent': DEFAULT_UA },
  })
).json();
console.log('episodes sample', JSON.stringify(eps.items?.slice(0, 2), null, 2));

// scan app.js leftovers for home endpoints
import { readFileSync, existsSync } from 'node:fs';
if (existsSync('tmp-app.js')) {
  const js = readFileSync('tmp-app.js', 'utf8');
  const matches = [...js.matchAll(/\/api\/[a-z0-9_\/?-]+/gi)].map((m) => m[0]);
  console.log('api paths', [...new Set(matches)].slice(0, 80));
}

for (const p of [
  '/api/home/anime?page=1',
  '/api/home/popular',
  '/api/anime/popular',
  '/api/trending',
  '/api/home/ongoing',
]) {
  const r = await fetch(`https://www.animesaturn.net${p}`, { headers: { 'User-Agent': DEFAULT_UA } });
  const t = await r.text();
  console.log(p, r.status, t.slice(0, 120).replace(/\s+/g, ' '));
}
