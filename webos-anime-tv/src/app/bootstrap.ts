import { createConfig, type AppConfig } from '../core/config/AppConfig';
import { createPlatformAdapter } from '../core/platform';
import { Router } from '../core/navigation/Router';
import { FocusManager } from '../core/focus/FocusManager';
import { HttpClient } from '../core/net/HttpClient';
import { logger } from '../core/logging/Logger';
import { createPersistence } from '../persistence';
import { ProviderRegistry } from '../providers/registry';
import { MockProvider } from '../providers/mock/MockProvider';
import { AnimeSaturnProvider } from '../providers/animesaturn/AnimeSaturnProvider';
import { AnimeUnityProvider } from '../providers/animeunity/AnimeUnityProvider';
import { AltadefinizioneProvider } from '../providers/altadefinizione/AltadefinizioneProvider';
import { HomeService } from '../domain/services/HomeService';
import { SearchService } from '../domain/services/SearchService';
import { LibraryService } from '../domain/services/LibraryService';
import { ProgressTracker } from '../player/ProgressTracker';
import { PlayerService } from '../player/PlayerService';
import { NextEpisodePrompt } from '../player/NextEpisodePrompt';
import type { AppContext } from './context';
import { registerRoutes } from './routes';
import type { RemoteKey } from '../core/platform/types';

export async function bootstrap(root: HTMLElement, overrides: Partial<AppConfig> = {}): Promise<AppContext> {
  const config = createConfig(overrides);
  const platform = createPlatformAdapter();
  const caps = platform.detect();
  logger.info('Bootstrapping Anime TV', { platform: caps.platform, version: config.version });

  if (!caps.hasIndexedDB) {
    throw new Error('IndexedDB non disponibile su questa piattaforma');
  }

  const persistence = await createPersistence(config);
  const settings = await persistence.settings.getOrCreate(config);

  logger.setLevel(settings.debugMode ? 'debug' : 'info');

  const http = new HttpClient({
    timeoutMs: config.httpTimeoutMs,
    maxRetries: config.httpMaxRetries,
    minIntervalMs: config.httpMinIntervalMs,
    // Empty string in settings = direct only (no fallback).
    proxyBaseUrl: (settings.proxyBaseUrl ?? config.proxyBaseUrl).trim() || undefined,
    userAgent: 'WebOSAnimeTV/0.1 (personal)',
  });

  const providerCtx = {
    http,
    logger,
    cache: persistence.cache,
    providerState: persistence.providerState,
    cacheTtlMs: config.cacheTtlMs,
  };

  const registry = new ProviderRegistry();
  registry.register(new MockProvider(config, false));
  registry.register(new AnimeSaturnProvider(providerCtx, config.enableAnimeSaturn));
  registry.register(new AnimeUnityProvider(providerCtx, config.enableAnimeUnity));
  registry.register(
    new AltadefinizioneProvider(providerCtx, config.enableAltadefinizione, {
      id: 'altadefinizione',
      name: 'Altadefinizione',
      baseUrl: 'https://altadefinizionex.co',
      // Host failover inside the same provider (path-compatible mirrors).
      mirrors: ['https://altadefinizione.you'],
    }),
  );
  // Second film provider: used when the primary catalog/search fails or misses titles.
  registry.register(
    new AltadefinizioneProvider(providerCtx, config.enableAltadefinizione, {
      id: 'altadefinizione-you',
      name: 'Altadefinizione (mirror)',
      baseUrl: 'https://altadefinizione.you',
      mirrors: ['https://altadefinizionex.co'],
    }),
  );

  // Restore provider enabled flags from IDB when present
  for (const p of registry.list()) {
    const state = await persistence.providerState.get(p.id);
    if (state) p.enabled = state.enabled;
  }

  const progressTracker = new ProgressTracker(persistence.progress, persistence.lastSeen, {
    heartbeatMs: config.progressHeartbeatMs,
    completionThreshold: settings.completionThreshold,
  });
  const player = new PlayerService(progressTracker);
  const nextEpisode = new NextEpisodePrompt();

  const ctx: AppContext = {
    config,
    platform,
    router: new Router(),
    focus: new FocusManager(),
    http,
    persistence,
    registry,
    player,
    progressTracker,
    nextEpisode,
    services: {
      home: new HomeService(registry, persistence),
      search: new SearchService(registry),
      library: new LibraryService(persistence, registry),
    },
    root,
  };

  registerRoutes(ctx);
  wireInput(ctx);
  await persistence.cache.evictIfNeeded();

  return ctx;
}

function wireInput(ctx: AppContext): void {
  window.addEventListener('keydown', (event) => {
    const key: RemoteKey = ctx.platform.mapKey(event);
    const route = ctx.router.getCurrent()?.name;

    if (key === 'Back') {
      event.preventDefault();
      void (async () => {
        if (route === 'player') {
          const nextBox = document.querySelector('.next-episode:not([hidden])') as HTMLElement | null;
          const cancel = nextBox?.querySelector('[data-focus-id="next-cancel"]') as HTMLElement | null;
          if (cancel) {
            cancel.click();
            return;
          }
          await ctx.player.stop();
        }
        const wentBack = await ctx.router.back();
        if (!wentBack && route === 'home') {
          ctx.platform.exitApp();
        } else if (!wentBack) {
          await ctx.router.navigate('home', {}, true);
        }
      })();
      return;
    }

    if (key === 'ArrowUp') {
      event.preventDefault();
      ctx.focus.move('up');
      return;
    }
    if (key === 'ArrowDown') {
      event.preventDefault();
      ctx.focus.move('down');
      return;
    }
    if (key === 'ArrowLeft') {
      event.preventDefault();
      if (route === 'player') {
        const id = ctx.focus.getCurrentId() || '';
        if (id.startsWith('seek-') || id.startsWith('next-') || id.startsWith('ep-')) {
          ctx.focus.move('left');
          document.querySelector('.player-overlay')?.classList.add('is-visible');
          return;
        }
        ctx.player.seekBy(-10);
        document.querySelector('.player-overlay')?.classList.add('is-visible');
        return;
      }
      ctx.focus.move('left');
      return;
    }
    if (key === 'ArrowRight') {
      event.preventDefault();
      if (route === 'player') {
        const id = ctx.focus.getCurrentId() || '';
        if (id.startsWith('seek-') || id.startsWith('next-') || id.startsWith('ep-')) {
          ctx.focus.move('right');
          document.querySelector('.player-overlay')?.classList.add('is-visible');
          return;
        }
        ctx.player.seekBy(10);
        document.querySelector('.player-overlay')?.classList.add('is-visible');
        return;
      }
      ctx.focus.move('right');
      return;
    }

    if (key === 'Enter') {
      const el = ctx.focus.getCurrentElement();
      if (route === 'player') {
        event.preventDefault();
        const id = ctx.focus.getCurrentId() || '';
        if (id.startsWith('seek-') || id.startsWith('next-') || id.startsWith('ep-')) {
          el?.click();
          return;
        }
        ctx.player.togglePlayPause();
        document.querySelector('.player-overlay')?.classList.add('is-visible');
        return;
      }
      if (el && el !== document.activeElement) {
        event.preventDefault();
        el.click();
      }
      return;
    }

    if (key === 'Play') {
      event.preventDefault();
      ctx.player.resume();
      return;
    }
    if (key === 'Pause') {
      event.preventDefault();
      ctx.player.pause();
      return;
    }
    if (key === 'PlayPause') {
      event.preventDefault();
      ctx.player.togglePlayPause();
    }
  });
}
