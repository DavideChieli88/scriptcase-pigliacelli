import { writeFileSync } from 'node:fs';
import { DEFAULT_UA, isAllowedUrl } from './fetch.mjs';

// temporary allow for probe
const hosts = new Set(['www.animesaturn.net', 'animesaturn.net', 'play.saturncdn.net']);

async function fetchUrl(url, headers = {}) {
  const upstream = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_UA,
      Accept: '*/*',
      ...headers,
    },
    redirect: 'follow',
  });
  const text = await upstream.text();
  return { status: upstream.status, contentType: upstream.headers.get('content-type'), text };
}

const api = await fetchUrl('https://www.animesaturn.net/api/watch/daemons-of-the-shadow-realm-cyQy4/ep-1');
const data = JSON.parse(api.text);
console.log('videoUrl', data.videoUrl);
writeFileSync('tmp-api.json', api.text);

const embed = await fetchUrl(data.videoUrl, { Referer: 'https://www.animesaturn.net/' });
writeFileSync('tmp-embed.html', embed.text);
console.log('embed len', embed.text.length);

const eMatch = embed.text.match(/window\.__E\s*=\s*(\{[\s\S]*?\});/);
console.log('__E', eMatch?.[1]);

const u = new URL(data.videoUrl);
const id = u.pathname.split('/').filter(Boolean).pop();
const token = u.searchParams.get('token');
const expires = u.searchParams.get('expires');
const playlist = `${u.origin}/embed/${id}/playlist?token=${encodeURIComponent(token)}&expires=${expires}`;

const tries = [
  { Referer: data.videoUrl },
  { Referer: 'https://play.saturncdn.net/' },
  { Referer: 'https://www.animesaturn.net/' },
  { Referer: data.videoUrl, Origin: 'https://play.saturncdn.net' },
];

for (const h of tries) {
  const r = await fetchUrl(playlist, h);
  console.log('try', h, r.status, r.text.slice(0, 300));
}
