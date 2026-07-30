const h = await (
  await fetch('https://www.animeunity.so/', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
).text();
const i = h.indexOf('latest-anime-title');
console.log(h.slice(Math.max(0, i - 900), i + 250));
console.log('---');
console.log([...h.matchAll(/href="([^"]*anime[^"]*)"/gi)].slice(0, 15).map((m) => m[1]));
