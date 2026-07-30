import type { AnimeSummary, ContinueWatchingItem, HomeSection } from '../models';
import type { ProviderRegistry } from '../../providers/registry';
import type { Persistence } from '../../persistence';
import { logger } from '../../core/logging/Logger';

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
  }> {
    const errors: string[] = [];
    const provider = this.registry.preferred(preferredProviderId);
    const sections: HomeSection[] = [];

    // Solo il provider preferito alimenta il catalogo Home.
    // Continue watching / cronologia restano locali e possono mixare provider.
    if (provider) {
      const result = await provider.getHome();
      if (result.ok && result.data) {
        sections.push(
          ...result.data.map((section) => ({
            ...section,
            title: `${section.title} · ${provider.name}`,
          })),
        );
      } else {
        errors.push(`${provider.name}: ${result.error?.message ?? 'errore'}`);
        logger.warn('Home provider failed', result.error);
      }
    } else {
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

    // Persist enriched covers back into history when we know a better poster.
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

    return { hero, sections, continueWatching, recent, errors };
  }
}
