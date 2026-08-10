export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings extends BaseRecord {
  preferredProviderId: string;
  /** Film section preferred provider (altadefinizione*). */
  preferredMoviesProviderId: string;
  autoplayNext: boolean;
  completionThreshold: number;
  debugMode: boolean;
  historyEnabled: boolean;
  proxyBaseUrl: string;
}

export interface HistoryRecord extends BaseRecord {
  providerId: string;
  animeId: string;
  title: string;
  coverUrl?: string;
  openedAt: number;
}

export interface ProgressRecord extends BaseRecord {
  animeId: string;
  episodeId: string;
  providerId: string;
  currentTime: number;
  duration: number;
  percent: number;
  completed: boolean;
  animeTitle?: string;
  episodeNumber?: number;
  coverUrl?: string;
}

export interface WatchlistRecord extends BaseRecord {
  providerId: string;
  animeId: string;
  title: string;
  coverUrl?: string;
  year?: number;
  genres?: string[];
}

export interface CacheRecord extends BaseRecord {
  key: string;
  kind: 'metadata' | 'html' | 'image-meta' | 'json';
  value: string;
  expiresAt: number;
  size: number;
}

export interface ProviderStateRecord extends BaseRecord {
  providerId: string;
  enabled: boolean;
  lastError?: string;
  lastSuccessAt?: number;
  meta?: Record<string, unknown>;
}

export interface LastSeenRecord extends BaseRecord {
  providerId: string;
  animeId: string;
  episodeId: string;
  title: string;
  episodeNumber?: number;
  coverUrl?: string;
}

export const DB_NAME = 'webos-anime-tv';
export const DB_VERSION = 1;

export const STORE = {
  settings: 'settings',
  history: 'history',
  progress: 'progress',
  watchlist: 'watchlist',
  cache: 'cache',
  providerState: 'providerState',
  lastSeen: 'lastSeen',
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];
