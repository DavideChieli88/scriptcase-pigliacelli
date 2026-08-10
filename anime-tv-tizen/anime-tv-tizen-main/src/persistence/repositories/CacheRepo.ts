import { APP_CONFIG } from '@/app/config';
import { now } from '@/utils/time';
import { idbRequest, withStore } from '../db';
import { STORE, type CacheRecord } from '../schema';

export class CacheRepository {
  async get<T>(key: string): Promise<T | undefined> {
    const row = await withStore(STORE.cache, 'readonly', (store) =>
      idbRequest(store.get(key) as IDBRequest<CacheRecord | undefined>),
    );
    if (!row) return undefined;
    if (row.expiresAt > 0 && row.expiresAt < now()) {
      // Leave the row for getStale / offline fallback; eviction cleans later.
      return undefined;
    }
    // touch accessedAt
    void withStore(STORE.cache, 'readwrite', (store) => {
      store.put({ ...row, accessedAt: now() });
    });
    return row.value as T;
  }

  /** Returns cached value even if expired (does not delete). */
  async getStale<T>(key: string): Promise<T | undefined> {
    const row = await withStore(STORE.cache, 'readonly', (store) =>
      idbRequest(store.get(key) as IDBRequest<CacheRecord | undefined>),
    );
    if (!row) return undefined;
    return row.value as T;
  }

  async set(
    key: string,
    value: unknown,
    options?: { category?: CacheRecord['category']; ttlMs?: number },
  ): Promise<void> {
    const ttl = options?.ttlMs ?? APP_CONFIG.cacheTtlMs;
    const record: CacheRecord = {
      key,
      category: options?.category ?? 'metadata',
      value,
      expiresAt: ttl > 0 ? now() + ttl : 0,
      accessedAt: now(),
      createdAt: now(),
    };
    await withStore(STORE.cache, 'readwrite', (store) => {
      store.put(record);
    });
    void this.evictAsync();
  }

  async delete(key: string): Promise<void> {
    await withStore(STORE.cache, 'readwrite', (store) => {
      store.delete(key);
    });
  }

  async clear(): Promise<void> {
    await withStore(STORE.cache, 'readwrite', (store) => {
      store.clear();
    });
  }

  /** Separate transaction — avoids IDB auto-commit races with async work. */
  private async evictAsync(): Promise<void> {
    await withStore(STORE.cache, 'readwrite', async (store) => {
      const all = await idbRequest(store.getAll() as IDBRequest<CacheRecord[]>);
      const t = now();
      for (const row of all) {
        if (row.expiresAt > 0 && row.expiresAt < t) store.delete(row.key);
      }
      const remaining = all.filter((r) => !(r.expiresAt > 0 && r.expiresAt < t));
      if (remaining.length <= APP_CONFIG.cacheMaxEntries) return;
      remaining.sort((a, b) => a.accessedAt - b.accessedAt);
      const toRemove = remaining.length - APP_CONFIG.cacheMaxEntries;
      for (let i = 0; i < toRemove; i++) {
        store.delete(remaining[i].key);
      }
    });
  }
}

export const cacheRepo = new CacheRepository();
