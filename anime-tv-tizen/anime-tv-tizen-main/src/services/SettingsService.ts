import type { AppSettings } from '@/domain/models';
import { DEFAULT_SETTINGS } from '@/domain/models';
import { getDefaultProviderId } from '@/app/config';
import { providerRegistry } from '@/providers/registry';
import { settingsRepo } from '@/persistence/repositories/SettingsRepo';
import { AppEvents, eventBus } from '@/state/EventBus';
import { setLogLevel } from '@/utils/logger';
import { logger } from '@/utils/logger';
import { debugLog } from '@/utils/debugLog';

export class SettingsService {
  private settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    preferredProviderId: getDefaultProviderId(),
  };
  private loaded = false;

  async load(): Promise<AppSettings> {
    this.settings = await settingsRepo.getAll();
    // Env default wins over hardcoded DEFAULT when IDB has no preference yet
    if (!(await settingsRepo.hasKey('preferredProviderId'))) {
      this.settings.preferredProviderId = getDefaultProviderId();
    }
    this.loaded = true;
    this.applyDebug(this.settings.debugMode);
    logger.info('Settings', 'Loaded', this.settings);
    return this.settings;
  }

  get(): AppSettings {
    return this.settings;
  }

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...partial };
    await settingsRepo.setMany(partial);
    if (partial.debugMode !== undefined) {
      this.applyDebug(partial.debugMode);
    }
    eventBus.emit(AppEvents.SETTINGS_CHANGE, this.settings);
    return this.settings;
  }

  async reset(): Promise<AppSettings> {
    await settingsRepo.reset();
    this.settings = {
      ...DEFAULT_SETTINGS,
      preferredProviderId: getDefaultProviderId(),
    };
    await settingsRepo.set('preferredProviderId', this.settings.preferredProviderId);
    this.applyDebug(false);
    eventBus.emit(AppEvents.SETTINGS_CHANGE, this.settings);
    return this.settings;
  }

  /**
   * After providers are registered: ensure preferred is enabled.
   * One-time: upgrade legacy stored `mock` default to env default.
   */
  async ensurePreferredProvider(): Promise<AppSettings> {
    const preferred = this.settings.preferredProviderId;
    const current = providerRegistry.get(preferred);

    if (current?.enabled) {
      const envDefault = getDefaultProviderId();
      const envProvider = providerRegistry.get(envDefault);
      const migratedFlag = 'anime-tv:migrated-default-provider-v1';
      if (
        preferred === 'mock' &&
        envDefault !== 'mock' &&
        envProvider?.enabled &&
        typeof localStorage !== 'undefined' &&
        !localStorage.getItem(migratedFlag)
      ) {
        localStorage.setItem(migratedFlag, '1');
        logger.info('Settings', `Migrating preferred provider mock → ${envDefault}`);
        return this.update({ preferredProviderId: envDefault });
      }
      return this.settings;
    }

    const envDefault = getDefaultProviderId();
    const envProvider = providerRegistry.get(envDefault);
    const next =
      envProvider?.enabled ? envProvider : providerRegistry.listEnabled()[0];
    if (next && next.id !== preferred) {
      logger.info('Settings', `Preferred provider ${preferred} unavailable → ${next.id}`);
      return this.update({ preferredProviderId: next.id });
    }
    return this.settings;
  }

  private applyDebug(enabled: boolean): void {
    setLogLevel(enabled ? 'debug' : 'info');
    debugLog.setEnabled(enabled);
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const settingsService = new SettingsService();
