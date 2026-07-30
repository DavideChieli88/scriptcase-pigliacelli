import { idbRequest } from '../db';
import type { BaseRecord } from '../types';

export class BaseRepository<T extends BaseRecord> {
  constructor(
    protected db: IDBDatabase,
    protected storeName: string,
  ) {}

  async get(id: string): Promise<T | undefined> {
    const tx = this.db.transaction(this.storeName, 'readonly');
    return idbRequest(tx.objectStore(this.storeName).get(id) as IDBRequest<T | undefined>);
  }

  async put(record: T): Promise<void> {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    await idbRequest(tx.objectStore(this.storeName).put(record));
  }

  async delete(id: string): Promise<void> {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    await idbRequest(tx.objectStore(this.storeName).delete(id));
  }

  async getAll(): Promise<T[]> {
    const tx = this.db.transaction(this.storeName, 'readonly');
    return idbRequest(tx.objectStore(this.storeName).getAll() as IDBRequest<T[]>);
  }

  async clear(): Promise<void> {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    await idbRequest(tx.objectStore(this.storeName).clear());
  }

  protected stamp(partial: Omit<T, 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'createdAt' | 'updatedAt'>>, existing?: T): T {
    const ts = Date.now();
    return {
      ...(partial as T),
      createdAt: existing?.createdAt ?? partial.createdAt ?? ts,
      updatedAt: ts,
    };
  }
}
