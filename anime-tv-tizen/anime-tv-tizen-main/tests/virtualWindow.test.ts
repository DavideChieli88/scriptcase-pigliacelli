import { describe, expect, it } from 'vitest';
import {
  computeVirtualWindow,
  railBufferForViewport,
  railItemStride,
} from '@/ui/components/virtualWindow';

describe('computeVirtualWindow', () => {
  it('returns empty for zero length', () => {
    expect(computeVirtualWindow(0, 0, 4)).toEqual({ start: 0, end: 0 });
  });

  it('clamps around the focused index', () => {
    expect(computeVirtualWindow(0, 20, 4)).toEqual({ start: 0, end: 5 });
    expect(computeVirtualWindow(10, 20, 4)).toEqual({ start: 6, end: 15 });
    expect(computeVirtualWindow(19, 20, 4)).toEqual({ start: 15, end: 20 });
  });

  it('keeps neighbors of focus in the window', () => {
    const { start, end } = computeVirtualWindow(7, 30, 4);
    expect(start).toBeLessThanOrEqual(6);
    expect(end).toBeGreaterThan(8);
  });
});

describe('railItemStride', () => {
  it('adds poster width and gap', () => {
    expect(railItemStride(280, 24)).toBe(304);
  });
});

describe('railBufferForViewport', () => {
  it('covers a full 1080p track with spare', () => {
    expect(railBufferForViewport(1920, 304, 4)).toBeGreaterThanOrEqual(8);
  });

  it('respects the minimum buffer on narrow tracks', () => {
    expect(railBufferForViewport(200, 304, 4)).toBe(4);
  });
});
