const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const url = 'https://altadefinizionex.co/horror/34422-la-bocca-del-diavolo-streaming.html';
const html = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();

// Find ajax / player endpoints in scripts
const scripts = [...html.matchAll(/src="([^"]+\.js[^"]*)"/gi)].map((m) => m[1]);
console.log('external scripts', scripts.slice(0, 20));

const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const interesting = inline
  .filter((s) => /ajax|player|iframe|embed|mirror|video|news_id|dle_/i.test(s))
  .map((s) => s.slice(0, 500));
console.log('interesting inline count', interesting.length);
interesting.slice(0, 8).forEach((s, i) => console.log('---', i, s.replace(/\s+/g, ' ')));

// news id
console.log('news_id', html.match(/news_id['"\s:=]+(\d+)/i)?.[1]);
console.log('data-id', html.match(/data-id=["'](\d+)["']/i)?.[1]);
console.log('movie-id', html.match(/movie[_-]?id["'\s:=]+(\d+)/i)?.[1]);

// player control buttons
const btns = [...html.matchAll(/<(?:button|a|div)[^>]*(?:class|id)=["'][^"']*(?:player|mirror|host|server|guardare|play)[^"']*["'][^>]*>/gi)].slice(0, 20);
console.log('player-ish tags', btns.map((b) => b[0].slice(0, 180)));

// look for #player or video sources list
const playerBlock = html.match(/id=["']player["'][\s\S]{0,2000}/i)?.[0];
console.log('player block', playerBlock?.replace(/\s+/g, ' ')?.slice(0, 600));

const control = html.match(/player-control|guarda|iframe_url|link_video|embedUrl[\s\S]{0,400}/i)?.[0];
console.log('control', control?.replace(/\s+/g, ' ')?.slice(0, 400));

// Fetch likely template JS
for (const s of scripts.filter((x) => /altadef|player|app|main|custom/i.test(x)).slice(0, 5)) {
  const abs = s.startsWith('http') ? s : `https://altadefinizionex.co${s}`;
  try {
    const js = await (await fetch(abs, { headers: { 'User-Agent': UA } })).text();
    console.log('JS', abs, 'len', js.length);
    const hits = [...js.matchAll(/ajax[^"']{0,80}|player[^"']{0,60}|iframe[^"']{0,60}|engine\/[^"']+/gi)]
      .map((x) => x[0])
      .slice(0, 25);
    console.log(' hits', [...new Set(hits)]);
  } catch (e) {
    console.log('JS fail', abs, e.message);
  }
}
