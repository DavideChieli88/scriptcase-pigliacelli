export const APP_CONFIG = {
  name: 'Anime TV',
  version: '0.1.0',
  designWidth: 1920,
  designHeight: 1080,
  dbName: 'anime-tv-db',
  dbVersion: 1,
  cacheMaxEntries: 200,
  cacheTtlMs: 1000 * 60 * 60 * 6,
  /** Freshness window for home feed before refetching the provider. */
  homeCacheTtlMs: 1000 * 60 * 60 * 2,
  imageFallback: './posters/fallback.svg',
  searchDebounceMs: 300,
  keyRepeatIgnoreMs: 40,
  /** Hold Enter/OK this long to fire longPress (context menus). */
  longPressMs: 700,
  focusScale: 1.08,
  completionThresholdDefault: 0.9,
  nextEpisodePromptThresholdDefault: 0.9,
  /** Minimum cards kept on each side of focus; actual buffer grows to cover the viewport. */
  railVirtualBuffer: 4,
  /** Max concurrent poster probes (TV memory). */
  imageMaxConcurrent: 4,
  /** Seconds shown on next-episode countdown when autoplay is on. */
  nextEpisodeCountdownSec: 5,
} as const;

export function envFlag(key: keyof ImportMetaEnv | string, fallback = false): boolean {
  const env = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;
  const value = env[key as keyof ImportMetaEnv];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

/** Preferred provider id from env, or animesaturn. */
export function getDefaultProviderId(): string {
  const env = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;
  const value = env.VITE_DEFAULT_PROVIDER?.trim();
  return value || 'animesaturn';
}

export function isExternalAdaptersEnabled(): boolean {
  return envFlag('VITE_ENABLE_EXTERNAL_ADAPTERS', false);
}

export function isDebugEnv(): boolean {
  return envFlag('VITE_DEBUG', false);
}
