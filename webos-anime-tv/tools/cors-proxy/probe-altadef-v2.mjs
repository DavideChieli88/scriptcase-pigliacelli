const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function tryEmbed(url, referer) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: referer,
      Origin: new URL(referer).origin,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    },
    redirect: 'follow',
  });
  const html = await r.text();
  return { status: r.status, url: r.url, len: html.length, html };
}

const pageUrl = 'https://altadefinizionex.co/horror/34422-la-bocca-del-diavolo-streaming.html';
const page = await (await fetch(pageUrl, { headers: { 'User-Agent': UA } })).text();
const dlePlayer = page.match(/id=["']dle-player["'][^>]*>/i)?.[0];
console.log('dle-player tag', dlePlayer);
console.log('vidx lines', [...page.matchAll(/vidxgo[\s\S]{0,120}/gi)].map((m) => m[0]));

const r1 = await tryEmbed('https://v.vidxgo.co/36958312', pageUrl);
console.log('vidx', r1.status, r1.len, r1.html.slice(0, 300));

const r2 = await tryEmbed('https://v.vidxgo.co/36958312', 'https://altadefinizionex.co/');
console.log('vidx2', r2.status, r2.len);

// trade site film page
const tradeHome = await (
  await fetch('https://altadefinizionegratis.trade/', { headers: { 'User-Agent': UA } })
).text();
const tradeFilm = [...tradeHome.matchAll(/href="(https?:\/\/[^"]+\/(?:film|horror|azione|drammatico|animazione)\/[^"]+\.html)"/gi)]
  .map((m) => m[1])
  .filter((u) => !/serie-tv/i.test(u))
  .slice(0, 5);
console.log('trade films', tradeFilm);

if (tradeFilm[0]) {
  const d = await (await fetch(tradeFilm[0], { headers: { 'User-Agent': UA } })).text();
  console.log('trade detail', tradeFilm[0], d.length);
  console.log('iframes', [...d.matchAll(/<iframe[^>]+src=["']([^"']+)/gi)].map((m) => m[1]).slice(0, 10));
  console.log('vidx', [...d.matchAll(/vidxgo[\s\S]{0,100}/gi)].map((m) => m[0]));
  console.log('player src assigns', [...d.matchAll(/\.src\s*=\s*([^;]+);/gi)].map((m) => m[1]).slice(0, 10));
}

// Parse film cards with title from altadefinizionex film page more carefully
const filmHtml = await (
  await fetch('https://altadefinizionex.co/film/?tipo=1', { headers: { 'User-Agent': UA } })
).text();
const items = [];
const re =
  /<a[^>]+href="(https?:\/\/altadefinizionex\.co\/[^"]+\/(\d+)-[^"]+streaming\.html)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?(?:<h[1-6][^>]*>|<div class="[^"]*title[^"]*"[^>]*>)([^<]{2,120})/gi;
let m;
while ((m = re.exec(filmHtml)) && items.length < 5) {
  items.push({ href: m[1], id: m[2], img: m[3], title: m[4].trim() });
}
console.log('parsed items', items);

// alternate: title near link
const alt = [];
const re2 =
  /href="(https?:\/\/altadefinizionex\.co\/[a-z0-9-]+\/(\d+)-([a-z0-9-]+)-streaming\.html)"/gi;
const seen = new Set();
while ((m = re2.exec(filmHtml)) && alt.length < 8) {
  if (seen.has(m[2]) || /serie-tv/i.test(m[1])) continue;
  seen.add(m[2]);
  const slug = m[3].replace(/-/g, ' ');
  const imgMatch = filmHtml.slice(Math.max(0, m.index - 200), m.index + 500).match(/(?:src|data-src)="([^"]*uploads[^"]+)"/i);
  alt.push({ id: `${m[2]}-${m[3]}`, href: m[1], title: slug, img: imgMatch?.[1] });
}
console.log('alt parse', alt);
