import { writeFileSync } from 'node:fs';
import { proxyFetch } from './fetch.mjs';

const home = await proxyFetch('https://www.animesaturn.net/');
console.log('home', home.status, home.text.length);

const anime = [...home.text.matchAll(/href="(\/anime\/[^"]+)"/gi)].slice(0, 8).map((m) => m[1]);
console.log('anime samples', anime);

if (!anime[0]) process.exit(1);

const details = await proxyFetch(`https://www.animesaturn.net${anime[0]}`);
console.log('details', details.status, details.text.length);
writeFileSync('tmp-details.html', details.text);

const epHrefs = [
  ...details.text.matchAll(/href="([^"]*watch[^"]*)"/gi),
  ...details.text.matchAll(/href="([^"]*ep[^"]*)"/gi),
  ...details.text.matchAll(/href="([^"]*episod[^"]*)"/gi),
]
  .map((m) => m[1])
  .filter((v, i, a) => a.indexOf(v) === i)
  .slice(0, 15);
console.log('ep-like hrefs', epHrefs);

const buttonEps = [...details.text.matchAll(/href="([^"]+)"[^>]*>[\s\S]{0,40}?Episodio\s*\d+/gi)]
  .map((m) => m[1])
  .slice(0, 10);
console.log('episodio anchors', buttonEps);

const candidate = buttonEps[0] || epHrefs[0];
if (!candidate) {
  console.log('no episode candidate');
  process.exit(0);
}

const epUrl = candidate.startsWith('http')
  ? candidate
  : `https://www.animesaturn.net${candidate.startsWith('/') ? candidate : `/${candidate}`}`;
console.log('fetching ep', epUrl);

const ep = await proxyFetch(epUrl);
console.log('ep page', ep.status, ep.text.length);
writeFileSync('tmp-ep.html', ep.text);

const find = (re) => [...ep.text.matchAll(re)].map((m) => m[0] || m[1]).slice(0, 10);
console.log('mp4', find(/https?:\/\/[^"'\\\s]+\.mp4[^"'\\\s]*/gi));
console.log('m3u8', find(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/gi));
console.log('iframes', find(/<iframe[^>]+src=["']([^"']+)["']/gi).map((s) => s.replace(/^[\s\S]*src=["']/, '').replace(/["'].*$/, '')));
console.log('data-src', [...ep.text.matchAll(/data-src=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10));
console.log('file:', [...ep.text.matchAll(/file\s*[:=]\s*["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10));
console.log('source src', [...ep.text.matchAll(/<source[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10));

for (const key of ['m3u8', 'mp4', 'jwplayer', 'plyr', 'video', 'embed', 'watch.php', 'server']) {
  const i = ep.text.toLowerCase().indexOf(key);
  if (i >= 0) console.log('ctx', key, JSON.stringify(ep.text.slice(Math.max(0, i - 60), i + 140)));
}
