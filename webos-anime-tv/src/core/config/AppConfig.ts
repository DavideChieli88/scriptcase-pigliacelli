export interface AppConfig {
  appName: string;
  version: string;
  defaultProviderId: string;
  defaultMoviesProviderId: string;
  proxyBaseUrl: string;
  httpTimeoutMs: number;
  httpMaxRetries: number;
  httpMinIntervalMs: number;
  progressHeartbeatMs: number;
  completionThreshold: number;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  enableAnimeSaturn: boolean;
  enableAnimeUnity: boolean;
  enableAltadefinizione: boolean;
  sampleVideoUrl: string;
}

export const defaultConfig: AppConfig = {
  appName: 'Anime TV',
  version: '0.1.0',
  defaultProviderId: 'mock',
  defaultMoviesProviderId: 'altadefinizione',
  // webOS TV cannot reach the PC via 127.0.0.1 — use the PC LAN IP.
  // `npm run deploy` injects VITE_PROXY_BASE_URL from the current Wi‑Fi IP.
  proxyBaseUrl: import.meta.env.DEV
    ? '/proxy'
    : import.meta.env.VITE_PROXY_BASE_URL || 'http://192.168.1.14:8787',
  // TV → PC proxy → upstream: allow more time; fail fast on abort (no triple retry).
  httpTimeoutMs: 22000,
  httpMaxRetries: 1,
  httpMinIntervalMs: 80,
  progressHeartbeatMs: 5000,
  completionThreshold: 0.9,
  cacheTtlMs: 1000 * 60 * 60 * 6,
  cacheMaxEntries: 400,
  enableAnimeSaturn: true,
  enableAnimeUnity: true,
  enableAltadefinizione: true,
  sampleVideoUrl: '/samples/sample.mp4',
};

export function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return { ...defaultConfig, ...overrides };
}
