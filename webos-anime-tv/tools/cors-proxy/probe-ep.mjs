import { writeFileSync } from 'node:fs';
import { proxyFetch } from './fetch.mjs';

const epUrl = 'https://www.animesaturn.net/episode/daemons-of-the-shadow-realm-cyQy4/ep-1';
const ep = await proxyFetch(epUrl);
console.log('ep page', ep.status, ep.text.length);
writeFileSync('tmp-ep.html', ep.text);

console.log('mp4', [...ep.text.matchAll(/https?:\/\/[^"'\\\s]+\.mp4[^"'\\\s]*/gi)].map((m) => m[0]).slice(0, 10));
console.log('m3u8', [...ep.text.matchAll(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/gi)].map((m) => m[0]).slice(0, 10));
console.log(
  'iframes',
  [...ep.text.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10),
);
console.log('data-*', [...ep.text.matchAll(/data-[a-z-]+=["']([^"']+)["']/gi)].map((m) => m[0]).slice(0, 30));
console.log('file:', [...ep.text.matchAll(/file\s*[:=]\s*["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10));
console.log('sources', [...ep.text.matchAll(/<source[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10));
console.log('video tags', [...ep.text.matchAll(/<video[\s\S]*?<\/video>/gi)].map((m) => m[0].slice(0, 300)));

for (const key of ['m3u8', 'mp4', 'jwplayer', 'plyr', 'embed', 'streamtape', 'server', 'watch', 'player', 'link']) {
  const i = ep.text.toLowerCase().indexOf(key);
  if (i >= 0) console.log('ctx', key, JSON.stringify(ep.text.slice(Math.max(0, i - 40), i + 160)));
}

// Look for JSON blobs
const jsonish = [...ep.text.matchAll(/\{[^{}]{0,40}(url|file|src|stream)[^{}]{0,200}\}/gi)].slice(0, 20);
console.log('jsonish', jsonish.map((m) => m[0]));
