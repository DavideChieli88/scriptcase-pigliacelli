export interface AppConfig {
  appName: string;
  version: string;
  defaultProviderId: string;
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
  sampleVideoUrl: string;
}

export const defaultConfig: AppConfig = {
  appName: 'Anime TV',
  version: '0.1.0',
  defaultProviderId: 'mock',
  // webOS TV cannot reach the PC via 127.0.0.1 — use the PC LAN IP.
  proxyBaseUrl: import.meta.env.DEV ? '/proxy' : 'http://192.168.1.8:8787',
  httpTimeoutMs: 12000,
  httpMaxRetries: 2,
  httpMinIntervalMs: 350,
  progressHeartbeatMs: 5000,
  completionThreshold: 0.9,
  cacheTtlMs: 1000 * 60 * 60 * 6,
  cacheMaxEntries: 400,
  enableAnimeSaturn: true,
  enableAnimeUnity: true,
  sampleVideoUrl: '/samples/sample.mp4',
};

export function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return { ...defaultConfig, ...overrides };
}
