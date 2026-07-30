import { BaseRepository } from './BaseRepository';
import { STORE, type LastSeenRecord } from '../types';

export const LAST_SEEN_ID = 'global';

export class LastSeenRepository extends BaseRepository<LastSeenRecord> {
  constructor(db: IDBDatabase) {
    super(db, STORE.lastSeen);
  }

  async set(input: Omit<LastSeenRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const existing = await this.get(LAST_SEEN_ID);
    await this.put(
      this.stamp(
        {
          id: LAST_SEEN_ID,
          ...input,
        },
        existing,
      ),
    );
  }

  async getGlobal(): Promise<LastSeenRecord | undefined> {
    return this.get(LAST_SEEN_ID);
  }
}
