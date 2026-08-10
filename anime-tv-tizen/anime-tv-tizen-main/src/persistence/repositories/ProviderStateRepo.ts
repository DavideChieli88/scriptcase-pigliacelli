import { now } from '@/utils/time';
import { idbRequest, withStore } from '../db';
import { STORE, type ProviderStateRecord } from '../schema';

export class ProviderStateRepository {
  async get(providerId: string): Promise<ProviderStateRecord | undefined> {
    return withStore(STORE.providerState, 'readonly', (store) =>
      idbRequest(store.get(providerId) as IDBRequest<ProviderStateRecord | undefined>),
    );
  }

  async markSuccess(providerId: string): Promise<void> {
    await withStore(STORE.providerState, 'readwrite', (store) => {
      store.put({
        providerId,
        lastSuccessAt: now(),
        lastError: undefined,
        disabledUntil: undefined,
        updatedAt: now(),
      } satisfies ProviderStateRecord);
    });
  }

  async markError(providerId: string, error: string, disableMs = 0): Promise<void> {
    await withStore(STORE.providerState, 'readwrite', (store) => {
      store.put({
        providerId,
        lastError: error,
        disabledUntil: disableMs > 0 ? now() + disableMs : undefined,
        updatedAt: now(),
      } satisfies ProviderStateRecord);
    });
  }

  async clear(): Promise<void> {
    await withStore(STORE.providerState, 'readwrite', (store) => {
      store.clear();
    });
  }
}

export const providerStateRepo = new ProviderStateRepository();
