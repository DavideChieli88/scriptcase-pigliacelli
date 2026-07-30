import type { AnimeSummary } from '../models';
import type { ProviderRegistry } from '../../providers/registry';

export class SearchService {
  constructor(private registry: ProviderRegistry) {}

  async search(query: string, preferredProviderId: string): Promise<{
    items: AnimeSummary[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const items: AnimeSummary[] = [];
    const provider = this.registry.preferred(preferredProviderId);

    if (!provider) {
      return { items, errors: ['Nessun provider abilitato'] };
    }

    const result = await provider.search(query);
    if (result.ok && result.data) items.push(...result.data);
    else if (result.error) errors.push(`${provider.name}: ${result.error.message}`);

    return { items, errors };
  }
}
