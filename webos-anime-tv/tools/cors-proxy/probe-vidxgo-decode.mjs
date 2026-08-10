import { proxyFetch } from './fetch.mjs';
import fs from 'node:fs';

function decodeXorBase64(key, b64) {
  const binary = Buffer.from(b64, 'base64');
  const out = Buffer.alloc(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary[i] ^ key.charCodeAt(i % key.length);
  }
  return out.toString('utf8');
}

const page =
  'https://altadefinizionex.co/musicale/34419-justin-timberlake-futuresexloveshow-live-from-madison-square-garden-streaming.html';
const pageHtml = (await proxyFetch(page)).text;
const imdb = pageHtml.match(/'tt(\d+)'\.replace\('tt'/i)?.[1] || pageHtml.match(/\btt(\d{5,})\b/i)?.[1];
console.log('imdb', imdb);
const embed = `https://v.vidxgo.co/${imdb}`;
const embedRes = await proxyFetch(embed, undefined, { Referer: page });
console.log('embed status', embedRes.status, 'len', embedRes.text.length);
fs.writeFileSync(new URL('./_vidxgo2.html', import.meta.url), embedRes.text);

const re = /var k=['"]([^'"]+)['"],d=atob\(['"]([^'"]+)['"]\)/g;
let m;
let i = 0;
while ((m = re.exec(embedRes.text))) {
  try {
    const decoded = decodeXorBase64(m[1], m[2]);
    console.log('\n==== blob', i++, 'key', m[1], 'len', decoded.length);
    console.log(decoded.slice(0, 2000));
    const urls = [...decoded.matchAll(/https?:\/\/[^"'\\\s]+/g)].map((x) => x[0]);
    console.log('urls', urls.slice(0, 30));
    const paths = [...decoded.matchAll(/["'`](\/[^"'`\\]+(?:m3u8|playlist|play|api)[^"'`]*)["'`]/gi)].map(
      (x) => x[1],
    );
    console.log('paths', paths.slice(0, 20));
  } catch (e) {
    console.log('decode fail', e.message);
  }
}
