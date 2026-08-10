const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const BASE = 'https://altadefinizionex.co';

async function get(path) {
  const r = await fetch(path.startsWith('http') ? path : `${BASE}${path}`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  return { status: r.status, url: r.url, html: await r.text() };
}

function abs(href, base = BASE) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

const film = await get('/film/?tipo=1');
console.log('film list', film.status, film.url, film.html.length);

// Find movie links
const movieLinks = [
  ...new Set(
    [...film.html.matchAll(/href="([^"]+(?:streaming)?\.html)"/gi)]
      .map((m) => m[1])
      .filter((u) => !/serie-tv/i.test(u) && /\/\d+-/.test(u)),
  ),
].slice(0, 15);
console.log('movie links sample', movieLinks);

// Parse cards near poster images
const cardRe =
  /<a[^>]+href="([^"]+)"[^>]*>[\s\S]{0,400}?<(?:img|IMG)[^>]+(?:src|data-src)="([^"]+)"[\s\S]{0,200}?(?:title|alt)="([^"]*)"/gi;
let cards = [];
let m;
while ((m = cardRe.exec(film.html)) && cards.length < 8) {
  cards.push({ href: m[1], img: m[2], title: m[3] });
}
console.log('cards', cards);

// Search
const search = await get(`/?s=${encodeURIComponent('matrix')}`);
console.log('search', search.status, search.url, search.html.length);
const searchLinks = [
  ...new Set(
    [...search.html.matchAll(/href="(https?:\/\/[^"]+\/\d+-[^"]+streaming\.html)"/gi)].map((x) => x[1]),
  ),
].slice(0, 10);
console.log('search links', searchLinks);

const target = movieLinks[0] || searchLinks[0];
if (!target) {
  console.log('no target');
  process.exit(1);
}
const detailUrl = abs(target);
console.log('detail', detailUrl);
const detail = await get(detailUrl);
console.log('detail status', detail.status, detail.html.length);

// iframes / players
const iframes = [...detail.html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((x) => x[1]);
console.log('iframes', iframes.slice(0, 10));
const players = [...detail.html.matchAll(/data-(?:src|link|url|embed)=["']([^"']+)["']/gi)].map((x) => x[1]);
console.log('data attrs', players.slice(0, 15));
const mirrors = [...detail.html.matchAll(/(?:mirror|host|server|player)[^<]{0,80}/gi)].slice(0, 10).map((x) => x[0]);
console.log('mirror snips', mirrors);

// meta
console.log('og:title', detail.html.match(/property="og:title"[^>]+content="([^"]+)"/i)?.[1]);
console.log('og:image', detail.html.match(/property="og:image"[^>]+content="([^"]+)"/i)?.[1]);
console.log('og:desc', detail.html.match(/property="og:description"[^>]+content="([^"]+)"/i)?.[1]?.slice(0, 120));

// look for maxstream / mixdrop / etc
const hosts = [...detail.html.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^"'<\s]*/gi)]
  .map((x) => x[0])
  .filter((u) => /stream|video|play|embed|cloud|max|mix|dood|voe|filemoon|upstream/i.test(u));
console.log('stream-ish urls', [...new Set(hosts)].slice(0, 20));

// Recent section on home
const home = await get('/');
const recentHeading = home.html.match(/Inseriti di recente[\s\S]{0,3000}/i)?.[0]?.slice(0, 800);
console.log('recent snip', recentHeading?.replace(/\s+/g, ' '));
