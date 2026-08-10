import { proxyFetch } from './fetch.mjs';

function decodeXorBase64(key, b64) {
  const binary = Buffer.from(b64, 'base64');
  let out = '';
  for (let i = 0; i < binary.length; i++) {
    out += String.fromCharCode(binary[i] ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function normalize(url) {
  const out = [url];
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/proxy\/media-(\d+)\/(hls\/.+)/i);
    if (m) {
      out.push(`https://cdn.v1.media-${m[1]}.d2b.you/${m[2]}${u.search}`);
      out.push(`https://cdn.v3.media-${m[1]}.d2b.you/${m[2]}${u.search}`);
      out.push(`https://media-${m[1]}.d2b.you/${m[2]}${u.search}`);
    }
  } catch {}
  return [...new Set(out)];
}

const page =
  'https://altadefinizionex.co/musicale/34419-justin-timberlake-futuresexloveshow-live-from-madison-square-garden-streaming.html';
const pageHtml = (await proxyFetch(page)).text;
const imdb = pageHtml.match(/'tt(\d+)'\.replace\('tt'/i)?.[1];
const embedUrl = `https://v.vidxgo.co/${imdb}`;
const embed = await proxyFetch(embedUrl, undefined, { Referer: page });
const re = /var k=['"]([^'"]+)['"],d=atob\(['"]([^'"]+)['"]\)/g;
let m;
let hay = '';
while ((m = re.exec(embed.text))) hay += decodeXorBase64(m[1], m[2]).replace(/\\\//g, '/') + '\n';
const src = hay.match(/currentSrc\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)?.[1];
console.log('raw', src);
for (const cand of normalize(src)) {
  const r = await proxyFetch(cand, undefined, {
    Referer: embedUrl,
    Origin: 'https://v.vidxgo.co',
  });
  console.log(r.status, cand.slice(0, 90), r.text.slice(0, 80).replace(/\n/g, ' | '));
}
