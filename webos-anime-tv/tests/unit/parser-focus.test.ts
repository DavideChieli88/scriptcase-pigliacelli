import { describe, expect, it } from 'vitest';
import { parseHomeSections, parseStreamSources, parseAnimeDetails } from '../../src/providers/animesaturn/parser.ts';
import { FocusGraph } from '../../src/core/focus/FocusManager.ts';
import { stripTags, escapeHtml } from '../../src/core/utils/index.ts';
import type { StreamSource } from '../../src/domain/models/index.ts';

describe('utils', () => {
  it('escapes html', () => {
    expect(escapeHtml('<b>"x"</b>')).toContain('&lt;b&gt;');
  });

  it('strips tags', () => {
    expect(stripTags('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });
});

describe('AnimeSaturn parser', () => {
  const html = `
    <html><body>
      <a href="/anime/aurora-protocol" title="Aurora Protocol"><img src="/img/a.jpg" alt="Aurora Protocol" /></a>
      <a href="/anime/harbor-lights"><img data-src="/img/b.jpg" alt="Harbor Lights" /></a>
      <a href="https://www.animesaturn.me/">Domini ufficiali</a>
      <a href="https://t.me/AnimeSaturnRedirect">Telegram</a>
      <h1>Aurora Protocol</h1>
      <meta property="og:image" content="https://img.saturncdn.net/cover.jpg" />
      <div class="description">Una serie di test.</div>
      <a href="/episode/aurora-protocol/ep-1">Episodio 1</a>
      <a href="/episode/aurora-protocol/ep-2">Episodio 2</a>
      <video src="https://cdn.example.com/video.mp4"></video>
    </body></html>
  `;

  it('parses home cards', () => {
    const sections = parseHomeSections(html, 'https://www.animesaturn.net');
    expect(sections[0].items.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].items[0].providerId).toBe('animesaturn');
    expect(sections[0].items.some((i) => /telegram|domini/i.test(i.title))).toBe(false);
    expect(sections[0].items[0].coverUrl).toContain('/img/');
  });

  it('parses details and episodes', () => {
    const details = parseAnimeDetails(html, 'https://www.animesaturn.net', 'anime/aurora-protocol');
    expect(details.title).toContain('Aurora');
    expect(details.coverUrl).toContain('saturncdn.net/cover.jpg');
    expect(details.episodes.length).toBeGreaterThanOrEqual(2);
  });

  it('parses stream sources', () => {
    const sources = parseStreamSources(html, 'https://www.animesaturn.net');
    expect(sources.some((s: StreamSource) => s.type === 'mp4')).toBe(true);
  });
});

describe('FocusGraph', () => {
  it('finds nearest node by direction using geometry', () => {
    const graph = new FocusGraph();
    const mk = (id: string, left: number, top: number) => {
      const el = {
        dataset: {} as DOMStringMap,
        classList: { add() {}, remove() {} },
        tabIndex: -1,
        focus() {},
        scrollIntoView() {},
        getBoundingClientRect: () => ({
          left,
          top,
          width: 100,
          height: 100,
          right: left + 100,
          bottom: top + 100,
        }),
        hasAttribute: () => false,
      } as unknown as HTMLElement;
      graph.register({ id, el, group: 'g' });
    };
    mk('a', 0, 0);
    mk('b', 200, 0);
    mk('c', 0, 200);
    expect(graph.findNearest('a', 'right')?.id).toBe('b');
    expect(graph.findNearest('a', 'down')?.id).toBe('c');
  });
});
