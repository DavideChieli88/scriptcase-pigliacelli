const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const referer = 'https://altadefinizionex.co/horror/34422-la-bocca-del-diavolo-streaming.html';
const embed = 'https://v.vidxgo.co/36958312';

const html = await (
  await fetch(embed, {
    headers: {
      'User-Agent': UA,
      Referer: referer,
      Origin: 'https://altadefinizionex.co',
      'Sec-Fetch-Dest': 'iframe',
    },
  })
).text();

import fs from 'node:fs';
fs.writeFileSync('c:/Users/dvdch/Desktop/Projects/webos-anime-tv/tools/cors-proxy/_vidxgo.html', html);

const patterns = [
  /window\.video[\s\S]{0,500}/i,
  /sources?\s*[:=]\s*\[[\s\S]{0,800}\]/i,
  /file\s*[:=]\s*["'][^"']+/i,
  /https?:[^"'\\\s]+\.m3u8[^"'\\\s]*/gi,
  /https?:[^"'\\\s]+\.mp4[^"'\\\s]*/gi,
  /playlist[^"'\\\s]*/gi,
  /jwplayer[\s\S]{0,400}/i,
  /new Player[\s\S]{0,400}/i,
  /master\.m3u8/i,
  /\/play\//gi,
];

for (const p of patterns) {
  const matches = [...html.matchAll(p instanceof RegExp && p.global ? p : new RegExp(p, 'gi'))].slice(0, 5);
  if (matches.length) console.log(String(p), matches.map((m) => m[0].slice(0, 200)));
}

// scripts with urls
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
console.log(
  'script lens',
  scripts.map((s) => s.length),
);
const juicy = scripts.filter((s) => /m3u8|mp4|playlist|token|video|source/i.test(s));
console.log('juicy scripts', juicy.length);
for (const s of juicy.slice(0, 3)) {
  console.log('---', s.slice(0, 800).replace(/\s+/g, ' '));
}

// fetch linked app js
const jsLinks = [...html.matchAll(/src=["']([^"']+\.js[^"']*)["']/gi)].map((m) => m[1]);
console.log('js', jsLinks);
for (const j of jsLinks.slice(0, 4)) {
  const abs = j.startsWith('http') ? j : new URL(j, embed).toString();
  const js = await (await fetch(abs, { headers: { 'User-Agent': UA, Referer: embed } })).text();
  const hits = [...js.matchAll(/m3u8|playlist|\/api\/|token|expires|master/gi)].slice(0, 15).map((x) => x[0]);
  console.log(abs, 'len', js.length, 'hits', hits);
}
