/**
 * Promo Studio alpha — private per-browser asset storage.
 * IndexedDB is used for binary files to avoid localStorage quotas.
 * Production multi-user storage will be added before commercial launch.
 */
const DATABASE = 'promo-studio-artwork-v1';
const STORE = 'assets';
const HANDOFF = 'promo-studio-editor-handoff-v1';

function db() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(mode, callback) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    let result;
    try { result = callback(tx.objectStore(STORE)); } catch (error) { database.close(); reject(error); return; }
    tx.oncomplete = () => { database.close(); resolve(result?.result); };
    tx.onerror = () => { database.close(); reject(tx.error); };
    tx.onabort = () => { database.close(); reject(tx.error); };
  });
}

export async function savePromoAsset(file, kind, folder = 'My Artwork') {
  if (!file || !(file instanceof Blob)) throw new Error('No file selected.');
  if (file.size > 100 * 1024 * 1024) throw new Error('Files must be smaller than 100 MB in this beta.');
  const isImage = file.type.startsWith('image/');
  const isAudio = file.type.startsWith('audio/');
  if ((kind === 'image' && !isImage) || (kind === 'audio' && !isAudio)) throw new Error('Choose a supported image or audio file.');
  const item = {
    id: crypto.randomUUID(),
    name: file.name || 'Untitled asset',
    type: kind,
    mime: file.type,
    size: file.size,
    folder,
    uploadedAt: Date.now(),
    favorite: false,
    file,
  };
  await transact('readwrite', store => store.put(item));
  const { file: omit, ...meta } = item;
  return meta;
}

export async function listPromoAssets() {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE);
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.map(({ file, ...meta }) => meta).sort((a,b) => b.uploadedAt - a.uploadedAt));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => database.close();
    tx.onerror = () => database.close();
  });
}

export async function getPromoAsset(id) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE);
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => database.close();
    tx.onerror = () => database.close();
  });
}

export async function deletePromoAsset(id) {
  await transact('readwrite', store => store.delete(id));
}

export async function updatePromoAsset(id, patch) {
  const asset = await getPromoAsset(id);
  if (!asset) return;
  const allowed = {};
  for (const key of ['folder', 'favorite']) {
    if (key in patch) allowed[key] = patch[key];
  }
  await transact('readwrite', store => store.put({ ...asset, ...allowed }));
}

export function savePromoHandoff(data) {
  sessionStorage.setItem(HANDOFF, JSON.stringify({ ...data, createdAt: Date.now() }));
}

export function popPromoHandoff() {
  const raw = sessionStorage.getItem(HANDOFF);
  if (!raw) return null;
  sessionStorage.removeItem(HANDOFF);
  try {
    const value = JSON.parse(raw);
    return Date.now() - value.createdAt < 10 * 60 * 1000 ? value : null;
  } catch { return null; }
}
