const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const urls = [
  'https://altadefinizionex.co/?do=search&subaction=search&story=matrix',
  'https://altadefinizionex.co/index.php?do=search&subaction=search&story=matrix',
  'https://altadefinizionex.co/?s=inception',
  'https://altadefinizionegratis.trade/?s=matrix',
  'https://altadefinizionegratis.trade/?do=search&subaction=search&story=matrix',
];

for (const u of urls) {
  const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const html = await r.text();
  const titles = [...html.matchAll(/og:title|search-result|search_result|class="[^"]*title[^"]*"[^>]*>([^<]{3,80})/gi)]
    .slice(0, 3)
    .map((m) => m[0].slice(0, 100));
  const links = [
    ...new Set(
      [...html.matchAll(/href="(https?:\/\/[^"]+\/\d+-[^"]*streaming\.html)"/gi)]
        .map((m) => m[1])
        .filter((x) => /matrix|inception|matrix/i.test(x) || true),
    ),
  ]
    .filter((x) => /matrix|inception/i.test(x))
    .slice(0, 8);
  console.log(r.status, r.url.slice(0, 90), 'len', html.length, 'hitLinks', links);
}
