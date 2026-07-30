import { BaseRepository } from './BaseRepository';
import { STORE, type ProviderStateRecord } from '../types';

export class ProviderStateRepository extends BaseRepository<ProviderStateRecord> {
  constructor(db: IDBDatabase) {
    super(db, STORE.providerState);
  }

  async setEnabled(providerId: string, enabled: boolean): Promise<void> {
    const existing = await this.get(providerId);
    await this.put(
      this.stamp(
        {
          id: providerId,
          providerId,
          enabled,
          lastError: existing?.lastError,
          lastSuccessAt: existing?.lastSuccessAt,
          meta: existing?.meta,
        },
        existing,
      ),
    );
  }

  async recordSuccess(providerId: string): Promise<void> {
    const existing = await this.get(providerId);
    await this.put(
      this.stamp(
        {
          id: providerId,
          providerId,
          enabled: existing?.enabled ?? true,
          lastError: undefined,
          lastSuccessAt: Date.now(),
          meta: existing?.meta,
        },
        existing,
      ),
    );
  }

  async recordError(providerId: string, message: string): Promise<void> {
    const existing = await this.get(providerId);
    await this.put(
      this.stamp(
        {
          id: providerId,
          providerId,
          enabled: existing?.enabled ?? true,
          lastError: message,
          lastSuccessAt: existing?.lastSuccessAt,
          meta: existing?.meta,
        },
        existing,
      ),
    );
  }
}
