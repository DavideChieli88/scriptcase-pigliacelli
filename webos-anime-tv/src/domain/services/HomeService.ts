import type { AnimeSummary, ContinueWatchingItem, HomeSection } from '../models';
import type { ProviderRegistry } from '../../providers/registry';
import type { Persistence } from '../../persistence';
import { logger } from '../../core/logging/Logger';
import { isMovieProviderId, orderProviders, sleep } from '../../providers/failover';
export class HomeService {
  constructor(
    private registry: ProviderRegistry,
    private persistence: Persistence,
  ) {}

  async getHomeFeed(preferredProviderId: string): Promise<{
    hero?: AnimeSummary;
    sections: HomeSection[];
    continueWatching: ContinueWatchingItem[];
    recent: AnimeSummary[];
    errors: string[];
    usedProviderId?: string;
  }> {
    const errors: string[] = [];
    const sections: HomeSection[] = [];
    let usedProviderId: string | undefined;

    const kind = isMovieProviderId(preferredProviderId) ? 'movies' : 'anime';
    const candidates = this.registry
      .list(true)
      .filter((p) => (kind === 'movies' ? isMovieProviderId(p.id) : !isMovieProviderId(p.id)))
      // Mock is for telecomando tests — don't hide a real provider failure behind fake catalog.
      .filter((p) => p.id !== 'mock' || preferredProviderId === 'mock');
    const ordered = orderProviders(candidates, preferredProviderId);

    for (let i = 0; i < ordered.length; i++) {
      const provider = ordered[i]!;
      const result = await provider.getHome();
      if (result.ok && result.data && result.data.some((s) => s.items.length > 0)) {
        sections.push(
          ...result.data.map((section) => ({
            ...section,
            title: `${section.title} · ${provider.name}`,
          })),
        );
        usedProviderId = provider.id;
        break;
      }
      const message = result.error?.message ?? 'catalogo vuoto';
      errors.push(`${provider.name}: ${message}`);
      logger.warn('Home provider failed', result.error);
      if (result.error?.code === 'RATE_LIMITED' && i < ordered.length - 1) {
        await sleep(2000);
      }
    }

    if (!ordered.length) {
      errors.push('Nessun provider abilitato');
    }

    const continueRows = await this.persistence.progress.listContinue(12);
    const continueWatching: ContinueWatchingItem[] = continueRows.map((p) => ({
      anime: {
        id: p.animeId,
        providerId: p.providerId,
        title: p.animeTitle ?? p.animeId,
        coverUrl: p.coverUrl,
      },
      episode: {
        id: p.episodeId,
        animeId: p.animeId,
        providerId: p.providerId,
        number: p.episodeNumber ?? 0,
      },
      progress: {
        animeId: p.animeId,
        episodeId: p.episodeId,
        providerId: p.providerId,
        currentTime: p.currentTime,
        duration: p.duration,
        percent: p.percent,
        completed: p.completed,
        updatedAt: p.updatedAt,
      },
    }));

    const history = await this.persistence.history.listRecent(12);
    const coverByKey = new Map<string, string>();
    for (const section of sections) {
      for (const item of section.items) {
        if (item.coverUrl) coverByKey.set(`${item.providerId}:${item.id}`, item.coverUrl);
      }
    }
    for (const row of continueRows) {
      if (row.coverUrl) coverByKey.set(`${row.providerId}:${row.animeId}`, row.coverUrl);
    }

    for (const h of history) {
      const key = `${h.providerId}:${h.animeId}`;
      const better = coverByKey.get(key);
      if (better && better !== h.coverUrl) {
        await this.persistence.history.updateCover(h.providerId, h.animeId, better, h.title);
        h.coverUrl = better;
      }
    }

    const recent: AnimeSummary[] = history.map((h) => ({
      id: h.animeId,
      providerId: h.providerId,
      title: h.title,
      coverUrl: h.coverUrl || coverByKey.get(`${h.providerId}:${h.animeId}`),
      lastOpenedAt: h.openedAt,
    }));

    const hero = sections[0]?.items[0] ?? recent[0] ?? continueWatching[0]?.anime;

    return { hero, sections, continueWatching, recent, errors, usedProviderId };
  }
}
