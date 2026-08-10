/** Compute a sliding window of indices around the focused item. */
export function computeVirtualWindow(
  focusIndex: number,
  length: number,
  buffer = 4,
): { start: number; end: number } {
  if (length <= 0) return { start: 0, end: 0 };
  const i = Math.max(0, Math.min(length - 1, focusIndex));
  const start = Math.max(0, i - buffer);
  const end = Math.min(length, i + buffer + 1);
  return { start, end };
}

/** Pixel stride for one poster slot (width + gap). */
export function railItemStride(posterW: number, gap: number): number {
  return posterW + gap;
}

/**
 * Buffer large enough that focus at either viewport edge still keeps
 * every on-screen card mounted (plus one spare).
 */
export function railBufferForViewport(
  trackWidth: number,
  stride: number,
  minBuffer: number,
): number {
  if (stride <= 0) return minBuffer;
  const visible = Math.ceil(Math.max(0, trackWidth) / stride) + 1;
  return Math.max(minBuffer, visible);
}
