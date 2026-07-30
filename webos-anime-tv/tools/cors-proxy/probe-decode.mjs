import { DEFAULT_UA } from './fetch.mjs';

function dec(b, k) {
  if (!b) return '';
  const s = Buffer.from(b, 'base64').toString('binary');
  let o = '';
  k = k || 'as';
  for (let i = 0; i < s.length; i++) {
    o += String.fromCharCode(s.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  }
  return o;
}

async function fetchUrl(url, headers = {}) {
  const upstream = await fetch(url, {
    headers: { 'User-Agent': DEFAULT_UA, Accept: '*/*', ...headers },
    redirect: 'follow',
  });
  return { status: upstream.status, text: await upstream.text(), headers: upstream.headers };
}

const api = await fetchUrl('https://www.animesaturn.net/api/watch/daemons-of-the-shadow-realm-cyQy4/ep-1');
const data = JSON.parse(api.text);
const u = new URL(data.videoUrl);
const id = u.pathname.split('/').filter(Boolean).pop();
const token = u.searchParams.get('token');
const expires = u.searchParams.get('expires');
const playlist = `${u.origin}/embed/${id}/playlist?token=${encodeURIComponent(token)}&expires=${expires}`;
const r = await fetchUrl(playlist, { Referer: data.videoUrl });
const body = JSON.parse(r.text);
const src = dec(body.d, token);
const poster = dec(body.p, token);
console.log('src', src);
console.log('poster', poster);

const head = await fetch(src, {
  method: 'HEAD',
  headers: { 'User-Agent': DEFAULT_UA, Referer: data.videoUrl },
});
console.log('media', head.status, head.headers.get('content-type'), head.headers.get('content-length'));
