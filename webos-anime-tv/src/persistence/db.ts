import { DB_NAME, DB_VERSION, STORE } from './types';
import { logger } from '../core/logging/Logger';

function createStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(STORE.settings)) {
    db.createObjectStore(STORE.settings, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE.history)) {
    const s = db.createObjectStore(STORE.history, { keyPath: 'id' });
    s.createIndex('openedAt', 'openedAt');
  }
  if (!db.objectStoreNames.contains(STORE.progress)) {
    const s = db.createObjectStore(STORE.progress, { keyPath: 'id' });
    s.createIndex('updatedAt', 'updatedAt');
    s.createIndex('animeId', 'animeId');
  }
  if (!db.objectStoreNames.contains(STORE.watchlist)) {
    db.createObjectStore(STORE.watchlist, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE.cache)) {
    const s = db.createObjectStore(STORE.cache, { keyPath: 'id' });
    s.createIndex('expiresAt', 'expiresAt');
  }
  if (!db.objectStoreNames.contains(STORE.providerState)) {
    db.createObjectStore(STORE.providerState, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE.lastSeen)) {
    db.createObjectStore(STORE.lastSeen, { keyPath: 'id' });
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      logger.info('IndexedDB upgrade', { version: db.version });
      createStores(db);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function withStore<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result ? (result as IDBRequest<T>).result : undefined);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB tx failed'));
    if (result) {
      result.onsuccess = () => undefined;
      result.onerror = () => reject(result.error);
    }
  });
}

export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllStores(db: IDBDatabase): Promise<void> {
  const names = Object.values(STORE);
  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(name, 'readwrite');
          tx.objectStore(name).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
    ),
  );
}
