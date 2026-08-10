import { DEFAULT_SETTINGS, type AppSettings } from '@/domain/models';
import { idbRequest, withStore } from '../db';
import { STORE, type SettingsRecord } from '../schema';

export class SettingsRepository {
  async getAll(): Promise<AppSettings> {
    const rows = await withStore(STORE.settings, 'readonly', (store) =>
      idbRequest(store.getAll() as IDBRequest<SettingsRecord[]>),
    );
    const merged: AppSettings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (Object.prototype.hasOwnProperty.call(merged, row.key)) {
        Object.assign(merged, { [row.key]: row.value });
      }
    }
    return merged;
  }

  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const row = await withStore(STORE.settings, 'readonly', (store) =>
      idbRequest(store.get(key) as IDBRequest<SettingsRecord | undefined>),
    );
    if (!row) return DEFAULT_SETTINGS[key];
    return row.value as AppSettings[K];
  }

  async hasKey(key: keyof AppSettings): Promise<boolean> {
    const row = await withStore(STORE.settings, 'readonly', (store) =>
      idbRequest(store.get(key) as IDBRequest<SettingsRecord | undefined>),
    );
    return Boolean(row);
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await withStore(STORE.settings, 'readwrite', (store) => {
      store.put({ key, value } satisfies SettingsRecord);
    });
  }

  async setMany(partial: Partial<AppSettings>): Promise<void> {
    await withStore(STORE.settings, 'readwrite', (store) => {
      for (const [key, value] of Object.entries(partial)) {
        store.put({ key, value } satisfies SettingsRecord);
      }
    });
  }

  async reset(): Promise<void> {
    await withStore(STORE.settings, 'readwrite', (store) => {
      store.clear();
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        store.put({ key, value } satisfies SettingsRecord);
      }
    });
  }
}

export const settingsRepo = new SettingsRepository();
