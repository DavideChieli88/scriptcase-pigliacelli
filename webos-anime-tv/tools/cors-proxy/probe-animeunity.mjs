const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const BASE = 'https://www.animeunity.so';

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

async function main() {
  const searchHtml = await (await fetch(`${BASE}/archivio?title=naruto`, { headers: { 'User-Agent': UA } })).text();
  const m = searchHtml.match(/id="archivio"[^>]*records="([^"]*)"/i) || searchHtml.match(/records="(\[[^"]*)"/i);
  if (!m) throw new Error('no records');
  const items = JSON.parse(decodeEntities(m[1]));
  console.log('search items', items.length, Object.keys(items[0]));
  const first = items[0];
  const id = `${first.id}-${first.slug}`;
  console.log('anime id', id, first.title);

  const pageHtml = await (await fetch(`${BASE}/anime/${id}`, { headers: { 'User-Agent': UA } })).text();
  const epsCount = pageHtml.match(/episodes_count="(\d+)"/i)?.[1];
  console.log('episodes_count', epsCount);

  const infoUrl = `${BASE}/info_api/${id}/1?start_range=1&end_range=5`;
  const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': UA } });
  console.log('info_api', infoRes.status, infoRes.headers.get('content-type'));
  const info = await infoRes.json();
  console.log('info keys', Object.keys(info));
  console.log('ep0', info.episodes?.[0]);

  const epId = info.episodes?.[0]?.id;
  if (!epId) throw new Error('no episode');
  const epPath = `${id}/${epId}`;
  const epHtml = await (await fetch(`${BASE}/anime/${epPath}`, { headers: { 'User-Agent': UA } })).text();
  const embed = epHtml.match(/embed_url="([^"]+)"/i)?.[1]?.replace(/&amp;/g, '&');
  console.log('embed', embed?.slice(0, 120));

  if (embed) {
    const embedHtml = await (await fetch(embed, { headers: { 'User-Agent': UA, Referer: `${BASE}/` } })).text();
    const script = [...embedHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((x) => x[1])
      .find((t) => t.includes('window.video'));
    console.log('has window.video', !!script);
    if (script) {
      const url = script.match(/url:\s*'([^']+)'/)?.[1];
      const token = script.match(/token':\s*'([^']+)'/)?.[1];
      const expires = script.match(/expires':\s*'([^']+)'/)?.[1];
      console.log({ url: url?.slice(0, 80), token: token?.slice(0, 20), expires });
      if (url && token && expires) {
        const stream = `${url}${url.includes('?') ? '&' : '?'}token=${token}&referer=&expires=${expires}&h=1`;
        const m3u = await fetch(stream, { headers: { 'User-Agent': UA, Referer: embed } });
        const body = await m3u.text();
        console.log('m3u status', m3u.status, body.slice(0, 120).replace(/\n/g, ' | '));
      }
    }
  }

  // Home cards
  const homeHtml = await (await fetch(`${BASE}/`, { headers: { 'User-Agent': UA } })).text();
  const links = [...homeHtml.matchAll(/href="(\/anime\/[^"]+)"/g)].map((m) => m[1]);
  console.log('home anime links', links.length, [...new Set(links)].slice(0, 10));
  const titles = [...homeHtml.matchAll(/class="latest-anime-title"[^>]*>([^<]+)/gi)].map((m) => m[1].trim());
  console.log('titles', titles.slice(0, 8));

  // Try archivio empty
  const archHtml = await (await fetch(`${BASE}/archivio`, { headers: { 'User-Agent': UA } })).text();
  const am =
    archHtml.match(/id="archivio"[^>]*records="([^"]*)"/i) || archHtml.match(/records="(\[[^"]*)"/i);
  if (am) {
    const archItems = JSON.parse(decodeEntities(am[1]));
    console.log('archivio default items', archItems.length, archItems[0]?.title);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
