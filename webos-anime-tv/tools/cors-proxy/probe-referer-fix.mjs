import { proxyFetch } from './fetch.mjs';

const page = 'https://altadefinizionex.co/horror/34422-la-bocca-del-diavolo-streaming.html';
const embed = 'https://v.vidxgo.co/36958312';

const bad = await proxyFetch(embed, undefined, {});
console.log('default embed headers status', bad.status, bad.text.slice(0, 80).replace(/\n/g, ' '));

const good = await proxyFetch(embed, undefined, { Referer: page });
console.log('with page referer status', good.status, good.text.slice(0, 80).replace(/\n/g, ' '));
console.log('has xor blob', /var k='/.test(good.text), 'len', good.text.length);
