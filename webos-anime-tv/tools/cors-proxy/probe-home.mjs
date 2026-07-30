import { writeFileSync } from 'node:fs';
import { DEFAULT_UA } from './fetch.mjs';

const html = await (
  await fetch('https://www.animesaturn.net/', { headers: { 'User-Agent': DEFAULT_UA } })
).text();
writeFileSync('tmp-home.html', html);

const re = /href="(\/anime\/[^"]+)"/gi;
let m;
let c = 0;
while ((m = re.exec(html)) && c < 8) {
  const start = Math.max(0, m.index - 700);
  const chunk = html.slice(start, m.index + 250);
  const imgs = [...chunk.matchAll(/(?:src|data-src|data-lazy-src)="([^"]+)"/gi)].map((x) => x[1]);
  console.log('HREF', m[1]);
  console.log('IMGS', imgs.slice(0, 6));
  console.log('---');
  c += 1;
}

for (const p of ['/api/home', '/api/home/episodes?page=1', '/api/latest']) {
  const r = await fetch(`https://www.animesaturn.net${p}`, { headers: { 'User-Agent': DEFAULT_UA } });
  const t = await r.text();
  console.log(p, r.status, r.headers.get('content-type'), t.slice(0, 220).replace(/\s+/g, ' '));
}
