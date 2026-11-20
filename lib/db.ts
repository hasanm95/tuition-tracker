/**
 * IndexedDB wrapper for two stores:
 *   api-cache      – cached API responses with a TTL
 *   mutation-queue – offline writes waiting to be flushed (Phase 4)
 */

const DB_NAME = 'tuition-tracker-db';
const DB_VERSION = 1;
const CACHE_STORE = 'api-cache';
const QUEUE_STORE = 'mutation-queue';

/** How long cached data is considered fresh enough to show without a spinner. */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// ── open ────────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE))
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(QUEUE_STORE))
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── api-cache ────────────────────────────────────────────────────────────────

interface CacheRow<T> {
  key: string;
  data: T;
  ts: number;
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const row = await new Promise<CacheRow<T> | undefined>((resolve) => {
      const req = db.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
    if (!row || Date.now() - row.ts > CACHE_TTL_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      tx.objectStore(CACHE_STORE).put({ key, data, ts: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      tx.objectStore(CACHE_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

// ── mutation-queue (used in Phase 4 – background sync) ───────────────────────

export interface QueuedMutation {
  id?: number;
  url: string;
  method: string;
  body: string;
  ts: number;
}

// Rejects on failure so the caller can surface it — a dropped offline write
// would otherwise be lost silently while the user is told it's queued.
export async function pushMutation(m: Omit<QueuedMutation, 'id' | 'ts'>): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add({ ...m, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('queue write failed'));
  });
}

export async function listMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Rejects on failure. replayQueue deletes a row only after its POST succeeded,
// so a silent failure here would let the same payment be sent again.
export async function deleteMutation(id: number): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('queue delete failed'));
  });
}
