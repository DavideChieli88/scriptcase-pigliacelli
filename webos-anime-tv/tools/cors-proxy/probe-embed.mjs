import { writeFileSync } from 'node:fs';
import { proxyFetch, ALLOWED_HOSTS } from './fetch.mjs';

ALLOWED_HOSTS.add('play.saturncdn.net');

const api = await proxyFetch(
  'https://www.animesaturn.net/api/watch/daemons-of-the-shadow-realm-cyQy4/ep-1',
);
const data = JSON.parse(api.text);
console.log('api ok', data.ok);
console.log('videoUrl', data.videoUrl);
console.log('activeEmbed', data.activeEmbed);
console.log('servers', data.servers?.map((s) => ({ id: s.id, name: s.name, link: s.link })));

const embed = data.videoUrl;
const page = await proxyFetch(embed);
console.log('embed status', page.status, page.contentType, page.text.length);
writeFileSync('tmp-embed.html', page.text);

const mp4 = [...page.text.matchAll(/https?:\/\/[^"'\\\s]+\.mp4[^"'\\\s]*/gi)].map((m) => m[0]);
const m3u8 = [...page.text.matchAll(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/gi)].map((m) => m[0]);
console.log('mp4', mp4.slice(0, 8));
console.log('m3u8', m3u8.slice(0, 8));
console.log('file', [...page.text.matchAll(/file\s*[:=]\s*["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10));
console.log(
  'quoted urls',
  [...page.text.matchAll(/["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]).slice(0, 30),
);

for (const k of ['m3u8', 'mp4', 'playlist', 'jwplayer', 'sources', 'hls', 'src', 'player']) {
  const i = page.text.toLowerCase().indexOf(k);
  if (i >= 0) console.log('ctx', k, JSON.stringify(page.text.slice(Math.max(0, i - 40), i + 180)));
}
