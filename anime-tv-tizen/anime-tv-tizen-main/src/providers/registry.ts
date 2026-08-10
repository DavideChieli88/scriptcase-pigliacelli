import type { ContentProvider } from './types';
import { logger } from '@/utils/logger';
import { ProviderError } from '@/domain/errors';
import { providerStateRepo } from '@/persistence/repositories/ProviderStateRepo';
import { now } from '@/utils/time';

export interface ProviderRef {
  id: string;
  label: string;
}

export class ProviderRegistry {
  private readonly providers = new Map<string, ContentProvider>();

  register(provider: ContentProvider): void {
    this.providers.set(provider.id, provider);
    logger.info('Providers', `Registered provider: ${provider.id}`);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  get(id: string): ContentProvider | undefined {
    return this.providers.get(id);
  }

  list(): ContentProvider[] {
    return Array.from(this.providers.values());
  }

  listEnabled(): ContentProvider[] {
    return this.list().filter((p) => p.enabled);
  }

  listRefs(enabledOnly = true): ProviderRef[] {
    return (enabledOnly ? this.listEnabled() : this.list()).map((p) => ({
      id: p.id,
      label: p.label,
    }));
  }

  resolve(preferredId?: string): ContentProvider {
    if (preferredId) {
      const preferred = this.providers.get(preferredId);
      if (preferred?.enabled) return preferred;
    }
    const enabled = this.listEnabled();
    if (enabled.length === 0) {
      throw new ProviderError('disabled', 'Nessun provider abilitato', preferredId || 'none');
    }
    return enabled[0];
  }

  /**
   * Ordered try-list: preferred first, then other enabled providers.
   * Skips providers still in temporary backoff (`disabledUntil`).
   */
  async resolveChain(preferredId?: string): Promise<ContentProvider[]> {
    const preferred = preferredId ? this.providers.get(preferredId) : undefined;
    const others = this.listEnabled().filter((p) => p.id !== preferred?.id);
    const ordered: ContentProvider[] = [];
    if (preferred?.enabled) ordered.push(preferred);
    ordered.push(...others);

    const available: ContentProvider[] = [];
    for (const p of ordered) {
      if (await this.isTemporarilyDisabled(p.id)) {
        logger.debug('Providers', `Skipping ${p.id} (backoff)`);
        continue;
      }
      available.push(p);
    }

    // If all in backoff, still return ordered so UI can retry
    return available.length ? available : ordered;
  }

  nextEnabled(currentId: string): ContentProvider | undefined {
    const enabled = this.listEnabled();
    if (enabled.length < 2) return undefined;
    const idx = enabled.findIndex((p) => p.id === currentId);
    if (idx < 0) return enabled[0];
    return enabled[(idx + 1) % enabled.length];
  }

  alternatives(excludeId?: string): ProviderRef[] {
    return this.listRefs(true).filter((p) => p.id !== excludeId);
  }

  private async isTemporarilyDisabled(providerId: string): Promise<boolean> {
    const state = await providerStateRepo.get(providerId);
    if (!state?.disabledUntil) return false;
    return state.disabledUntil > now();
  }
}

export const providerRegistry = new ProviderRegistry();
