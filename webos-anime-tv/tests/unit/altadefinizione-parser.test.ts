import { describe, expect, it } from 'vitest';
import {
  decodeXorBase64,
  parseFilmCards,
  parseFilmDetails,
  parseFilmSearchResults,
  parseMaxFilmPage,
  parseSearchTotal,
  sourcesFromVidxgoEmbed,
  titleFromSlug,
} from '../../src/providers/altadefinizione/parser.ts';

describe('Altadefinizione parser', () => {
  it('titleFromSlug', () => {
    expect(titleFromSlug('la-bocca-del-diavolo')).toBe('La Bocca Del Diavolo');
  });

  it('reads the last catalog page from pagination links', () => {
    const html = `
      <a href="/film/page/2/?tipo=1">2</a>
      <a href="/film/page/1042/?tipo=1">1042</a>
      <a href="/film/page/3/?tipo=1">3</a>
    `;
    expect(parseMaxFilmPage(html)).toBe(1042);
  });

  it('parses film cards', () => {
    const html = `
      <a href="https://altadefinizionex.co/horror/34422-la-bocca-del-diavolo-streaming.html">
        <img src="/uploads/thumb/x.jpg" />
      </a>
      <a href="https://altadefinizionex.co/serie-tv/1-foo-streaming.html">skip</a>
    `;
    const items = parseFilmCards(html, 'https://altadefinizionex.co');
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('horror/34422-la-bocca-del-diavolo');
    expect(items[0]?.coverUrl).toContain('/uploads/thumb/x.jpg');
  });

  it('parses details and embed', () => {
    const html = `
      <meta property="og:title" content="Matrix streaming HD" />
      <meta property="og:image" content="https://altadefinizionex.co/uploads/a.jpg" />
      <meta property="og:description" content="Neo." />
      <script>document.getElementById('dle-player').src = 'https://v.vidxgo.co/' + 'tt0133093'.replace('tt','');</script>
    `;
    const meta = parseFilmDetails(html, 'https://altadefinizionex.co', 'fantascienza/2084-matrix');
    expect(meta.title).toBe('Matrix');
    expect(meta.embedUrl).toBe('https://v.vidxgo.co/0133093');
    expect(meta.description).toBe('Neo.');
  });

  it('extracts currentSrc with escaped slashes', () => {
    const plain =
      'let currentSrc = "https:\\/\\/cdn.example.com\\/hls\\/1\\/master.m3u8?t=abc";';
    const key = 'zz';
    let enc = '';
    for (let i = 0; i < plain.length; i++) {
      enc += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    const b64 = btoa(enc);
    const html = `<script>(function(){var k='${key}',d=atob('${b64}');})();</script>`;
    const sources = sourcesFromVidxgoEmbed(html);
    expect(sources[0]?.url).toBe('https://cdn.example.com/hls/1/master.m3u8?t=abc');
    expect(sources[0]?.type).toBe('hls');
  });

  it('parses relative film cards', () => {
    const html = `
      <a href="/commedia/1-foo-bar-streaming.html"><img src="/uploads/a.jpg" /></a>
    `;
    const items = parseFilmCards(html, 'https://altadefinizionex.co');
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('commedia/1-foo-bar');
  });

  it('parses search movie cards across streaming and plain html links', () => {
    const html = `
      <div class="col-12 text-muted">Found 59 responses (Query results 1 - 30) :</div>
      <div class="movie" data-year="2022" data-link="https://altadefinizionex.co/crime/19091-the-batman-2022-streaming.html">
        <h2 class="movie-title"><a href="#">The Batman</a></h2>
        <img src="/uploads/thumb/x.jpg" />
      </div>
      <div class="movie" data-year="2005" data-link="https://altadefinizionex.co/azione/2210-batman-begins.html">
        <h2 class="movie-title"><a href="#">Batman Begins</a></h2>
      </div>
      <div class="movie" data-link="https://altadefinizionex.co/serie-tv/1-foo-streaming.html">
        <h2 class="movie-title"><a href="#">Serie</a></h2>
      </div>
    `;
    expect(parseSearchTotal(html)).toBe(59);
    const items = parseFilmSearchResults(html, 'https://altadefinizionex.co');
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe('The Batman');
    expect(items[0]?.id).toBe('crime/19091-the-batman-2022');
    expect(items[1]?.id).toBe('azione/2210-batman-begins');
    expect(items[1]?.year).toBe(2005);
  });
});
