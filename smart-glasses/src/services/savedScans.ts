/**
 * savedScans.ts
 * Stores face scan photos + analysis results in browser IndexedDB.
 * Works offline, persists across page refreshes.
 */

const DB_NAME = 'OptiVisionScans';
const STORE_NAME = 'scans';
const DB_VERSION = 1;

export interface SavedScan {
  id: string;           // UUID
  savedAt: string;      // ISO date string
  photoDataUrl: string; // base64 image
  faceShape: string;
  confidence: number;
  mbs: number;
  pupillaryDistance: number;
  faceWidth: number;
  faceHeight: number;
}

// ─── Open DB ────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Save a scan ────────────────────────────────────────────
export async function saveScan(scan: Omit<SavedScan, 'id' | 'savedAt'>): Promise<string> {
  const db = await openDB();
  const id = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: SavedScan = { ...scan, id, savedAt: new Date().toISOString() };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ─── Load all scans (newest first) ──────────────────────────
export async function getAllScans(): Promise<SavedScan[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      db.close();
      const sorted = (req.result as SavedScan[]).sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      resolve(sorted);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

// ─── Delete a scan ──────────────────────────────────────────
export async function deleteScan(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ─── Count scans ────────────────────────────────────────────
export async function getScanCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
