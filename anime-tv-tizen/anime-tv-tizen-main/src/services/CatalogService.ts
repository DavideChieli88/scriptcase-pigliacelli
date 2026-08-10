import type {
  AnimeDetails,
  AnimeSummary,
  ContinueWatchingItem,
  Episode,
  HomeFeed,
  StreamSource,
  WatchProgress,
} from '@/domain/models';
import { ProviderError } from '@/domain/errors';
import { providerRegistry, type ProviderRef } from '@/providers/registry';
import type { ContentProvider, ProviderResult } from '@/providers/types';
import { cacheService } from './CacheService';
import { settingsService } from './SettingsService';
import { progressRepo } from '@/persistence/repositories/ProgressRepo';
import { historyRepo } from '@/persistence/repositories/HistoryRepo';
import { providerStateRepo } from '@/persistence/repositories/ProviderStateRepo';
import { AppEvents, eventBus } from '@/state/EventBus';
import { logger } from '@/utils/logger';
import { debugLog } from '@/utils/debugLog';
import { parseAnimeId } from '@/domain/ids';
import { APP_CONFIG } from '@/app/config';

export interface EnrichedHome {
  featured: AnimeSummary | null;
  continueWatching: ContinueWatchingItem[];
  lastSeen: AnimeSummary[];
  recentlyAdded: AnimeSummary[];
  popular: AnimeSummary[];
  providerId: string;
  fromCache?: boolean;
  error?: string;
  /** Other enabled providers the UI can switch to. */
  alternatives: ProviderRef[];
}

const SHORT_BACKOFF_MS = 30_000;

export class CatalogService {
  /**
   * Cache-first home with multi-provider fallback:
   * fresh per-provider cache → preferred → other enabled → stale cache → local rails only.
   */
  async getHome(providerId?: string): Promise<EnrichedHome> {
    const settings = settingsService.get();
    const preferred = providerId || settings.preferredProviderId;
    const chain = await providerRegistry.resolveChain(preferred);
    debugLog.push('provider', 'info', 'getHome chain', {
      preferred,
      chain: chain.map((p) => p.id),
    });

    let feedResult: ProviderResult<HomeFeed> | null = null;
    let fromCache = false;
    let usedProviderId = preferred;

    for (const provider of chain) {
      usedProviderId = provider.id;
      const cacheKey = `home:${provider.id}`;
      const attempt = await this.tryHomeProvider(provider, cacheKey);
      if (attempt.result.ok) {
        feedResult = attempt.result;
        fromCache = attempt.fromCache;
        // Only mark success on a live network response, not a cache hit.
        if (!fromCache && !attempt.result.cached) {
          await providerStateRepo.markSuccess(provider.id);
        }
        break;
      }
      await providerStateRepo.markError(
        provider.id,
        attempt.result.error.message,
        SHORT_BACKOFF_MS,
      );
      eventBus.emit(AppEvents.PROVIDER_ERROR, attempt.result.error);
      feedResult = attempt.result;
    }

    const continueWatching = await this.buildContinueWatching();
    const lastSeen = await this.buildLastSeen();
    const alternatives = providerRegistry.alternatives(usedProviderId);

    if (!feedResult || !feedResult.ok) {
      return {
        featured: continueWatching[0]?.anime ?? lastSeen[0] ?? null,
        continueWatching,
        lastSeen,
        recentlyAdded: [],
        popular: [],
        providerId: usedProviderId,
        fromCache,
        error: feedResult?.error.message || 'Nessuna sorgente disponibile',
        alternatives,
      };
    }

    return {
      featured: feedResult.data.featured,
      continueWatching,
      lastSeen,
      recentlyAdded: feedResult.data.recentlyAdded,
      popular: feedResult.data.popular,
      providerId: usedProviderId,
      fromCache,
      error: fromCache ? 'Mostrando dati in cache (sorgente non raggiungibile)' : undefined,
      alternatives,
    };
  }

  async search(query: string, providerId?: string): Promise<ProviderResult<AnimeSummary[]>> {
    const settings = settingsService.get();
    const preferred = providerId || settings.preferredProviderId;
    const chain = await providerRegistry.resolveChain(preferred);
    let last: ProviderResult<AnimeSummary[]> | null = null;

    for (const provider of chain) {
      debugLog.push('provider', 'debug', `search via ${provider.id}`, { query });
      try {
        const result = await provider.search(query);
        last = result;
        if (result.ok) {
          await providerStateRepo.markSuccess(provider.id);
          return result;
        }
      } catch (err) {
        last = {
          ok: false,
          providerId: provider.id,
          error:
            err instanceof ProviderError
              ? err
              : new ProviderError('network', 'Ricerca fallita', provider.id, err),
        };
      }
    }
    return (
      last || {
        ok: false,
        providerId: preferred,
        error: new ProviderError('empty', 'Nessun provider per la ricerca', preferred),
      }
    );
  }

  async getDetails(animeId: string, providerId?: string): Promise<ProviderResult<AnimeDetails>> {
    const settings = settingsService.get();
    const { providerId: fromId } = parseAnimeId(animeId);
    const preferred = providerId || fromId || settings.preferredProviderId;
    const provider = providerRegistry.resolve(preferred);
    const cacheKey = `details:${animeId}`;

    try {
      const result = await provider.getAnimeDetails(animeId);
      if (result.ok) {
        await cacheService.setMetadata(cacheKey, result.data);
        return result;
      }
      const cached = await cacheService.getMetadata<AnimeDetails>(cacheKey);
      if (cached) {
        return { ok: true, data: cached, providerId: provider.id, cached: true };
      }
      return result;
    } catch (err) {
      const cached = await cacheService.getMetadata<AnimeDetails>(cacheKey);
      if (cached) {
        return { ok: true, data: cached, providerId: provider.id, cached: true };
      }
      return {
        ok: false,
        providerId: provider.id,
        error:
          err instanceof ProviderError
            ? err
            : new ProviderError('network', 'Dettagli non disponibili', provider.id, err),
      };
    }
  }

  async getStreamSources(
    animeId: string,
    episodeId: string,
    providerId?: string,
  ): Promise<ProviderResult<StreamSource[]>> {
    const settings = settingsService.get();
    const { providerId: fromId } = parseAnimeId(animeId);
    const provider = providerRegistry.resolve(
      providerId || fromId || settings.preferredProviderId,
    );
    return provider.getStreamSources(animeId, episodeId);
  }

  /** Switch preferred provider to the next enabled one. */
  async switchToNextProvider(currentId?: string): Promise<string | undefined> {
    const current = currentId || settingsService.get().preferredProviderId;
    const next = providerRegistry.nextEnabled(current);
    if (!next) return undefined;
    await settingsService.update({ preferredProviderId: next.id });
    await cacheService.invalidate(`home:${current}`);
    logger.info('Catalog', `Switched provider ${current} → ${next.id}`);
    debugLog.push('provider', 'info', `switch ${current} → ${next.id}`);
    return next.id;
  }

  private async tryHomeProvider(
    provider: ContentProvider,
    cacheKey: string,
  ): Promise<{ result: ProviderResult<HomeFeed>; fromCache: boolean }> {
    const fresh = await cacheService.getMetadata<HomeFeed>(cacheKey);
    if (fresh) {
      logger.debug('Catalog', `${provider.id} home from cache`);
      return {
        result: { ok: true, data: fresh, providerId: provider.id, cached: true },
        // Intentional TTL hit — no offline banner.
        fromCache: false,
      };
    }

    try {
      const result = await provider.getHome();
      if (result.ok) {
        await cacheService.setMetadata(cacheKey, result.data, APP_CONFIG.homeCacheTtlMs);
        return { result, fromCache: false };
      }
      const stale = await cacheService.getStaleMetadata<HomeFeed>(cacheKey);
      if (stale) {
        logger.warn('Catalog', `${provider.id} failed — using stale cache`);
        return {
          result: { ok: true, data: stale, providerId: provider.id, cached: true },
          fromCache: true,
        };
      }
      return { result, fromCache: false };
    } catch (err) {
      const stale = await cacheService.getStaleMetadata<HomeFeed>(cacheKey);
      if (stale) {
        logger.warn('Catalog', `${provider.id} threw — using stale cache`, err);
        return {
          result: { ok: true, data: stale, providerId: provider.id, cached: true },
          fromCache: true,
        };
      }
      const error =
        err instanceof ProviderError
          ? err
          : new ProviderError('network', 'Home non disponibile', provider.id, err);
      return { result: { ok: false, error, providerId: provider.id }, fromCache: false };
    }
  }

  private async buildContinueWatching(): Promise<ContinueWatchingItem[]> {
    const recent = await progressRepo.listRecent(12);
    const items: ContinueWatchingItem[] = [];

    for (const progress of recent) {
      const details = await this.getDetails(progress.animeId, progress.providerId);
      if (details.ok) {
        const episode =
          details.data.episodes.find((e) => e.id === progress.episodeId) ||
          this.episodeFromProgress(progress, details.data);
        items.push({ anime: details.data, episode, progress });
        continue;
      }

      const history = await historyRepo.get(progress.animeId);
      const anime: AnimeSummary = {
        id: progress.animeId,
        providerId: progress.providerId,
        title: history?.title || progress.animeId,
        posterUrl: history?.posterUrl,
      };
      items.push({
        anime,
        episode: {
          id: progress.episodeId,
          animeId: progress.animeId,
          providerId: progress.providerId,
          number: history?.episodeNumber || 1,
          title: history?.episodeNumber
            ? `Episodio ${history.episodeNumber}`
            : 'Episodio',
        },
        progress,
      });
    }
    return items;
  }

  private async buildLastSeen(): Promise<AnimeSummary[]> {
    const settings = settingsService.get();
    if (!settings.historyEnabled) return [];
    const history = await historyRepo.list(20);
    return history
      .filter((h) => Boolean(h.title))
      .map((h) => ({
        id: h.animeId,
        providerId: h.providerId,
        title: h.title,
        posterUrl: h.posterUrl,
      }));
  }

  private episodeFromProgress(progress: WatchProgress, details: AnimeDetails): Episode {
    return (
      details.episodes.find((e) => e.id === progress.episodeId) ||
      details.episodes[0] || {
        id: progress.episodeId,
        animeId: progress.animeId,
        providerId: progress.providerId,
        number: 1,
        title: 'Episodio',
      }
    );
  }
}

export const catalogService = new CatalogService();
