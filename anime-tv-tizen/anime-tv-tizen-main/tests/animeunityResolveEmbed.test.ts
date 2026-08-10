import { describe, expect, it, vi } from 'vitest';
import {
  enrichAnimeunityStreams,
  extractVixcloudDownloadUrl,
  parseVixcloudEmbedUrl,
} from '@/providers/adapters/experimental/animeunity/resolveEmbed';

const EMBED =
  'https://vixcloud.co/embed/775006?token=abc&expires=123&canPlayFHD=1';
const MP4 =
  'https://au-d1-05.vix-content.net/download/x/1080p.mp4?token=t&expires=1&filename=ep.mp4';

const EMBED_HTML = `
<html><body>
<script>
  window.masterPlaylist = { params: { token: 'x' }, url: 'https://vixcloud.co/playlist/775006' };
  window.downloadUrl = '${MP4}'
</script>
</body></html>`;

describe('animeunity resolveEmbed', () => {
  it('parses vixcloud embed URL', () => {
    const params = parseVixcloudEmbedUrl(EMBED);
    expect(params?.id).toBe('775006');
    expect(params?.embedUrl).toContain('vixcloud.co/embed/775006');
  });

  it('extracts window.downloadUrl from embed HTML', () => {
    expect(extractVixcloudDownloadUrl(EMBED_HTML)).toBe(MP4);
  });

  it('enriches embed source into mp4 via embed fetch', async () => {
    const fetchText = vi.fn(async () => EMBED_HTML);
    const out = await enrichAnimeunityStreams(
      [{ url: EMBED, type: 'other', label: 'Embed AnimeUnity' }],
      fetchText,
    );
    expect(fetchText).toHaveBeenCalled();
    expect(out[0].type).toBe('mp4');
    expect(out[0].url).toBe(MP4);
    expect(out[0].label).toContain('MP4');
  });

  it('keeps embed when downloadUrl missing', async () => {
    const fetchText = vi.fn(async () => '<html><body>no download</body></html>');
    const embed = { url: EMBED, type: 'other' as const, label: 'Embed' };
    const out = await enrichAnimeunityStreams([embed], fetchText);
    expect(out[0]).toEqual(embed);
  });
});
