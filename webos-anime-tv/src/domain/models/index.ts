export interface AnimeSummary {
  id: string;
  providerId: string;
  title: string;
  slug?: string;
  coverUrl?: string;
  backdropUrl?: string;
  year?: number;
  genres?: string[];
  status?: 'ongoing' | 'completed' | 'unknown';
  rating?: number;
  description?: string;
  isFavorite?: boolean;
  lastOpenedAt?: number;
}

export interface Episode {
  id: string;
  animeId: string;
  providerId: string;
  number: number;
  title?: string;
  duration?: number;
  streamAvailable?: boolean;
  watched?: boolean;
  updatedAt?: number;
}

export interface AnimeDetails extends AnimeSummary {
  episodes: Episode[];
  cast?: string[];
  studio?: string;
  originalTitle?: string;
}

export interface WatchProgress {
  animeId: string;
  episodeId: string;
  providerId: string;
  currentTime: number;
  duration: number;
  percent: number;
  completed: boolean;
  updatedAt: number;
}

export interface ContinueWatchingItem {
  anime: AnimeSummary;
  episode: Episode;
  progress: WatchProgress;
}

export interface StreamSource {
  url: string;
  type: 'mp4' | 'hls' | 'other';
  quality?: string;
  headers?: Record<string, string>;
  label?: string;
}

export interface HomeSection {
  id: string;
  title: string;
  items: AnimeSummary[];
}

export type ProviderErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'RATE_LIMITED'
  | 'UNSUPPORTED'
  | 'UNAVAILABLE';

export interface ProviderError {
  code: ProviderErrorCode;
  message: string;
  providerId: string;
  retryable: boolean;
}

export interface ProviderResult<T = unknown> {
  providerId: string;
  ok: boolean;
  data?: T;
  error?: ProviderError;
}
