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
      const patch: Partial<AppSettings> = {};
      // Replace localhost proxy (useless on TV) with the configured LAN default.
      if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(existing.proxyBaseUrl)) {
        patch.proxyBaseUrl = config.proxyBaseUrl;
      }
      // Refresh stale LAN default from older installs (.8 → current build default).
      if (
        /^https?:\/\/192\.168\.1\.8(:\d+)?\/?$/i.test(existing.proxyBaseUrl) &&
        existing.proxyBaseUrl !== config.proxyBaseUrl
      ) {
        patch.proxyBaseUrl = config.proxyBaseUrl;
      }
      if (existing.preferredMoviesProviderId === 'altadefinizione-alt') {
        patch.preferredMoviesProviderId = config.defaultMoviesProviderId;
      }
      // Drop unknown movie provider ids (e.g. removed mirrors).
      if (
        existing.preferredMoviesProviderId &&
        !existing.preferredMoviesProviderId.startsWith('altadefinizione')
      ) {
        patch.preferredMoviesProviderId = config.defaultMoviesProviderId;
      }
      if (!existing.preferredMoviesProviderId) {
        patch.preferredMoviesProviderId = config.defaultMoviesProviderId;
      }
      if (existing.preferredProviderId === 'mock' && config.defaultProviderId !== 'mock') {
        patch.preferredProviderId = config.defaultProviderId;
      }
      if (Object.keys(patch).length) return this.update(patch);
      return existing;
    }
    const created = this.stamp({
      id: SETTINGS_ID,
      preferredProviderId: config.defaultProviderId,
      preferredMoviesProviderId: config.defaultMoviesProviderId,
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
