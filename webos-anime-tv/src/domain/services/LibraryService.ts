import type { AnimeSummary } from '../models';
import type { Persistence } from '../../persistence';
import type { ProviderRegistry } from '../../providers/registry';

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[·|–-]\s*Ep\.?\s*\d+\s*$/i, '')
    .replace(/\s*[-–]\s*AnimeSaturn.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class LibraryService {
  constructor(
    private persistence: Persistence,
    private registry?: ProviderRegistry,
  ) {}

  async openAnime(anime: AnimeSummary): Promise<void> {
    const settings = await this.persistence.settings.get('app');
    if (settings?.historyEnabled === false) return;

    await this.persistence.history.upsertOpen({
      providerId: anime.providerId,
      animeId: anime.id,
      title: cleanTitle(anime.title),
      coverUrl: anime.coverUrl,
    });
  }

  /** Refresh covers from provider details without changing openedAt order. */
  async enrichHistoryCovers(limit = 24): Promise<void> {
    if (!this.registry) return;
    const rows = await this.persistence.history.listRecent(limit);

    await Promise.all(
      rows.slice(0, 16).map(async (row) => {
        const provider = this.registry?.get(row.providerId);
        if (!provider?.enabled) return;
        try {
          const details = await provider.getAnimeDetails(row.animeId);
          if (!details.ok || !details.data?.coverUrl) return;
          await this.persistence.history.updateCover(
            row.providerId,
            row.animeId,
            details.data.coverUrl,
            cleanTitle(details.data.title || row.title),
          );
        } catch {
          // ignore single failures
        }
      }),
    );
  }

  async toggleFavorite(anime: AnimeSummary): Promise<boolean> {
    return this.persistence.watchlist.toggle(anime);
  }

  async isFavorite(providerId: string, animeId: string): Promise<boolean> {
    return this.persistence.watchlist.has(providerId, animeId);
  }
}
