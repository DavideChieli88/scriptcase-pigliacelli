const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const id = '36958312';
const referer = 'https://v.vidxgo.co/' + id;
const paths = [
  `/playlist/${id}`,
  `/playlist/tt${id}`,
  `/api/playlist/${id}`,
  `/api/source/${id}`,
  `/play/${id}`,
  `/playlist/${id}.m3u8`,
  `/stream/${id}`,
  `/embed/${id}/playlist`,
  `/api/v1/video/${id}`,
  `/watch/${id}`,
];

for (const p of paths) {
  const url = `https://v.vidxgo.co${p}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: referer, Accept: '*/*' },
    });
    const t = await r.text();
    console.log(r.status, p, t.slice(0, 80).replace(/\n/g, ' '));
  } catch (e) {
    console.log('ERR', p, e.message);
  }
}
