import { useState, useEffect, useCallback } from 'react';
import { BASE_FONTS } from '@/lib/editorFonts';

const DB_NAME = 'creapd-presentation-editor';
const DB_VERSION = 1;
const STORE_NAME = 'custom-fonts';
const registered = new Set();

function openFontDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local font database'));
  });
}

async function readLocalFonts() {
  const db = await openFontDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Unable to read local fonts'));
    });
  } finally {
    db.close();
  }
}

async function writeLocalFont(record) {
  const db = await openFontDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Unable to save local font'));
      tx.onabort = () => reject(tx.error || new Error('Local font save aborted'));
    });
  } finally {
    db.close();
  }
}

async function registerFontFace(name, buffer) {
  if (!name || registered.has(name) || typeof FontFace === 'undefined') return;
  const face = new FontFace(name, buffer);
  const loaded = await face.load();
  document.fonts.add(loaded);
  registered.add(name);
}

export function useCustomFonts() {
  const [customFonts, setCustomFonts] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const fonts = await readLocalFonts();
      for (const font of fonts) {
        try { await registerFontFace(font.name, font.data); } catch {}
      }
      setCustomFonts(fonts.map(font => font.name).filter(Boolean));
    } catch {
      setCustomFonts([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFont = useCallback(async (file, name) => {
    if (!file) return false;
    const safeName = String(name || file.name.replace(/\.[^.]+$/, '') || 'Custom Font').trim();
    if (!safeName) return false;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      await registerFontFace(safeName, data.slice(0));
      await writeLocalFont({
        name: safeName,
        fileName: file.name,
        mimeType: file.type || 'font/unknown',
        data,
        savedAt: new Date().toISOString(),
      });
      setCustomFonts(prev => Array.from(new Set([...prev, safeName])));
      return true;
    } catch {
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  const allFonts = Array.from(new Set([...BASE_FONTS, ...customFonts]));

  return { allFonts, customFonts, uploadFont, uploading, reload: load };
}
