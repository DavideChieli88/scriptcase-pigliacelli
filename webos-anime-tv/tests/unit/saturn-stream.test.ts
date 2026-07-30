import { describe, expect, it } from 'vitest';
import {
  decodeSaturnPayload,
  playlistUrlFromEmbed,
  sourcesFromDecoded,
  toWatchApiPath,
} from '../../src/providers/animesaturn/stream.ts';

describe('AnimeSaturn stream helpers', () => {
  it('maps episode ids to watch API', () => {
    expect(toWatchApiPath('episode/foo-bar/ep-1', 'https://www.animesaturn.net')).toBe(
      'https://www.animesaturn.net/api/watch/foo-bar/ep-1',
    );
    expect(toWatchApiPath('anime/foo-bar/ep-2', 'https://www.animesaturn.net')).toBe(
      'https://www.animesaturn.net/api/watch/foo-bar/ep-2',
    );
    expect(
      toWatchApiPath('https://www.animesaturn.net/episode/foo-bar/ep-3', 'https://www.animesaturn.net'),
    ).toBe('https://www.animesaturn.net/api/watch/foo-bar/ep-3');
  });

  it('builds playlist url from embed', () => {
    const { playlistUrl, token, referer } = playlistUrlFromEmbed(
      'https://play.saturncdn.net/embed/84660?token=abc123&expires=999',
    );
    expect(token).toBe('abc123');
    expect(referer).toContain('/embed/84660');
    expect(playlistUrl).toBe(
      'https://play.saturncdn.net/embed/84660/playlist?token=abc123&expires=999',
    );
  });

  it('decodes xor payload', () => {
    const key = 'tok';
    const plain = 'https://cdn.example.com/video.mp4';
    let encodedBinary = '';
    for (let i = 0; i < plain.length; i++) {
      encodedBinary += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    const b64 = btoa(encodedBinary);
    expect(decodeSaturnPayload(b64, key)).toBe(plain);
  });

  it('builds stream sources from decoded url', () => {
    const sources = sourcesFromDecoded('https://cdn.example.com/a.mp4?x=1', 'Server 1');
    expect(sources[0]?.type).toBe('mp4');
    expect(sourcesFromDecoded('youtube/abc', 'yt')).toEqual([]);
  });
});
