import type { AppState, Entry, Food, Photo, Profile } from './types';

const DB_NAME = 'calnow';
const DB_VERSION = 1;

export const STORES = {
  profiles: 'profiles',
  entries: 'entries',
  photos: 'photos',
  foods: 'foods',
  app: 'app',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.profiles)) {
        db.createObjectStore(STORES.profiles, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.entries)) {
        const s = db.createObjectStore(STORES.entries, { keyPath: 'id' });
        s.createIndex('profile_ts', ['profileId', 'ts']);
        s.createIndex('profileId', 'profileId');
      }
      if (!db.objectStoreNames.contains(STORES.photos)) {
        db.createObjectStore(STORES.photos, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.foods)) {
        const s = db.createObjectStore(STORES.foods, { keyPath: 'id' });
        s.createIndex('profileId', 'profileId');
      }
      if (!db.objectStoreNames.contains(STORES.app)) {
        db.createObjectStore(STORES.app);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked by another tab'));
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

const getAll = <T>(store: string) => run<T[]>(store, 'readonly', (s) => s.getAll());
const put = <T>(store: string, value: T, key?: IDBValidKey) =>
  run<IDBValidKey>(store, 'readwrite', (s) => s.put(value, key));
const del = (store: string, key: IDBValidKey) => run<undefined>(store, 'readwrite', (s) => s.delete(key));

export const db = {
  /* profiles */
  allProfiles: () => getAll<Profile>(STORES.profiles),
  putProfile: (p: Profile) => put(STORES.profiles, p),
  deleteProfile: (id: string) => del(STORES.profiles, id),

  /* entries */
  allEntries: () => getAll<Entry>(STORES.entries),
  entriesFor: (profileId: string) =>
    open().then(
      (d) =>
        new Promise<Entry[]>((resolve, reject) => {
          const tx = d.transaction(STORES.entries, 'readonly');
          const req = tx.objectStore(STORES.entries).index('profileId').getAll(profileId);
          req.onsuccess = () => resolve((req.result as Entry[]).sort((a, b) => b.ts - a.ts));
          req.onerror = () => reject(req.error);
        }),
    ),
  putEntry: (e: Entry) => put(STORES.entries, e),
  deleteEntry: (id: string) => del(STORES.entries, id),

  /* photos */
  getPhoto: (id: string) => run<Photo | undefined>(STORES.photos, 'readonly', (s) => s.get(id)),
  putPhoto: (p: Photo) => put(STORES.photos, p),
  deletePhoto: (id: string) => del(STORES.photos, id),
  allPhotos: () => getAll<Photo>(STORES.photos),

  /* personal food library */
  foodsFor: (profileId: string) =>
    open().then(
      (d) =>
        new Promise<Food[]>((resolve, reject) => {
          const tx = d.transaction(STORES.foods, 'readonly');
          const req = tx.objectStore(STORES.foods).index('profileId').getAll(profileId);
          req.onsuccess = () => resolve(req.result as Food[]);
          req.onerror = () => reject(req.error);
        }),
    ),
  allFoods: () => getAll<Food>(STORES.foods),
  putFood: (f: Food) => put(STORES.foods, f),
  deleteFood: (id: string) => del(STORES.foods, id),

  /* app state */
  getApp: () => run<AppState | undefined>(STORES.app, 'readonly', (s) => s.get('state')),
  setApp: (v: AppState) => put(STORES.app, v, 'state'),

  /** Wipe everything — used by Settings → erase, and before a backup restore. */
  clearAll: () =>
    open().then(
      (d) =>
        new Promise<void>((resolve, reject) => {
          const names = Object.values(STORES);
          const tx = d.transaction(names, 'readwrite');
          names.forEach((n) => tx.objectStore(n).clear());
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
    ),
};

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Rough on-device storage usage, shown in Settings. */
export async function storageEstimate(): Promise<{ usedMb: number; quotaMb: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usedMb: usage / 1048576, quotaMb: quota / 1048576 };
}
