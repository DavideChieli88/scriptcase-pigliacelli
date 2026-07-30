import { readFileSync } from 'node:fs';

const html = readFileSync('tmp-home.html', 'utf8');
const imgs = [...html.matchAll(/https:\/\/img\.saturncdn\.net\/[^"'\\\s>]+/g)].map((m) => m[0]);
console.log('count', imgs.length);
console.log([...new Set(imgs)].slice(0, 25));
console.log('lazy attrs', (html.match(/data-[a-z-]*src="[^"]+"/gi) || []).slice(0, 15));
console.log('telegram chunks');
const ti = html.toLowerCase().indexOf('telegram');
console.log(html.slice(Math.max(0, ti - 200), ti + 200).replace(/\s+/g, ' '));
const di = html.toLowerCase().indexOf('domini');
console.log('domini', html.slice(Math.max(0, di - 200), di + 200).replace(/\s+/g, ' '));
