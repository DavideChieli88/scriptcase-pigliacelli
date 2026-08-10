import { APP_CONFIG } from '@/app/config';
import { STORE } from './schema';
import { logger } from '@/utils/logger';

type Migration = (db: IDBDatabase, tx: IDBTransaction) => void;

const MIGRATIONS: Record<number, Migration> = {
  1: (db) => {
    if (!db.objectStoreNames.contains(STORE.settings)) {
      db.createObjectStore(STORE.settings, { keyPath: 'key' });
    }
    if (!db.objectStoreNames.contains(STORE.history)) {
      const history = db.createObjectStore(STORE.history, { keyPath: 'id' });
      history.createIndex('updatedAt', 'updatedAt', { unique: false });
      history.createIndex('animeId', 'animeId', { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE.progress)) {
      const progress = db.createObjectStore(STORE.progress, { keyPath: 'episodeId' });
      progress.createIndex('animeId', 'animeId', { unique: false });
      progress.createIndex('updatedAt', 'updatedAt', { unique: false });
      progress.createIndex('completed', 'completed', { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE.watchlist)) {
      const watchlist = db.createObjectStore(STORE.watchlist, { keyPath: 'animeId' });
      watchlist.createIndex('addedAt', 'addedAt', { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE.cache)) {
      const cache = db.createObjectStore(STORE.cache, { keyPath: 'key' });
      cache.createIndex('expiresAt', 'expiresAt', { unique: false });
      cache.createIndex('category', 'category', { unique: false });
      cache.createIndex('accessedAt', 'accessedAt', { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE.providerState)) {
      db.createObjectStore(STORE.providerState, { keyPath: 'providerId' });
    }
  },
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_CONFIG.dbName, APP_CONFIG.dbVersion);

    request.onerror = () => {
      logger.error('IDB', 'Failed to open database', request.error);
      dbPromise = null;
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction!;
      const oldVersion = event.oldVersion;
      for (let v = oldVersion + 1; v <= APP_CONFIG.dbVersion; v++) {
        const migration = MIGRATIONS[v];
        if (migration) {
          logger.info('IDB', `Applying migration v${v}`);
          migration(db, tx);
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
  });

  return dbPromise;
}

export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result: T;
    let settled = false;

    Promise.resolve(fn(store))
      .then((value) => {
        result = value;
      })
      .catch((err) => {
        settled = true;
        reject(err);
      });

    tx.oncomplete = () => {
      if (!settled) resolve(result);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllStores(): Promise<void> {
  const db = await openDatabase();
  const names = Array.from(db.objectStoreNames);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    for (const name of names) {
      tx.objectStore(name).clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Reset module-level promise — used in tests. */
export function resetDbHandle(): void {
  dbPromise = null;
}
