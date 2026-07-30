import type { ContentProvider } from './types';
import { logger } from '../core/logging/Logger';

export class ProviderRegistry {
  private providers = new Map<string, ContentProvider>();

  register(provider: ContentProvider): void {
    this.providers.set(provider.id, provider);
    logger.info('Provider registered', { id: provider.id, enabled: provider.enabled });
  }

  get(id: string): ContentProvider | undefined {
    return this.providers.get(id);
  }

  list(enabledOnly = false): ContentProvider[] {
    const all = [...this.providers.values()];
    return enabledOnly ? all.filter((p) => p.enabled) : all;
  }

  setEnabled(id: string, enabled: boolean): void {
    const p = this.providers.get(id);
    if (p) p.enabled = enabled;
  }

  preferred(preferredId: string): ContentProvider | undefined {
    const preferred = this.providers.get(preferredId);
    if (preferred?.enabled) return preferred;
    return this.list(true)[0];
  }
}
