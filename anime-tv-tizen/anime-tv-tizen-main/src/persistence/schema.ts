export const STORE = {
  settings: 'settings',
  history: 'history',
  progress: 'progress',
  watchlist: 'watchlist',
  cache: 'cache',
  providerState: 'providerState',
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface CacheRecord {
  key: string;
  category: 'metadata' | 'image-meta' | 'other';
  value: unknown;
  expiresAt: number;
  accessedAt: number;
  createdAt: number;
}

export interface ProviderStateRecord {
  providerId: string;
  lastError?: string;
  lastSuccessAt?: number;
  disabledUntil?: number;
  updatedAt: number;
}

export const DB_STORES: StoreName[] = [
  STORE.settings,
  STORE.history,
  STORE.progress,
  STORE.watchlist,
  STORE.cache,
  STORE.providerState,
];
