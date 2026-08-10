import type { HistoryEntry } from '@/domain/models';
import { idbRequest, withStore } from '../db';
import { STORE } from '../schema';

export class HistoryRepository {
  async upsert(entry: HistoryEntry): Promise<void> {
    await withStore(STORE.history, 'readwrite', (store) => {
      store.put(entry);
    });
  }

  async get(id: string): Promise<HistoryEntry | undefined> {
    return withStore(STORE.history, 'readonly', (store) =>
      idbRequest(store.get(id) as IDBRequest<HistoryEntry | undefined>),
    );
  }

  async list(limit = 40): Promise<HistoryEntry[]> {
    const all = await withStore(STORE.history, 'readonly', (store) =>
      idbRequest(store.getAll() as IDBRequest<HistoryEntry[]>),
    );
    return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
  }

  async remove(id: string): Promise<void> {
    await withStore(STORE.history, 'readwrite', (store) => {
      store.delete(id);
    });
  }

  async clear(): Promise<void> {
    await withStore(STORE.history, 'readwrite', (store) => {
      store.clear();
    });
  }
}

export const historyRepo = new HistoryRepository();
