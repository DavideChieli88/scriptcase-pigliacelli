const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const hosts = ['https://altadefinizionex.co/', 'https://altadefinizionegratis.trade/'];

async function probe(h) {
  const r = await fetch(h, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const t = await r.text();
  console.log('===', h, 'status', r.status, 'final', r.url, 'len', t.length);
  console.log('title', (t.match(/<title[^>]*>([^<]+)/i) || [])[1]);
  const links = [...t.matchAll(/href="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter((u) => /film|serie|search|movie|archiv|wp-json|api|page/i.test(u));
  console.log('interesting', [...new Set(links)].slice(0, 40));
  console.log('has search form', /name=["']s["']|search/i.test(t));
  // sample film card
  const i = t.search(/film|movie|poster/i);
  console.log('snip', t.slice(Math.max(0, i), Math.max(0, i) + 500).replace(/\s+/g, ' '));
}

for (const h of hosts) {
  try {
    await probe(h);
  } catch (e) {
    console.log('FAIL', h, e.message);
  }
}
