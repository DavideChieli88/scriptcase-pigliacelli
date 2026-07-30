import { proxyFetch, ALLOWED_HOSTS } from './fetch.mjs';

ALLOWED_HOSTS.add('play.saturncdn.net');

const api = await proxyFetch(
  'https://www.animesaturn.net/api/watch/daemons-of-the-shadow-realm-cyQy4/ep-1',
);
const data = JSON.parse(api.text);
const u = new URL(data.videoUrl);
const id = u.pathname.split('/').pop();
const playlist = `${u.origin}/embed/${id}/playlist?token=${encodeURIComponent(u.searchParams.get('token'))}&expires=${u.searchParams.get('expires')}`;
console.log('playlist', playlist);
const r = await proxyFetch(playlist);
console.log('status', r.status, r.contentType);
console.log(r.text.slice(0, 2000));
