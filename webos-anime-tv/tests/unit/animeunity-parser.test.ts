import { describe, expect, it } from 'vitest';
import {
  extractArchivioRecords,
  mapApiEpisodes,
  recordToSummary,
  resolveVixcloudPlaylist,
} from '../../src/providers/animeunity/parser.ts';

describe('AnimeUnity parser', () => {
  it('extracts archivio records', () => {
    const html = `<div id="archivio" records="[{&quot;id&quot;:1,&quot;slug&quot;:&quot;foo&quot;,&quot;title&quot;:&quot;Foo&quot;,&quot;imageurl&quot;:&quot;https://x/y.jpg&quot;}]"></div>`;
    const records = extractArchivioRecords(html);
    expect(records).toHaveLength(1);
    expect(recordToSummary(records[0]).id).toBe('1-foo');
    expect(recordToSummary(records[0]).title).toBe('Foo');
  });

  it('maps api episodes', () => {
    const eps = mapApiEpisodes('10-bar', [
      { id: 99, number: '2' },
      { id: 100, number: 3 },
    ]);
    expect(eps[0]).toMatchObject({ id: '10-bar/99', number: 2, providerId: 'animeunity' });
    expect(eps[1]?.number).toBe(3);
  });

  it('resolves vixcloud playlist from embed html', () => {
    const html = `<script>window.video = { url: 'https://vixcloud.co/playlist/1', 'token': 'abc', 'expires': '123' };</script>`;
    const sources = resolveVixcloudPlaylist(html);
    expect(sources[0]?.type).toBe('hls');
    expect(sources[0]?.url).toContain('token=abc');
    expect(sources[0]?.url).toContain('expires=123');
  });
});
