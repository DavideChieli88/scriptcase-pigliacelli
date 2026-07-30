import type { AppConfig } from '../core/config/AppConfig';
import type { PlatformAdapter } from '../core/platform/types';
import type { Router } from '../core/navigation/Router';
import type { FocusManager } from '../core/focus/FocusManager';
import type { HttpClient } from '../core/net/HttpClient';
import type { Persistence } from '../persistence';
import type { ProviderRegistry } from '../providers/registry';
import type { HomeService } from '../domain/services/HomeService';
import type { SearchService } from '../domain/services/SearchService';
import type { LibraryService } from '../domain/services/LibraryService';
import type { PlayerService } from '../player/PlayerService';
import type { ProgressTracker } from '../player/ProgressTracker';
import type { NextEpisodePrompt } from '../player/NextEpisodePrompt';

export interface AppContext {
  config: AppConfig;
  platform: PlatformAdapter;
  router: Router;
  focus: FocusManager;
  http: HttpClient;
  persistence: Persistence;
  registry: ProviderRegistry;
  player: PlayerService;
  progressTracker: ProgressTracker;
  nextEpisode: NextEpisodePrompt;
  services: {
    home: HomeService;
    search: SearchService;
    library: LibraryService;
  };
  root: HTMLElement;
}
