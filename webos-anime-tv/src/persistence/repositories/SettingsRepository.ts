import { BaseRepository } from './BaseRepository';
import { STORE, type AppSettings } from '../types';
import type { AppConfig } from '../../core/config/AppConfig';

export const SETTINGS_ID = 'app';

export class SettingsRepository extends BaseRepository<AppSettings> {
  constructor(db: IDBDatabase) {
    super(db, STORE.settings);
  }

  async getOrCreate(config: AppConfig): Promise<AppSettings> {
    const existing = await this.get(SETTINGS_ID);
    if (existing) {
      // Replace localhost proxy (useless on TV) with the configured LAN default.
      if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(existing.proxyBaseUrl)) {
        return this.update({ proxyBaseUrl: config.proxyBaseUrl });
      }
      return existing;
    }
    const created = this.stamp({
      id: SETTINGS_ID,
      preferredProviderId: config.defaultProviderId,
      autoplayNext: true,
      completionThreshold: config.completionThreshold,
      debugMode: false,
      historyEnabled: true,
      proxyBaseUrl: config.proxyBaseUrl,
    });
    await this.put(created);
    return created;
  }

  async update(patch: Partial<Omit<AppSettings, 'id' | 'createdAt'>>): Promise<AppSettings> {
    const current = await this.get(SETTINGS_ID);
    if (!current) throw new Error('Settings missing');
    const next = this.stamp({ ...current, ...patch }, current);
    await this.put(next);
    return next;
  }
}
