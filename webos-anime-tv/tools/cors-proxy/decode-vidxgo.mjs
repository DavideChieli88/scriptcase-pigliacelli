function decode(k, b64) {
  const d = Buffer.from(b64, 'base64');
  const u = Buffer.alloc(d.length);
  for (let i = 0; i < d.length; i++) u[i] = d[i] ^ k.charCodeAt(i % k.length);
  return u.toString('utf8');
}

const scripts = [
  {
    k: '5a5652e1',
    d: 'QghbUlpFS2F5IGxzZ20qYWEyFQsVSUdBXBFqU1tTB11QBRcMQUAQVBlDVENBXRVdVBhqU1tTB11QBRcMU1MJQlBNF0ZHVwleVAVqWwZHXRMPB1RaRldJE1cUR1hqVwtQVw1QUhcIEUNABBkUV0cXX2oFQERURgxeW0MPDwUeR1NAE1tpWEECEw9DFxoXUBBDWz5XRFRcARMPQxcaF1AQQ1s+RURcUQATD0MXGhdeClBRFVBFQW0VUkFDDwYZEAleVAVBU0ZGOkRHDRcMF1oRRUUSD2oabkpCQRNQV1hbC1YYAlpbWEcLWEEYG1JQREdMDg==',
  },
  {
    k: '02ce0bcf',
    d: 'R1sNAV8VTTlvYiw1byAsKWQSXkVLQAIFRFsVABJYFxRFV09HXAsNDUMQWT5LQAoCEghSSRIMAgtVEFlHfQ0NA0RTBEUTU0FKEkcRCRJYQQ5ERhMWCj5MOh9REQsHVU0FX18/SgQ+TFcBAlFdA1FWRE0eGEdZBkFcAx5BC1EPBkQKEDMXXwQKEl9cQ0YBQE9ERUAPRwpACxJEQhBfbE0/SVtXTQFFAQISVl4CFUAHEUhTXQ45Hws2JHICUwlSIwE3bB1SUQFaWlAST08eEgsHRAoAT0deAw4DEghBKF8MBhJRVUNGAkBPREVAD0cKQAsSREIQX2xNP0lTQA1SB0wACV1uTFFsTVJXAABbVgNaQRscSUEMVEBZUhwQDQRdB0FcEmIRClYLFwleEkBXEk5BE0JeQV8SChcSQEFZOR8+TBNGHAQJRQEKCFFBAhFfEApIU10OOR8LJSFhQCIXRCNVCwNZAStsTVJSAwZbUBIfPkoSQQYRRAsNAUMQWR4SDwIeb0IGF28XEANCbQcESUBZVAACU1UcQAAfU14GOkhTPBVVUQwLVBFBXAMCT0dTGwAKVW0bV28RBgVfXAcWElhSVABPHl4=',
  },
];

for (const s of scripts) {
  console.log('====');
  console.log(decode(s.k, s.d));
}

// Also pull large script from html file
import fs from 'node:fs';
const html = fs.readFileSync('c:/Users/dvdch/Desktop/Projects/webos-anime-tv/tools/cors-proxy/_vidxgo.html', 'utf8');
const all = [...html.matchAll(/var k='([^']+)',d=atob\('([^']+)'\)/g)];
console.log('obfuscated count', all.length);
for (const m of all) {
  try {
    const text = decode(m[1], m[2]);
    console.log('\n==== key', m[1], 'len', text.length);
    console.log(text.slice(0, 1500));
    if (/m3u8|playlist|fetch|api|mp4|source/i.test(text)) {
      console.log('*** INTERESTING ***');
      console.log(text.match(/https?:[^"'\\\s]+|\/[a-z0-9_/-]+/gi)?.slice(0, 40));
    }
  } catch (e) {
    console.log('decode fail', e.message);
  }
}
