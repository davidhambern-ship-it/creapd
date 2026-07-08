import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { BASE_FONTS } from '@/lib/editorFonts';

const registered = new Set();

function registerFontFace(name, url) {
  if (registered.has(name)) return;
  const face = new FontFace(name, `url(${url})`);
  face.load().then(() => {
    document.fonts.add(face);
    registered.add(name);
  }).catch(() => {});
}

export function useCustomFonts() {
  const [customFonts, setCustomFonts] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const fonts = await base44.entities.CustomFont.list();
      fonts.forEach(f => registerFontFace(f.font_name, f.file_url));
      setCustomFonts(fonts.map(f => f.font_name));
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFont = useCallback(async (file, name) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const ext = file.name.split('.').pop().toLowerCase();
      await base44.entities.CustomFont.create({
        font_name: name,
        file_url,
        file_format: ext,
      });
      registerFontFace(name, file_url);
      setCustomFonts(prev => [...prev, name]);
      return true;
    } catch {
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  const allFonts = [...BASE_FONTS, ...customFonts];

  return { allFonts, customFonts, uploadFont, uploading, reload: load };
}