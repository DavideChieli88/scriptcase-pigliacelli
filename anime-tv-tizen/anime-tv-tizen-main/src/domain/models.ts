/** Domain models — provider-agnostic. */

export type ProviderId = string;

export type AnimeStatus = 'ongoing' | 'completed' | 'unknown';

export interface AnimeSummary {
  id: string;
  providerId: ProviderId;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  year?: number;
  genres?: string[];
  status?: AnimeStatus;
}

export interface Episode {
  id: string;
  animeId: string;
  providerId: ProviderId;
  number: number;
  title?: string;
  thumbnailUrl?: string;
}

export interface AnimeDetails extends AnimeSummary {
  description?: string;
  episodeCount?: number;
  episodes: Episode[];
}

export interface StreamSource {
  url: string;
  type: 'mp4' | 'hls' | 'other';
  label?: string;
  headers?: Record<string, string>;
}

export interface WatchProgress {
  animeId: string;
  episodeId: string;
  providerId: ProviderId;
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

export interface HomeFeed {
  featured: AnimeSummary | null;
  recentlyAdded: AnimeSummary[];
  popular: AnimeSummary[];
}

export interface HistoryEntry {
  id: string;
  animeId: string;
  providerId: ProviderId;
  title: string;
  posterUrl?: string;
  episodeId?: string;
  episodeNumber?: number;
  updatedAt: number;
}

export interface WatchlistEntry {
  animeId: string;
  providerId: ProviderId;
  title: string;
  posterUrl?: string;
  year?: number;
  genres?: string[];
  addedAt: number;
}

export interface AppSettings {
  preferredProviderId: ProviderId;
  autoplayNext: boolean;
  /** Progress percent at which an episode is marked completed. */
  completionThreshold: number;
  /** Progress percent at which the next-episode banner appears. */
  nextEpisodePromptThreshold: number;
  historyEnabled: boolean;
  debugMode: boolean;
  progressSaveIntervalMs: number;
  /** When false, saturncdn playlist is fetched without the LAN proxy. */
  streamProxyEnabled: boolean;
  /**
   * LAN proxy base for saturncdn playlist (Referer injection).
   * Example: http://192.168.1.10:8787
   */
  streamProxyUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  preferredProviderId: 'animesaturn',
  autoplayNext: true,
  completionThreshold: 0.9,
  nextEpisodePromptThreshold: 0.9,
  historyEnabled: true,
  debugMode: false,
  progressSaveIntervalMs: 5000,
  streamProxyEnabled: true,
  streamProxyUrl: 'http://192.168.68.71:8787/__sc',
};
