import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { FocusEngine, scoreNeighbor } from '@/navigation/FocusEngine';
import { mapKeyCode, isDirectional } from '@/navigation/KeyMap';
import { isTextEditingElement } from '@/navigation/RemoteInput';
import { FocusMemory } from '@/navigation/FocusMemory';

describe('KeyMap', () => {
  it('maps Samsung Back and arrows', () => {
    expect(mapKeyCode(10009)).toBe('back');
    expect(mapKeyCode(8)).toBe('back');
    expect(mapKeyCode(37)).toBe('left');
    expect(mapKeyCode(13)).toBe('enter');
    expect(mapKeyCode(415)).toBe('play');
    expect(isDirectional('up')).toBe(true);
    expect(isDirectional('enter')).toBe(false);
  });
});

describe('isTextEditingElement', () => {
  it('detects editable inputs and ignores read-only', () => {
    const input = document.createElement('input');
    expect(isTextEditingElement(input)).toBe(true);
    input.readOnly = true;
    expect(isTextEditingElement(input)).toBe(false);
    const ta = document.createElement('textarea');
    expect(isTextEditingElement(ta)).toBe(true);
    expect(isTextEditingElement(document.createElement('button'))).toBe(false);
    expect(isTextEditingElement(null)).toBe(false);
  });
});

describe('scoreNeighbor', () => {
  it('prefers closer aligned candidate to the right', () => {
    const cur = { x: 100, y: 100 };
    const near = scoreNeighbor(cur, { x: 200, y: 105 }, 'right');
    const far = scoreNeighbor(cur, { x: 400, y: 200 }, 'right');
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(near!).toBeLessThan(far!);
  });

  it('rejects candidates in the wrong direction', () => {
    expect(scoreNeighbor({ x: 100, y: 100 }, { x: 50, y: 100 }, 'right')).toBeNull();
  });
});

describe('FocusMemory', () => {
  it('remembers and recalls focus ids per scope', () => {
    const mem = new FocusMemory();
    mem.remember('home:popular', 'popular-3');
    expect(mem.recall('home:popular')).toBe('popular-3');
    mem.clear('home:popular');
    expect(mem.recall('home:popular')).toBeUndefined();
  });
});

describe('FocusEngine row navigation', () => {
  let root: HTMLElement;
  let engine: FocusEngine;

  function place(el: HTMLElement, x: number, y: number, w = 80, h = 40): void {
    el.getBoundingClientRect = () =>
      ({
        left: x,
        top: y,
        right: x + w,
        bottom: y + h,
        width: w,
        height: h,
        x,
        y,
        toJSON() {
          return {};
        },
      }) as DOMRect;
  }

  function node(id: string, row: string, x: number, y: number): HTMLElement {
    const el = document.createElement('button');
    engine.register(el, { id, row });
    place(el, x, y);
    root.appendChild(el);
    return el;
  }

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    engine = new FocusEngine();
    engine.setRoot(root);
    engine.setScope('test');
  });

  afterEach(() => {
    root.remove();
  });

  it('does not wrap horizontally past row edges', () => {
    const a = node('hero-play', 'hero', 100, 200);
    const b = node('hero-details', 'hero', 220, 200);
    node('rail-0', 'rail', 100, 400);
    node('rail-1', 'rail', 220, 400);

    engine.focus(a);
    engine.handleAction('left');
    expect(engine.getCurrentId()).toBe('hero-play');

    engine.focus(b);
    engine.handleAction('right');
    expect(engine.getCurrentId()).toBe('hero-details');
  });

  it('moves vertically to the first item of the adjacent row', () => {
    node('nav-search', 'topbar', 100, 20);
    node('nav-watchlist', 'topbar', 220, 20);
    const play = node('hero-play', 'hero', 100, 200);
    node('hero-details', 'hero', 220, 200);
    node('rail-0', 'rail', 100, 400);
    node('rail-1', 'rail', 300, 400);

    engine.focus(play);
    engine.handleAction('up');
    expect(engine.getCurrentId()).toBe('nav-search');

    engine.focus(play);
    engine.handleAction('down');
    expect(engine.getCurrentId()).toBe('rail-0');

    engine.focusById('rail-1');
    engine.handleAction('up');
    expect(engine.getCurrentId()).toBe('hero-play');
  });

  it('goes to hero from rail even when sticky topbar is closer in the viewport', () => {
    // Append order = visual stack; viewport Y would wrongly prefer sticky topbar.
    node('nav-search', 'topbar', 100, 40);
    node('hero-play', 'hero', 100, -200);
    node('hero-details', 'hero', 220, -200);
    const rail = node('rail-0', 'rail', 100, 400);

    engine.focus(rail);
    engine.handleAction('up');
    expect(engine.getCurrentId()).toBe('hero-play');
  });

  it('invokes onLongPress and reports currentHasLongPress', () => {
    let pressed = false;
    const el = document.createElement('button');
    engine.register(el, {
      id: 'card-0',
      row: 'continue',
      onLongPress: () => {
        pressed = true;
      },
    });
    place(el, 100, 400);
    root.appendChild(el);
    engine.focus(el);
    expect(engine.currentHasLongPress()).toBe(true);
    expect(engine.handleAction('longPress')).toBe(true);
    expect(pressed).toBe(true);
  });
});
