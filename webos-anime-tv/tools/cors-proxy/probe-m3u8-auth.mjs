import { proxyFetch } from './fetch.mjs';
import https from 'node:https';
import { URL } from 'node:url';

function decodeXorBase64(key, b64) {
  const binary = Buffer.from(b64, 'base64');
  let out = '';
  for (let i = 0; i < binary.length; i++) {
    out += String.fromCharCode(binary[i] ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function get(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, { method: 'GET', headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: Buffer.concat(chunks).toString('utf8'),
        }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

const page =
  'https://altadefinizionex.co/musicale/34419-justin-timberlake-futuresexloveshow-live-from-madison-square-garden-streaming.html';
const pageHtml = (await proxyFetch(page)).text;
const imdb = pageHtml.match(/'tt(\d+)'\.replace\('tt'/i)?.[1];
const embedUrl = `https://v.vidxgo.co/${imdb}`;
const embed = await proxyFetch(embedUrl, undefined, { Referer: page });
console.log('embed', embed.status, embed.text.length);

const re = /var k=['"]([^'"]+)['"],d=atob\(['"]([^'"]+)['"]\)/g;
let m;
let hay = '';
while ((m = re.exec(embed.text))) hay += decodeXorBase64(m[1], m[2]).replace(/\\\//g, '/') + '\n';
const src = hay.match(/currentSrc\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)?.[1];
console.log('src', src);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const tries = [
  { Referer: embedUrl, Origin: 'https://v.vidxgo.co', 'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'cross-site' },
  { Referer: 'https://v.vidxgo.co/', Origin: 'https://v.vidxgo.co' },
  { Referer: page, Origin: 'https://altadefinizionex.co' },
];
for (const h of tries) {
  const r = await get(src, { 'User-Agent': UA, Accept: '*/*', ...h });
  console.log('direct', r.status, Object.keys(h).join(','), r.text.slice(0, 120).replace(/\n/g, ' | '));
  const p = await proxyFetch(src, UA, h);
  console.log('proxy ', p.status, Object.keys(h).join(','), p.text.slice(0, 120).replace(/\n/g, ' | '));
}
