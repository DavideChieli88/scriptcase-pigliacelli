import { proxyFetch } from './fetch.mjs';

function decodeXorBase64(key, b64) {
  const binary = Buffer.from(b64, 'base64');
  let out = '';
  for (let i = 0; i < binary.length; i++) {
    out += String.fromCharCode(binary[i] ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function sourcesFromEmbed(embedHtml) {
  const re = /var k=['"]([^'"]+)['"],d=atob\(['"]([^'"]+)['"]\)/g;
  let m;
  let decoded = '';
  while ((m = re.exec(embedHtml))) decoded += decodeXorBase64(m[1], m[2]) + '\n';
  const haystack = `${embedHtml}\n${decoded}`.replace(/\\\//g, '/');
  return haystack.match(/currentSrc\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)?.[1];
}

const page =
  'https://altadefinizionex.co/musicale/34419-justin-timberlake-futuresexloveshow-live-from-madison-square-garden-streaming.html';
const pageHtml = (await proxyFetch(page)).text;
const imdb = pageHtml.match(/'tt(\d+)'\.replace\('tt'/i)?.[1];
const embed = (await proxyFetch(`https://v.vidxgo.co/${imdb}`, undefined, { Referer: page })).text;
const src = sourcesFromEmbed(embed);
console.log('src', src);
const r = await fetch(src, {
  headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://v.vidxgo.co/' },
});
console.log('m3u8 status', r.status, 'acao', r.headers.get('access-control-allow-origin'));
console.log((await r.text()).slice(0, 300));
