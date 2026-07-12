import { useState, useMemo, useCallback } from 'react';

const FAV_KEY = 'cpe-media-favorites';
const COLL_KEY = 'cpe-media-collections';

export const ASSET_CATEGORIES = [
  { key: 'all', label: 'All Assets', icon: 'Package' },
  { key: 'image', label: 'Images', icon: 'Image' },
  { key: 'svg', label: 'SVG Graphics', icon: 'PenTool' },
  { key: 'icon', label: 'Icons', icon: 'Shapes' },
  { key: 'video', label: 'Videos', icon: 'Video' },
  { key: 'audio', label: 'Audio', icon: 'Music' },
  { key: 'voiceover', label: 'Voiceovers', icon: 'Mic' },
  { key: 'music', label: 'Music', icon: 'Disc' },
  { key: 'gif', label: 'GIFs', icon: 'Film' },
  { key: 'chart', label: 'Charts', icon: 'BarChart3' },
  { key: 'document', label: 'Documents', icon: 'FileText' },
  { key: 'logo', label: 'Logos', icon: 'Flag' },
  { key: 'brand_kit', label: 'Brand Kits', icon: 'Palette' },
  { key: 'generated', label: 'Generated', icon: 'Sparkles' },
  { key: 'template', label: 'Templates', icon: 'Layout' },
];

export const FILTER_CHIPS = [
  { key: 'images', label: 'Images', type: 'image' },
  { key: 'videos', label: 'Videos', type: 'video' },
  { key: 'audio', label: 'Audio', type: 'audio' },
  { key: 'svg', label: 'SVG', type: 'svg' },
  { key: 'generated', label: 'AI Generated', isAI: true },
  { key: 'downloaded', label: 'Downloaded', isAI: false },
  { key: 'unused', label: 'Unused', isUnused: true },
  { key: 'favorites', label: 'Favorites', isFav: true },
  { key: 'portrait', label: 'Portrait', ratio: 'portrait' },
  { key: 'landscape', label: 'Landscape', ratio: 'landscape' },
  { key: 'square', label: 'Square', ratio: 'square' },
];

const MEDIA_FIELDS = ['media_elements', 'video_elements', 'audio_elements', 'icon_elements', 'shape_elements'];

function mapType(t) {
  const map = { image: 'image', svg: 'svg', icon: 'icon', shape: 'icon', video: 'video', audio: 'audio', chart: 'chart', gif: 'gif', voiceover: 'voiceover', music: 'music', document: 'document', logo: 'logo', brand_kit: 'brand_kit', template: 'template' };
  return map[t] || 'image';
}

function getAspectRatio(w, h) {
  if (!w || !h) return null;
  const r = Number(w) / Number(h);
  if (r > 1.2) return 'landscape';
  if (r < 0.83) return 'portrait';
  return 'square';
}

function normalizeAsset(el, slide, url) {
  const type = mapType(el.type || el.element_type || 'image');
  const isAI = !!(el.is_ai_generated || el.generation_prompt || el.ai_worker_origin);
  return {
    id: el.id || `asset-${(slide?.id || 'cur')}-${url}`.substring(0, 120),
    name: el.name || el.label || (url ? url.split('/').pop()?.substring(0, 40) : type),
    type,
    url,
    thumbnail: (type === 'image' || type === 'gif' || type === 'svg') ? url : null,
    source: el.source || (isAI ? 'generated' : 'local'),
    isAIGenerated: isAI,
    connectorOrigin: el.connector_origin || null,
    size: el.file_size || null,
    resolution: el.resolution || (el.width && el.height ? `${el.width}×${el.height}` : null),
    duration: el.duration || null,
    tags: el.tags || [],
    collections: el.collections || [],
    isFavorite: false,
    usageCount: slide ? 1 : 0,
    usedInSlides: slide ? [slide.id] : [],
    lastUsed: null,
    altText: el.alt_text || '',
    license: el.license || null,
    slideId: slide?.id || null,
    slideTitle: slide?.title || null,
    metadata: {
      width: el.width || null,
      height: el.height || null,
      aspectRatio: getAspectRatio(el.width, el.height),
      creator: el.creator || null,
      colorSpace: el.color_space || null,
      frameRate: el.frame_rate || null,
      creationDate: el.creation_date || slide?.created_date || null,
    },
    generationPrompt: el.generation_prompt || null,
    aiWorkerOrigin: el.ai_worker_origin || null,
    created_date: slide?.created_date || null,
  };
}

function parseSlideAssets(slides) {
  const assets = [];
  const urlMap = new Map();

  (slides || []).forEach(slide => {
    MEDIA_FIELDS.forEach(field => {
      let els = [];
      try { els = JSON.parse(slide[field] || '[]'); } catch { return; }
      if (!Array.isArray(els)) return;
      els.forEach(el => {
        const url = el.content || el.src || el.url;
        if (!url || typeof url !== 'string' || url.length < 8) return;
        if (urlMap.has(url)) {
          const existing = urlMap.get(url);
          existing.usageCount++;
          if (!existing.usedInSlides.includes(slide.id)) existing.usedInSlides.push(slide.id);
        } else {
          const asset = normalizeAsset(el, slide, url);
          urlMap.set(url, asset);
          assets.push(asset);
        }
      });
    });
  });
  return assets;
}

export function useMediaLibrary(slides, currentElements, presentation) {
  const slideAssets = useMemo(() => parseSlideAssets(slides), [slides]);

  const allAssets = useMemo(() => {
    const merged = [...slideAssets];
    const seen = new Set(slideAssets.map(a => a.url));
    (currentElements || []).forEach(el => {
      const url = el.content || el.src;
      if (url && typeof url === 'string' && url.length > 7 && !seen.has(url)) {
        seen.add(url);
        merged.push(normalizeAsset(el, null, url));
      }
    });
    return merged;
  }, [slideAssets, currentElements]);

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
  });
  const [collections, setCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COLL_KEY) || '[]'); } catch { return []; }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortOrder, setSortOrder] = useState('recent');
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const assetsWithFavs = useMemo(() =>
    allAssets.map(a => ({ ...a, isFavorite: favorites.includes(a.id) })),
  [allAssets, favorites]);

  const categoryCounts = useMemo(() => {
    const c = { all: allAssets.length, generated: 0, favorites: favorites.length };
    allAssets.forEach(a => {
      if (a.type) c[a.type] = (c[a.type] || 0) + 1;
      if (a.isAIGenerated) c.generated++;
    });
    return c;
  }, [allAssets, favorites]);

  const filteredAssets = useMemo(() => {
    let result = assetsWithFavs;

    if (activeCategory !== 'all') {
      if (activeCategory === 'generated') result = result.filter(a => a.isAIGenerated);
      else if (activeCategory === 'favorites') result = result.filter(a => a.isFavorite);
      else result = result.filter(a => a.type === activeCategory);
    }

    activeFilters.forEach(fk => {
      const f = FILTER_CHIPS.find(fc => fc.key === fk);
      if (!f) return;
      if (f.type) result = result.filter(a => a.type === f.type);
      if (f.isAI === true) result = result.filter(a => a.isAIGenerated);
      if (f.isAI === false) result = result.filter(a => !a.isAIGenerated);
      if (f.isUnused) result = result.filter(a => a.usageCount === 0);
      if (f.isFav) result = result.filter(a => a.isFavorite);
      if (f.ratio) result = result.filter(a => a.metadata?.aspectRatio === f.ratio);
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)) ||
        a.type.toLowerCase().includes(q) ||
        (a.altText && a.altText.toLowerCase().includes(q))
      );
    }

    if (sortOrder === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'usage') result = [...result].sort((a, b) => b.usageCount - a.usageCount);

    return result;
  }, [assetsWithFavs, activeCategory, activeFilters, searchQuery, sortOrder]);

  const selectedAsset = useMemo(() =>
    assetsWithFavs.find(a => a.id === selectedAssetId) || null,
  [assetsWithFavs, selectedAssetId]);

  const toggleFavorite = useCallback((assetId) => {
    setFavorites(prev => {
      const next = prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const toggleFilter = useCallback((filterKey) => {
    setActiveFilters(prev =>
      prev.includes(filterKey) ? prev.filter(f => f !== filterKey) : [...prev, filterKey]
    );
  }, []);

  const createCollection = useCallback((name) => {
    const coll = { id: `coll-${Date.now()}`, name, assetIds: [] };
    setCollections(prev => {
      const next = [...prev, coll];
      try { localStorage.setItem(COLL_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    return coll;
  }, []);

  const addToCollection = useCallback((collectionId, assetId) => {
    setCollections(prev => {
      const next = prev.map(c =>
        c.id === collectionId
          ? { ...c, assetIds: c.assetIds.includes(assetId) ? c.assetIds : [...c.assetIds, assetId] }
          : c
      );
      try { localStorage.setItem(COLL_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeFromCollection = useCallback((collectionId, assetId) => {
    setCollections(prev => {
      const next = prev.map(c =>
        c.id === collectionId
          ? { ...c, assetIds: c.assetIds.filter(id => id !== assetId) }
          : c
      );
      try { localStorage.setItem(COLL_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return {
    assets: assetsWithFavs,
    filteredAssets,
    categoryCounts,
    collections,
    selectedAsset,
    selectedAssetId,
    previewAsset,
    searchQuery, setSearchQuery,
    activeCategory, setActiveCategory,
    activeFilters, toggleFilter,
    sortOrder, setSortOrder,
    viewMode, setViewMode,
    aiPanelOpen, setAiPanelOpen,
    setSelectedAssetId, setPreviewAsset,
    toggleFavorite,
    createCollection, addToCollection, removeFromCollection,
  };
}