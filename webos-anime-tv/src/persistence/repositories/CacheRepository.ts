import { BaseRepository } from './BaseRepository';
import { STORE, type CacheRecord } from '../types';

export class CacheRepository extends BaseRepository<CacheRecord> {
  constructor(
    db: IDBDatabase,
    private maxEntries: number,
  ) {
    super(db, STORE.cache);
  }

  async getFresh(key: string): Promise<CacheRecord | undefined> {
    const row = await this.get(key);
    if (!row) return undefined;
    if (row.expiresAt < Date.now()) {
      await this.delete(key);
      return undefined;
    }
    return row;
  }

  async set(input: {
    key: string;
    kind: CacheRecord['kind'];
    value: string;
    ttlMs: number;
  }): Promise<void> {
    const existing = await this.get(input.key);
    const record = this.stamp(
      {
        id: input.key,
        key: input.key,
        kind: input.kind,
        value: input.value,
        expiresAt: Date.now() + input.ttlMs,
        size: input.value.length,
      },
      existing,
    );
    await this.put(record);
    await this.evictIfNeeded();
  }

  async evictIfNeeded(): Promise<void> {
    const all = await this.getAll();
    const now = Date.now();
    const expired = all.filter((r) => r.expiresAt < now);
    for (const row of expired) await this.delete(row.id);

    const remaining = (await this.getAll()).sort((a, b) => a.updatedAt - b.updatedAt);
    while (remaining.length > this.maxEntries) {
      const oldest = remaining.shift();
      if (oldest) await this.delete(oldest.id);
    }
  }
}
