/** Shared helpers for provider / mirror failover. */

export function isMovieProviderId(id: string): boolean {
  return id === 'altadefinizione' || id.startsWith('altadefinizione-');
}

export function isAnimeProviderId(id: string): boolean {
  return !isMovieProviderId(id);
}

export function isFailoverError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /HTTP 403|HTTP 404|HTTP 429|HTTP 5\d\d|Timeout|aborted|AbortError|Failed to fetch|NetworkError|ECONN|ENOTFOUND|proxy lento/i.test(
    msg,
  );
}

export function isRateLimited(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /HTTP 429|rate.?limit/i.test(msg);
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/** Prefer preferredId first, then the rest of `candidates` in registry order. */
export function orderProviders<T extends { id: string }>(
  candidates: T[],
  preferredId: string,
): T[] {
  const preferred = candidates.find((p) => p.id === preferredId);
  const rest = candidates.filter((p) => p.id !== preferredId);
  return preferred ? [preferred, ...rest] : rest;
}
