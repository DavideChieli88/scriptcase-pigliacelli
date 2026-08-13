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
  // Optional LAN CORS proxy (fallback). HttpClient tries direct first on webOS.
  // `npm run deploy` can inject VITE_PROXY_BASE_URL; leave empty in Settings to force direct-only.
  proxyBaseUrl: import.meta.env.DEV
    ? '/proxy'
    : import.meta.env.VITE_PROXY_BASE_URL || 'http://192.168.1.14:8787',
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
