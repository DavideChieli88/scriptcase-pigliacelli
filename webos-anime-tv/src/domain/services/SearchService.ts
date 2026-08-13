import type { AnimeSummary } from '../models';
import type { ProviderRegistry } from '../../providers/registry';
import { isAnimeProviderId, isFailoverError, isMovieProviderId, orderProviders, sleep } from '../../providers/failover';

function titleKey(item: AnimeSummary): string {
  return item.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export class SearchService {
  constructor(private registry: ProviderRegistry) {}

  async search(
    query: string,
    preferredProviderId: string,
    options: { kind?: 'anime' | 'movies' } = {},
  ): Promise<{
    items: AnimeSummary[];
    errors: string[];
    usedProviderId?: string;
  }> {
    const errors: string[] = [];
    const kind = options.kind ?? (isMovieProviderId(preferredProviderId) ? 'movies' : 'anime');
    const candidates = this.registry
      .list(true)
      .filter((p) => (kind === 'movies' ? isMovieProviderId(p.id) : isAnimeProviderId(p.id)));
    const ordered = orderProviders(candidates, preferredProviderId);

    if (!ordered.length) {
      return { items: [], errors: ['Nessun provider abilitato'] };
    }

    // Film: query all enabled mirrors and merge (fill gaps). Anime: first hit wins.
    if (kind === 'movies') {
      const seen = new Set<string>();
      const items: AnimeSummary[] = [];
      let usedProviderId: string | undefined;

      for (let i = 0; i < ordered.length; i++) {
        const provider = ordered[i]!;
        try {
          const result = await provider.search(query);
          if (result.ok && result.data?.length) {
            if (!usedProviderId) usedProviderId = provider.id;
            for (const item of result.data) {
              const key = titleKey(item) || item.id;
              if (seen.has(key)) continue;
              seen.add(key);
              items.push(item);
            }
          } else if (result.ok) {
            errors.push(`${provider.name}: nessun risultato`);
          } else if (result.error) {
            errors.push(`${provider.name}: ${result.error.message}`);
            if (result.error.code === 'RATE_LIMITED' && i < ordered.length - 1) {
              await sleep(2000);
            }
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          errors.push(`${provider.name}: ${message}`);
          if (isFailoverError(e) && i < ordered.length - 1) {
            if (/429/.test(message)) await sleep(2000);
          }
        }
      }

      return { items, errors, usedProviderId };
    }

    for (let i = 0; i < ordered.length; i++) {
      const provider = ordered[i]!;
      try {
        const result = await provider.search(query);
        if (result.ok && result.data && result.data.length > 0) {
          return { items: result.data, errors, usedProviderId: provider.id };
        }
        if (result.ok && result.data && result.data.length === 0) {
          errors.push(`${provider.name}: nessun risultato`);
          continue;
        }
        if (result.error) {
          errors.push(`${provider.name}: ${result.error.message}`);
          if (result.error.code === 'RATE_LIMITED' && i < ordered.length - 1) {
            await sleep(2000);
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${provider.name}: ${message}`);
        if (isFailoverError(e) && i < ordered.length - 1) {
          if (/429/.test(message)) await sleep(2000);
          continue;
        }
      }
    }

    return { items: [], errors };
  }
}
