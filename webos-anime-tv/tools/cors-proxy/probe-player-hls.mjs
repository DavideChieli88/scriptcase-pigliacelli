import { proxyFetch } from './fetch.mjs';
import fs from 'node:fs';

function decodeXorBase64(key, b64) {
  const binary = Buffer.from(b64, 'base64');
  let out = '';
  for (let i = 0; i < binary.length; i++) {
    out += String.fromCharCode(binary[i] ^ key.charCodeAt(i % key.length));
  }
  return out;
}

const page =
  'https://altadefinizionex.co/musicale/34419-justin-timberlake-futuresexloveshow-live-from-madison-square-garden-streaming.html';
const imdb = (await proxyFetch(page)).text.match(/'tt(\d+)'\.replace\('tt'/i)?.[1];
const embed = await proxyFetch(`https://v.vidxgo.co/${imdb}`, undefined, { Referer: page });
const re = /var k=['"]([^'"]+)['"],d=atob\(['"]([^'"]+)['"]\)/g;
let m;
const blobs = [];
while ((m = re.exec(embed.text))) {
  const d = decodeXorBase64(m[1], m[2]);
  if (d.length > 10000) blobs.push(d);
}
const big = blobs[0] || '';
fs.writeFileSync(new URL('./_player.js', import.meta.url), big);
for (const pat of [
  /loadSource[\s\S]{0,200}/g,
  /fetch\([\s\S]{0,250}/g,
  /xhr[\s\S]{0,200}/gi,
  /Authorization[\s\S]{0,120}/gi,
  /headers\s*[:=][\s\S]{0,200}/gi,
  /master\.m3u8[\s\S]{0,150}/gi,
  /new Hls[\s\S]{0,400}/g,
  /xhrSetup[\s\S]{0,300}/g,
]) {
  const hits = [...big.matchAll(pat)].slice(0, 3).map((x) => x[0].replace(/\s+/g, ' '));
  if (hits.length) console.log('\n', pat, '\n', hits.join('\n---\n'));
}
