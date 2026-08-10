import { describe, expect, it, vi } from 'vitest';
import {
  buildPlaylistUrl,
  enrichAnimesaturnStreams,
  inferMediaType,
  parseSaturnEmbedUrl,
  xorDecryptBase64,
} from '@/providers/adapters/experimental/animesaturn/resolveEmbed';

function xorEncryptBase64(plain: string, key: string): string {
  let out = '';
  for (let i = 0; i < plain.length; i++) {
    out += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(out);
}

describe('animesaturn resolveEmbed', () => {
  it('parses saturncdn embed URL', () => {
    const params = parseSaturnEmbedUrl(
      'https://play.saturncdn.net/embed/13230?token=abc&expires=123',
    );
    expect(params).toEqual({
      id: '13230',
      token: 'abc',
      expires: '123',
      embedUrl: 'https://play.saturncdn.net/embed/13230?token=abc&expires=123',
    });
  });

  it('xor round-trips playlist payload', () => {
    const key = 'tokensecret';
    const plain = 'https://cdn.example/video.mp4?token=x';
    const enc = xorEncryptBase64(plain, key);
    expect(xorDecryptBase64(enc, key)).toBe(plain);
  });

  it('infers media types', () => {
    expect(inferMediaType('https://x/a.mp4')).toBe('mp4');
    expect(inferMediaType('https://x/a.m3u8')).toBe('hls');
    expect(inferMediaType('https://x/other')).toBe('other');
  });

  it('builds playlist URL from embed params', () => {
    const params = parseSaturnEmbedUrl(
      'https://play.saturncdn.net/embed/99?token=t&expires=1',
    )!;
    const url = buildPlaylistUrl(params);
    expect(url).toContain('/embed/99/playlist');
    expect(url).toContain('token=t');
    expect(url).toContain('expires=1');
  });

  it('enriches embed source into mp4 via playlist fetch', async () => {
    const key = 'tokensecret';
    const media = 'https://cdn.example/ep1.mp4?sig=1';
    const fetchText = vi.fn(async () =>
      JSON.stringify({ d: xorEncryptBase64(media, key), p: '' }),
    );

    const out = await enrichAnimesaturnStreams(
      [
        {
          url: `https://play.saturncdn.net/embed/1?token=${key}&expires=9`,
          type: 'other',
          label: 'Embed',
        },
      ],
      fetchText,
    );

    expect(fetchText).toHaveBeenCalled();
    expect(out[0].type).toBe('mp4');
    expect(out[0].url).toBe(media);
    expect(out[0].label).toContain('MP4');
  });

  it('keeps embed when playlist fails', async () => {
    const fetchText = vi.fn(async () => {
      throw new Error('network');
    });
    const embed = {
      url: 'https://play.saturncdn.net/embed/1?token=a&expires=1',
      type: 'other' as const,
      label: 'Embed',
    };
    const out = await enrichAnimesaturnStreams([embed], fetchText);
    expect(out[0]).toEqual(embed);
  });
});
