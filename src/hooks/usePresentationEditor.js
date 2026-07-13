import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'react-hot-toast';
import { ensureTitleBodyElements } from '@/lib/canvasUtils';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') ?? fallback; } catch { return fallback; }
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// Strip markup tags like <font:Poppins> from content, extract directives
function cleanContent(raw) {
  if (!raw || typeof raw !== 'string') return { content: '', font: null, anim: null };
  let content = raw;
  let font = null;
  let anim = null;
  content = content.replace(/<font:([^>]+)>/gi, (m, name) => { font = name.trim(); return ''; });
  content = content.replace(/<anim:([^>]+)>/gi, (m, name) => { anim = name.trim(); return ''; });
  content = content.replace(/<[^>]+>/g, '');
  return { content: content.trim(), font, anim };
}

function generatePpId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PP-${ts}-${rand}`;
}

export function usePresentationEditor(presentationId) {
  const navigate = useNavigate();
  // Treat literal route-param strings (":id") and "undefined" as no ID
  const isTransient = !presentationId || presentationId.startsWith(':') || presentationId === 'undefined';

  const [presentation, setPresentation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [elements, setElements] = useState([]);
  const [savedElements, setSavedElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedId = selectedIds[0] || null;
  const setSelectedId = useCallback((id) => setSelectedIds(id ? [id] : []), []);
  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);
  const [clipboard, setClipboard] = useState(null);
  const [zoom, setZoom] = useState(0.5);
  const [mode, setMode] = useState('edit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Canvas viewport state
  const [zoomMode, setZoomMode] = useState('fit_slide');
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeAreas, setShowSafeAreas] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Transient mode: per-slide element cache (slide temp-id → elements[])
  const [transientElements, setTransientElements] = useState({});

  // Service-role element cache from loadEditorData (slide_id → elements[])
  const cachedElementsRef = useRef({});

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [scope, setScope] = useState('slide');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const playRef = useRef(null);
  const audioObjs = useRef([]);
  const isPlayingRef = useRef(false);

  // Viewport callbacks
  const setViewport = useCallback((z, px, py) => {
    setZoom(z); setPanX(px); setPanY(py);
  }, []);
  const zoomIn = useCallback(() => { setZoomMode('manual'); setZoom(z => Math.min(z + 0.1, 4)); }, []);
  const zoomOut = useCallback(() => { setZoomMode('manual'); setZoom(z => Math.max(z - 0.1, 0.1)); }, []);
  const zoomFit = useCallback(() => setZoomMode('fit_slide'), []);
  const zoom100 = useCallback(() => { setZoomMode('100'); setZoom(1); }, []);

  // Undo / Redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const activeSlide = slides[activeIndex];

  // ═══ Load ═══
  const loadElements = useCallback(async (slide) => {
    const slideId = typeof slide === 'string' ? slide : slide?.id;
    if (!slideId) { setElements([]); setSavedElements([]); return; }

    const slideObj = typeof slide === 'object' ? slide : null;

    // ── Load elements: cache first (from loadEditorData), then DB, then scene_graph ──
    let dbElements = [];
    // Cache from loadEditorData (service-role, bypasses RLS) is the primary source
    if (cachedElementsRef.current[slideId]?.length > 0) {
      dbElements = cachedElementsRef.current[slideId];
    } else {
      // Try user-scoped DB query as secondary source
      try {
        const els = await base44.entities.SlideElement.filter({ slide_id: slideId });
        dbElements = els || [];
      } catch {
        dbElements = [];
      }
    }

    // DB elements are the source of truth — scene_graph is just a "direction"
    // that autoBuildPacket used to create them. Only parse scene_graph when
    // no DB elements exist yet.
    if (dbElements.length > 0) {
      const enriched = ensureTitleBodyElements(dbElements, slideObj);
      setElements(enriched);
      setSavedElements(dbElements);
      return;
    }

    try {
      const sceneGraph = slideObj ? parseJSON(slideObj.scene_graph, null) : null;
      const merged = [];

      // ── Scene graph style mappings (mirrors PresentationElement) ──
      const FONT_MAP = {
        'font-heading': 'Poppins, sans-serif',
        'font-body': 'Inter, sans-serif',
        'font-display': 'Oswald, sans-serif',
        'font-mono': '"JetBrains Mono", monospace',
        'font-condensed': 'Archivo, sans-serif',
        'font-serif': '"Playfair Display", serif',
      };
      const COLOR_MAP = {
        primary:  { text: 'hsl(270 80% 65%)', glow: 'hsl(270 80% 60% / 0.4)',  border: 'hsl(270 80% 60% / 0.5)',  bg: 'hsl(270 80% 60% / 0.08)' },
        accent:   { text: 'hsl(25 95% 60%)',  glow: 'hsl(25 95% 55% / 0.4)',   border: 'hsl(25 95% 55% / 0.5)',   bg: 'hsl(25 95% 55% / 0.08)' },
        emerald:  { text: 'hsl(152 60% 50%)', glow: 'hsl(152 60% 45% / 0.4)',  border: 'hsl(152 60% 45% / 0.5)',  bg: 'hsl(152 60% 45% / 0.08)' },
        cyan:     { text: 'hsl(190 80% 55%)', glow: 'hsl(190 80% 55% / 0.4)',  border: 'hsl(190 80% 55% / 0.5)',  bg: 'hsl(190 80% 55% / 0.08)' },
        gold:     { text: 'hsl(45 95% 55%)',  glow: 'hsl(45 95% 55% / 0.4)',   border: 'hsl(45 95% 55% / 0.5)',   bg: 'hsl(45 95% 55% / 0.08)' },
        rose:     { text: 'hsl(300 80% 65%)', glow: 'hsl(300 80% 60% / 0.4)',  border: 'hsl(300 80% 60% / 0.5)',  bg: 'hsl(300 80% 60% / 0.08)' },
        white:    { text: 'hsl(0 0% 95%)',    glow: 'hsl(0 0% 95% / 0.2)',     border: 'hsl(0 0% 100% / 0.15)',   bg: 'hsl(0 0% 100% / 0.05)' },
        muted:    { text: 'hsl(220 10% 65%)', glow: 'hsl(220 10% 65% / 0.2)',  border: 'hsl(220 10% 30% / 0.4)',  bg: 'hsl(220 10% 20% / 0.1)' },
        crimson:  { text: 'hsl(0 72% 55%)',   glow: 'hsl(0 72% 51% / 0.4)',    border: 'hsl(0 72% 51% / 0.5)',    bg: 'hsl(0 72% 51% / 0.08)' },
      };
      const FONT_SIZE_MAP = {
        headline: 48, body_text: 24, statistic: 72, quote: 28,
        callout: 22, talking_point_card: 22, discussion_response: 22,
        lower_third: 20, caption: 18, default: 20,
      };

      const typeMap = {
        headline: 'text', body_text: 'text', image: 'image',
        talking_point_card: 'text', discussion_response: 'text',
        lower_third: 'lower_third', statistic: 'text', quote: 'text',
        callout: 'text', caption: 'caption',
      };
      const TYPE_SIZES = {
        headline: { w: 800, h: 100 }, body_text: { w: 900, h: 200 },
        statistic: { w: 600, h: 150 }, quote: { w: 700, h: 150 },
        talking_point_card: { w: 500, h: 120 }, discussion_response: { w: 500, h: 120 },
        lower_third: { w: 900, h: 60 }, callout: { w: 500, h: 100 },
        caption: { w: 600, h: 40 }, image: { w: 500, h: 350 },
        default: { w: 600, h: 100 },
      };

      function getVisualStyles(effects, color) {
        const styles = {};
        const fx = effects || [];
        if (fx.includes('glass_panel')) {
          styles.backgroundColor = color.bg;
          styles.backdropFilter = 'blur(12px)';
          styles.borderRadius = '12px';
          styles.border = `1px solid ${color.border}`;
        }
        if (fx.includes('glow_border')) {
          styles.border = `1px solid ${color.border}`;
          styles.boxShadow = `0 0 16px ${color.glow}, inset 0 0 12px ${color.glow}`;
          styles.borderRadius = '12px';
        }
        if (fx.includes('neon_shadow')) {
          styles.textShadow = `0 0 8px ${color.text}, 0 0 24px ${color.glow}`;
        }
        if (fx.includes('drop_shadow')) {
          styles.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))';
        }
        if (fx.includes('gradient_border')) {
          styles.border = `1px solid ${color.border}`;
          styles.boxShadow = `0 0 1px ${color.text}, 0 0 12px ${color.glow}`;
          styles.borderRadius = '12px';
        }
        if (fx.includes('inner_glow')) {
          const existing = styles.boxShadow || '';
          styles.boxShadow = `${existing} inset 0 0 20px ${color.glow}`.trim();
        }
        return styles;
      }

      if (sceneGraph && Array.isArray(sceneGraph.scenes)) {
        const seenContent = new Set();
        let idCounter = 0;
        for (const scene of sceneGraph.scenes) {
          for (const layer of (scene.layers || [])) {
            for (const elem of (layer.elements || [])) {
              const rawContent = elem.asset_reference || elem.content || '';
              const cleaned = cleanContent(rawContent);
              const elemContent = cleaned.content || rawContent;
              if (!elemContent) continue;
              const contentKey = elemContent.trim().toLowerCase();
              if (seenContent.has(contentKey)) continue;
              seenContent.add(contentKey);

              const elType = typeMap[elem.element_type] || 'text';
              const scaleFactor = Math.max(0.5, Math.min(1.5, elem.scale || 1));

              // Derive size from element type × scale
              const baseSize = TYPE_SIZES[elem.element_type] || TYPE_SIZES.default;
              const w = Math.max(30, Math.round(baseSize.w * scaleFactor));
              const h = Math.max(20, Math.round(baseSize.h * scaleFactor));

              // Position — scene graph uses normalized 0-1 CENTER coordinates
              const cp = elem.position || {};
              const rawX = cp.x != null ? Math.max(0.05, Math.min(0.95, cp.x)) : 0.5;
              const rawY = cp.y != null ? Math.max(0.05, Math.min(0.95, cp.y)) : 0.5;
              // Convert center position to top-left corner
              const px = Math.round(rawX * CANVAS_W - w / 2);
              const py = Math.round(rawY * CANVAS_H - h / 2);

              // Map color theme and font style from scene graph
              const colorKey = elem.color_theme || 'white';
              const color = COLOR_MAP[colorKey] || COLOR_MAP.white;
              const fontFamily = cleaned.font || FONT_MAP[elem.font_style] || 'Inter, sans-serif';

              // Map visual effects to CSS styles
              const fxStyles = getVisualStyles(elem.visual_effects || [], color);

              const styleObj = {
                fontSize: FONT_SIZE_MAP[elem.element_type] || FONT_SIZE_MAP.default,
                fontFamily,
                color: color.text,
                bold: elem.element_type === 'statistic' || elem.element_type === 'headline',
                italic: elem.element_type === 'quote',
                align: 'center',
                backgroundColor: fxStyles.backgroundColor || 'transparent',
                borderRadius: fxStyles.borderRadius || 0,
                border: fxStyles.border || 'none',
                boxShadow: fxStyles.boxShadow || 'none',
                textShadow: fxStyles.textShadow || 'none',
                filter: fxStyles.filter || 'none',
                backdropFilter: fxStyles.backdropFilter || 'none',
                padding: 12,
                ambientAnimation: elem.ambient_animation || 'none',
              };

              // Entrance animation
              const animType = cleaned.anim || elem.entrance_animation?.type || 'fade_in';
              const animDur = elem.entrance_animation?.duration_ms || 500;
              const tlEvents = elem.timeline_events || [];
              const startMs = tlEvents.length > 0 ? tlEvents[0].start_time : 0;
              const endMs = tlEvents.length > 0 ? tlEvents[0].end_time : 0;

              merged.push({
                id: elem.element_id || `sg-${slideId}-${idCounter++}`,
                slide_id: slideId,
                type: elType,
                content: elemContent,
                x: px,
                y: py,
                width: w,
                height: h,
                rotation: elem.rotation || 0,
                opacity: Math.round((elem.opacity ?? 1) * 100),
                z_index: elem.z_order ?? idCounter,
                style: JSON.stringify(styleObj),
                animation: JSON.stringify({ type: animType, duration_ms: animDur, delay_ms: startMs }),
                timing: tlEvents.length > 0 ? JSON.stringify({ start_ms: startMs, end_ms: endMs }) : null,
                locked: false,
                visible: elem.visibility !== false,
              });
            }
          }
        }
      }

      const enriched = ensureTitleBodyElements(merged, slideObj);
      setElements(enriched);
      setSavedElements([]); // Scene graph temp elements — will be created on save
    } catch {
      // If scene_graph parsing fails, derive title/body from slide content
      const fallback = ensureTitleBodyElements([], slideObj);
      setElements(fallback);
      setSavedElements([]);
    }
  }, []);

  const loadPresentation = useCallback(async () => {
    if (!presentationId) {
      // ── Transient / blank editor ──
      const ppId = generatePpId();
      const blankSlide = {
        id: `temp-slide-${Date.now()}`,
        stories_presentation_id: null,
        pp_id: ppId,
        slide_number: 1,
        slide_type: 'blank',
        title: 'New Slide',
        body_text: '',
        speaker_notes: '',
        transition: 'fade',
        status: 'editing',
        background: JSON.stringify({ color: '#0a0a0a' }),
        version: 1,
      };
      setPresentation({
        title: 'Untitled Presentation',
        production_profile: 'news',
        pp_id: ppId,
        slide_order: '[]',
        story_slide_ids: '[]',
        presentation_version: 1,
        status: 'editing',
      });
      setSlides([blankSlide]);
      setActiveIndex(0);
      setElements([]);
      setSavedElements([]);
      setTransientElements({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      // Use service-role backend function to bypass RLS for service-created records
      const res = await base44.functions.invoke('loadEditorData', { presentation_id: presentationId });
      const data = res.data || res;
      if (data.error) {
        setLoadError(data.error);
        setLoading(false);
        return;
      }
      const { presentation: pres, slides: loaded, elementsBySlide } = data;
      if (!pres) {
        setLoadError('Presentation not found in database');
        setLoading(false);
        return;
      }
      setPresentation(pres);
      setSlides(loaded);
      if (loaded.length > 0) {
        setActiveIndex(0);
        // Use pre-loaded elements if available, otherwise fall back to scene_graph parsing
        // Cache elements for all slides (bypasses RLS for service-created records)
        cachedElementsRef.current = elementsBySlide || {};
        const firstSlideEls = elementsBySlide?.[loaded[0].id] || [];
        if (firstSlideEls.length > 0) {
          const enriched = ensureTitleBodyElements(firstSlideEls, loaded[0]);
          setElements(enriched);
          setSavedElements(firstSlideEls);
        } else {
          await loadElements(loaded[0]);
        }
      }
    } catch (err) {
      setLoadError(err?.message || 'Failed to load presentation');
      toast.error('Failed to load presentation');
    } finally {
      setLoading(false);
    }
  }, [presentationId, loadElements]);

  useEffect(() => { loadPresentation(); }, [loadPresentation]);

  // ═══ Snapshot for undo/redo ═══
  const snapshot = useCallback(() => ({
    elements: clone(elements),
    slide: activeSlide ? clone(activeSlide) : null,
    slides: clone(slides),
    activeIndex,
  }), [elements, activeSlide, slides, activeIndex]);

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev, snapshot()].slice(-40));
    setRedoStack([]);
    setDirty(true);
  }, [snapshot]);

  // ═══ Select slide ═══
  const selectSlide = useCallback((index) => {
    if (isTransient) {
      // Stash current slide's elements before switching
      if (activeSlide) {
        setTransientElements(prev => ({ ...prev, [activeSlide.id]: elements }));
      }
      setActiveIndex(index);
      setSelectedId(null);
      setCurrentTime(0);
      setIsPlaying(false);
      const newSlide = slides[index];
      if (newSlide) {
        setElements(transientElements[newSlide.id] || []);
        setSavedElements([]);
      }
      return;
    }

    if (dirty) saveAll();
    setActiveIndex(index);
    setSelectedId(null);
    setCurrentTime(0);
    setIsPlaying(false);
    if (slides[index]) loadElements(slides[index]);
  }, [isTransient, activeSlide, elements, slides, dirty, loadElements, transientElements]);

  // ═══ Element ops ═══
  const updateElement = useCallback((elId, updates, opts = {}) => {
    if (!opts.silent) pushUndo();
    setElements(prev => prev.map(el => el.id === elId ? { ...el, ...updates } : el));
  }, [pushUndo]);

  const deleteElement = useCallback((elId) => {
    pushUndo();
    setElements(prev => prev.filter(el => el.id !== elId));
    setSelectedId(null);
  }, [pushUndo]);

  const duplicateElement = useCallback((elId) => {
    pushUndo();
    const el = elements.find(e => e.id === elId);
    if (!el) return;
    const copy = {
      ...clone(el),
      id: `temp-${Date.now()}`,
      x: (el.x || 0) + 30,
      y: (el.y || 0) + 30,
      z_index: (el.z_index || 0) + 1,
    };
    setElements(prev => [...prev, copy]);
    setSelectedId(copy.id);
  }, [elements, pushUndo]);

  const addElement = useCallback((type) => {
    if (!activeSlide) return;
    pushUndo();
    const presets = {
      text: { width: 400, height: 60, content: 'New text box' },
      image: { width: 400, height: 300, content: '' },
      shape: { width: 200, height: 150, content: '' },
      icon: { width: 64, height: 64, content: 'star' },
      video: { width: 480, height: 270, content: '' },
      audio: { width: 300, height: 48, content: '' },
      chart: { width: 400, height: 300, content: JSON.stringify({ type: 'bar', data: [] }) },
      table: { width: 500, height: 200, content: JSON.stringify({ rows: 3, cols: 3 }) },
      lower_third: { width: 800, height: 80, content: 'Lower third text', x: 240, y: 600 },
      caption: { width: 600, height: 40, content: 'Caption text', x: 340, y: 660 },
      svg: { width: 200, height: 200, content: '' },
      divider: { width: 800, height: 4, content: '', x: 240, y: 358 },
      callout: { width: 400, height: 120, content: 'Callout text' },
      quote: { width: 600, height: 150, content: '“Inspiring quote text”' },
      code_block: { width: 500, height: 200, content: '// Your code here' },
      equation: { width: 300, height: 80, content: 'E = mc²' },
      qr_code: { width: 150, height: 150, content: 'https://example.com' },
      placeholder: { width: 300, height: 200, content: 'Placeholder' },
    };
    const def = presets[type] || { width: 200, height: 100, content: '' };
    const newEl = {
      id: `temp-${Date.now()}`,
      slide_id: activeSlide.id,
      presentation_id: presentationId,
      pp_id: presentation?.pp_id,
      type,
      content: def.content || '',
      x: def.x ?? 100, y: def.y ?? 100,
      width: def.width, height: def.height,
      rotation: 0, opacity: 100,
      z_index: (elements?.length || 0) + 1,
      style: JSON.stringify({ fontSize: type === 'text' ? 28 : 16, color: '#ffffff', align: 'left' }),
      locked: false, visible: true,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
  }, [activeSlide, elements, presentationId, presentation, pushUndo]);

  const bringForward = useCallback((elId) => {
    pushUndo();
    setElements(prev => {
      const el = prev.find(e => e.id === elId);
      if (!el) return prev;
      const maxZ = Math.max(...prev.map(e => e.z_index || 0));
      return prev.map(e => e.id === elId ? { ...e, z_index: maxZ + 1 } : e);
    });
  }, [pushUndo]);

  const sendBackward = useCallback((elId) => {
    pushUndo();
    setElements(prev => {
      const el = prev.find(e => e.id === elId);
      if (!el) return prev;
      const minZ = Math.min(...prev.map(e => e.z_index || 0));
      return prev.map(e => e.id === elId ? { ...e, z_index: minZ - 1 } : e);
    });
  }, [pushUndo]);

  // ═══ Move selected (keyboard arrows) ═══
  const moveSelected = useCallback((dx, dy) => {
    if (selectedIds.length === 0) return;
    pushUndo();
    setElements(prev => prev.map(el => {
      if (!selectedIds.includes(el.id) || el.locked) return el;
      return { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy };
    }));
  }, [selectedIds, pushUndo]);

  // ═══ Clipboard ═══
  const copyElement = useCallback((elId) => {
    const el = elements.find(e => e.id === elId);
    if (el) setClipboard([clone(el)]);
  }, [elements]);

  const cutElement = useCallback((elId) => {
    const el = elements.find(e => e.id === elId);
    if (el) { setClipboard([clone(el)]); deleteElement(elId); }
  }, [elements, deleteElement]);

  const pasteElement = useCallback(() => {
    if (!clipboard || !activeSlide) return;
    pushUndo();
    const items = Array.isArray(clipboard) ? clipboard : [clipboard];
    const newEls = items.map((item, i) => ({
      ...clone(item),
      id: `temp-${Date.now()}-${i}`,
      slide_id: activeSlide.id,
      x: (item.x || 0) + 30, y: (item.y || 0) + 30,
      z_index: (elements?.length || 0) + i + 1,
    }));
    setElements(prev => [...prev, ...newEls]);
    setSelectedIds(newEls.map(e => e.id));
  }, [clipboard, activeSlide, elements, pushUndo]);

  // ═══ Multi-element alignment & distribution ═══
  const alignElements = useCallback((type) => {
    if (selectedIds.length < 2) return;
    pushUndo();
    const selected = elements.filter(e => selectedIds.includes(e.id));
    if (selected.length < 2) return;
    setElements(prev => prev.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      switch (type) {
        case 'left': return { ...el, x: Math.min(...selected.map(s => s.x || 0)) };
        case 'right': return { ...el, x: Math.max(...selected.map(s => (s.x || 0) + (s.width || 0))) - (el.width || 0) };
        case 'center_h': {
          const minLeft = Math.min(...selected.map(s => s.x || 0));
          const maxRight = Math.max(...selected.map(s => (s.x || 0) + (s.width || 0)));
          return { ...el, x: (minLeft + maxRight) / 2 - (el.width || 0) / 2 };
        }
        case 'top': return { ...el, y: Math.min(...selected.map(s => s.y || 0)) };
        case 'bottom': return { ...el, y: Math.max(...selected.map(s => (s.y || 0) + (s.height || 0))) - (el.height || 0) };
        case 'center_v': {
          const minTop = Math.min(...selected.map(s => s.y || 0));
          const maxBottom = Math.max(...selected.map(s => (s.y || 0) + (s.height || 0)));
          return { ...el, y: (minTop + maxBottom) / 2 - (el.height || 0) / 2 };
        }
        default: return el;
      }
    }));
  }, [selectedIds, elements, pushUndo]);

  const distributeElements = useCallback((axis) => {
    if (selectedIds.length < 3) return;
    pushUndo();
    const selected = elements.filter(e => selectedIds.includes(e.id))
      .sort((a, b) => axis === 'h' ? (a.x || 0) - (b.x || 0) : (a.y || 0) - (b.y || 0));
    if (selected.length < 3) return;
    const first = selected[0], last = selected[selected.length - 1];
    const step = axis === 'h'
      ? ((last.x || 0) + (last.width || 0) - (first.x || 0)) / (selected.length - 1)
      : ((last.y || 0) + (last.height || 0) - (first.y || 0)) / (selected.length - 1);
    setElements(prev => prev.map(el => {
      const idx = selected.findIndex(s => s.id === el.id);
      if (idx === -1 || idx === 0 || idx === selected.length - 1) return el;
      return axis === 'h'
        ? { ...el, x: (first.x || 0) + step * idx }
        : { ...el, y: (first.y || 0) + step * idx };
    }));
  }, [selectedIds, elements, pushUndo]);

  // ═══ Slide ops ═══
  const updateSlide = useCallback((updates) => {
    pushUndo();
    setSlides(prev => prev.map((s, i) => i === activeIndex ? { ...s, ...updates } : s));
  }, [activeIndex, pushUndo]);

  // ═══ Presentation-level update ═══
  const updatePresentation = useCallback((updates) => {
    setPresentation(prev => prev ? { ...prev, ...updates } : prev);
    setDirty(true);
  }, []);

  const addSlide = useCallback(async () => {
    if (isTransient) {
      const newSlide = {
        id: `temp-slide-${Date.now()}`,
        stories_presentation_id: null,
        pp_id: presentation?.pp_id,
        slide_number: slides.length + 1,
        slide_type: 'blank',
        title: 'New Slide',
        body_text: '',
        speaker_notes: '',
        transition: 'fade',
        status: 'editing',
        background: JSON.stringify({ color: '#0a0a0a' }),
        version: 1,
      };
      // Stash current slide's elements
      if (activeSlide) {
        setTransientElements(prev => ({ ...prev, [activeSlide.id]: elements }));
      }
      setSlides(prev => [...prev, newSlide]);
      setActiveIndex(slides.length);
      setSelectedId(null);
      setElements([]);
      setSavedElements([]);
      setDirty(true);
      return;
    }

    try {
      const newSlide = await base44.entities.StorySlide.create({
        stories_presentation_id: presentationId,
        pp_id: presentation?.pp_id,
        slide_number: slides.length + 1,
        slide_type: 'blank',
        title: 'New Slide',
        body_text: '',
        speaker_notes: '',
        transition: 'fade',
        status: 'editing',
        background: JSON.stringify({ color: '#0a0a0a' }),
      });
      setSlides(prev => [...prev, newSlide]);
      setActiveIndex(slides.length);
      setSelectedId(null);
      setElements([]);
      setSavedElements([]);
      setDirty(true);
    } catch { toast.error('Failed to add slide'); }
  }, [isTransient, presentation, presentationId, slides.length, activeSlide, elements]);

  const duplicateSlide = useCallback(async (index) => {
    const src = slides[index];
    if (!src) return;

    if (isTransient) {
      const dup = {
        ...clone(src),
        id: `temp-slide-${Date.now()}`,
        title: `${src.title || 'Slide'} (Copy)`,
        slide_number: index + 2,
      };
      setSlides(prev => [...prev.slice(0, index + 1), dup, ...prev.slice(index + 1)]);
      setDirty(true);
      return;
    }

    try {
      const dup = await base44.entities.StorySlide.create({
        stories_presentation_id: presentationId,
        pp_id: presentation?.pp_id,
        slide_number: index + 2,
        slide_type: src.slide_type,
        title: `${src.title || 'Slide'} (Copy)`,
        body_text: src.body_text || '',
        speaker_notes: src.speaker_notes || '',
        transition: src.transition || 'fade',
        status: 'editing',
        background: src.background,
      });
      setSlides(prev => [...prev.slice(0, index + 1), dup, ...prev.slice(index + 1)]);
      setDirty(true);
    } catch { toast.error('Failed to duplicate slide'); }
  }, [slides, isTransient, presentation, presentationId]);

  const deleteSlide = useCallback(async (index) => {
    if (slides.length <= 1) { toast.error('Cannot delete the last slide'); return; }
    const slide = slides[index];
    if (!slide) return;

    if (isTransient) {
      setTransientElements(prev => {
        const next = { ...prev };
        delete next[slide.id];
        return next;
      });
      const remaining = slides.filter((_, i) => i !== index);
      setSlides(remaining);
      if (activeIndex >= remaining.length) setActiveIndex(remaining.length - 1);
      setDirty(true);
      return;
    }

    try {
      await base44.entities.StorySlide.delete(slide.id);
      const remaining = slides.filter((_, i) => i !== index);
      setSlides(remaining);
      if (activeIndex >= remaining.length) setActiveIndex(remaining.length - 1);
      setDirty(true);
    } catch { toast.error('Failed to delete slide'); }
  }, [slides, activeIndex, isTransient]);

  const reorderSlides = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    pushUndo();
    setSlides(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
    if (activeIndex === fromIndex) setActiveIndex(toIndex);
    else if (fromIndex < activeIndex && toIndex >= activeIndex) setActiveIndex(activeIndex - 1);
    else if (fromIndex > activeIndex && toIndex <= activeIndex) setActiveIndex(activeIndex + 1);
  }, [activeIndex, pushUndo]);

  // ═══ Undo / Redo ═══
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, snapshot()]);
    setElements(prev.elements);
    setSlides(prev.slides);
    setActiveIndex(prev.activeIndex);
    setUndoStack(u => u.slice(0, -1));
  }, [undoStack, snapshot]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, snapshot()]);
    setElements(next.elements);
    setSlides(next.slides);
    setActiveIndex(next.activeIndex);
    setRedoStack(r => r.slice(0, -1));
  }, [redoStack, snapshot]);

  // ═══ Save ═══
  const saveAll = useCallback(async () => {
    if (!activeSlide) return;
    setSaving(true);
    try {
      if (isTransient) {
        // ── Commit transient workspace to DB ──
        const created = await base44.entities.StoriesPresentation.create({
          title: presentation.title || 'Untitled Presentation',
          production_profile: presentation.production_profile || 'news',
          pp_id: presentation.pp_id,
          status: 'editing',
          presentation_version: 1,
          aspect_ratio: '16:9',
        });

        // Gather all elements: active slide from state + others from transient cache
        const allElements = { ...transientElements };
        allElements[activeSlide.id] = elements;

        const slideIds = [];
        for (const slide of slides) {
          // Create elements for this slide
          const slideEls = allElements[slide.id] || [];

          // Sync title/body from elements
          const sTitleEl = slideEls.find(e => { try { return JSON.parse(e.style || '{}').role === 'title'; } catch { return false; } });
          const sBodyEl = slideEls.find(e => { try { return JSON.parse(e.style || '{}').role === 'body'; } catch { return false; } });

          const createdSlide = await base44.entities.StorySlide.create({
            stories_presentation_id: created.id,
            pp_id: presentation.pp_id,
            slide_number: slideIds.length + 1,
            slide_type: slide.slide_type || 'blank',
            title: sTitleEl?.content ?? slide.title ?? 'New Slide',
            body_text: sBodyEl?.content ?? slide.body_text ?? '',
            speaker_notes: slide.speaker_notes || '',
            transition: slide.transition || 'fade',
            status: 'editing',
            background: slide.background || JSON.stringify({ color: '#0a0a0a' }),
            version: 1,
          });
          slideIds.push(createdSlide.id);

          for (const el of slideEls) {
            const { id: _id, ...rest } = el;
            await base44.entities.SlideElement.create({
              ...rest,
              slide_id: createdSlide.id,
              presentation_id: created.id,
              pp_id: presentation.pp_id,
            });
          }
        }

        // Update presentation with slide order + count
        await base44.entities.StoriesPresentation.update(created.id, {
          slide_order: JSON.stringify(slideIds),
          story_slide_ids: JSON.stringify(slideIds),
          story_count: slideIds.length,
        });

        toast.success('Presentation created');
        navigate(`/editor/${created.id}`, { replace: true });
        return;
      }

      // ── Existing save logic (persistent mode) ──
      // Sync title/body from elements back to slide record
      const titleEl = elements.find(e => { try { return JSON.parse(e.style || '{}').role === 'title'; } catch { return false; } });
      const bodyEl = elements.find(e => { try { return JSON.parse(e.style || '{}').role === 'body'; } catch { return false; } });

      await base44.entities.StorySlide.update(activeSlide.id, {
        title: titleEl?.content ?? activeSlide.title,
        body_text: bodyEl?.content ?? activeSlide.body_text,
        speaker_notes: activeSlide.speaker_notes, slide_type: activeSlide.slide_type,
        background: activeSlide.background, transition: activeSlide.transition,
        timing: activeSlide.timing, references: activeSlide.references,
        animations: activeSlide.animations, status: 'editing',
        version: (activeSlide.version || 1) + 1,
      });

      const currentIds = new Set(elements.map(e => e.id));
      const savedIds = new Set(savedElements.map(e => e.id));
      const toCreate = elements.filter(e => e.id.startsWith('temp-'));
      const toUpdate = elements.filter(e => !e.id.startsWith('temp-') && !e.id.startsWith('sg-') && savedIds.has(e.id));
      const toDelete = savedElements.filter(e => !currentIds.has(e.id));

      if (toDelete.length > 0) {
        await base44.entities.SlideElement.deleteMany({ slide_id: activeSlide.id, id: { $in: toDelete.map(e => e.id) } });
      }
      for (const el of toCreate) {
        const { id: _id, ...rest } = el;
        await base44.entities.SlideElement.create({ ...rest, slide_id: activeSlide.id, presentation_id: presentationId, pp_id: presentation?.pp_id });
      }
      for (const el of toUpdate) {
        const { id: _id, ...rest } = el;
        await base44.entities.SlideElement.update(el.id, rest);
      }

      await base44.entities.StoriesPresentation.update(presentationId, {
        slide_order: JSON.stringify(slides.map(s => s.id)),
        story_slide_ids: JSON.stringify(slides.map(s => s.id)),
        status: 'editing',
        presentation_version: (presentation?.presentation_version || 1) + 1,
      });

      await loadElements(activeSlide);
      setUndoStack([]);
      setRedoStack([]);
      setDirty(false);
      toast.success('Saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [isTransient, activeSlide, elements, savedElements, slides, presentationId, presentation, loadElements, transientElements, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput && e.key !== 'Escape') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAll(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(elements.filter(el => !el.locked && el.visible !== false).map(el => el.id));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        selectedIds.forEach(id => !id.startsWith('__') && duplicateElement(id));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        const els = elements.filter(el => selectedIds.includes(el.id));
        if (els.length > 0) setClipboard(els.map(clone));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteElement(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach(id => !id.startsWith('__') && deleteElement(id));
        }
        return;
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelected(-1 * (e.shiftKey ? 10 : 1), 0); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveSelected(1 * (e.shiftKey ? 10 : 1), 0); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSelected(0, -1 * (e.shiftKey ? 10 : 1)); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelected(0, 1 * (e.shiftKey ? 10 : 1)); return; }
      if (e.key === 'Escape') { setSelectedIds([]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, saveAll, selectedIds, elements, deleteElement, duplicateElement, pasteElement, moveSelected]);

  // ═══ AI Regenerate — re-directs the presentation via APD ═══
  const regenerateSlide = useCallback(async () => {
    if (!activeSlide) return;
    if (isTransient) {
      toast.error('Save the presentation before regenerating');
      return;
    }
    // Save pending changes before re-directing
    if (dirty) await saveAll();
    toast.loading('Regenerating via APD...', { id: 'regen' });
    try {
      const res = await base44.functions.invoke('directPresentation', {
        presentation_id: presentationId,
      });
      const result = res.data || res;
      if (result.error) {
        toast.error(result.error, { id: 'regen' });
        return;
      }
      // Reload the presentation to pick up the new scene graphs
      await loadPresentation();
      toast.success('Presentation re-directed by APD', { id: 'regen' });
    } catch (err) {
      toast.error('Regeneration failed: ' + (err?.message || 'unknown'), { id: 'regen' });
    }
  }, [activeSlide, isTransient, dirty, saveAll, presentationId, loadPresentation]);

  const regenerateElement = useCallback(async () => {
    const el = elements.find(e => e.id === selectedId);
    if (!el || !['text', 'lower_third', 'caption'].includes(el.type)) return;
    toast.loading('Regenerating...', { id: 'regen-el' });
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Improve this presentation text: "${el.content}". Return JSON: { "content": "string" }.`,
        response_json_schema: { type: 'object', properties: { content: { type: 'string' } } },
      });
      updateElement(el.id, { content: res.content });
      toast.success('Element regenerated', { id: 'regen-el' });
    } catch { toast.error('Regeneration failed', { id: 'regen-el' }); }
  }, [elements, selectedId, updateElement]);

  // ═══ QA ═══
  const runQA = useCallback(async () => {
    if (!activeSlide) return;
    if (isTransient) { toast.error('Save the presentation before running QA'); return; }
    toast.loading('Running QA...', { id: 'qa' });
    try {
      await base44.functions.invoke('dispatchWorker', {
        worker_id: 'develop_script', department: 'develop',
        pre_generated_content: `${activeSlide.title || ''}\n\n${activeSlide.body_text || ''}`,
        asset_id: activeSlide.id, asset_type: 'StorySlide',
        production_id: presentationId, quality_mode: 'standard',
      });
      toast.success('QA complete', { id: 'qa' });
    } catch { toast.error('QA failed', { id: 'qa' }); }
  }, [activeSlide, presentationId, isTransient]);

  // ═══ Export ═══
  const exportPresentation = useCallback(async (format) => {
    if (dirty) await saveAll();
    if (format === 'Present Mode') { setPresenting(true); return; }
    if (isTransient) { toast.error('Save the presentation before exporting'); return; }

    // PPTX export — returns a binary file download
    if (format === 'Google Slides (PPTX)' || format === 'PPTX') {
      toast.loading('Generating PPTX file...', { id: 'export' });
      try {
        const res = await base44.functions.invoke('exportToPptx', { presentation_id: presentationId });
        const url = res.data?.signed_url || res.signed_url;
        if (url) {
          window.open(url, '_blank');
          toast.success('PPTX downloaded — upload to Google Slides', { id: 'export' });
        } else {
          toast.success('PPTX export complete', { id: 'export' });
        }
      } catch { toast.error('PPTX export failed', { id: 'export' }); }
      return;
    }

    toast.loading(`Exporting ${format}...`, { id: 'export' });
    try {
      await base44.functions.invoke('createExportJob', { presentation_id: presentationId, format: format.toLowerCase().replace(/\s/g, '_') });
      toast.success(`${format} export started`, { id: 'export' });
    } catch { toast.error('Export failed', { id: 'export' }); }
  }, [dirty, saveAll, presentationId, isTransient]);

  // ═══ Review: Approve / Reject / Share / Export MP4 / Regenerate ═══
  const [approving, setApproving] = useState(false);
  const [exportJob, setExportJob] = useState(null);
  const [exportingMP4, setExportingMP4] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  const [regeneratingPres, setRegeneratingPres] = useState(false);

  const approvePresentation = useCallback(async () => {
    if (isTransient) { toast.error('Save the presentation before approving'); return; }
    setApproving(true);
    try {
      await base44.entities.StoriesPresentation.update(presentationId, {
        status: 'approved',
        producer_metadata: JSON.stringify({
          review_state: 'approved',
          approval_status: 'approved',
          approval_timestamp: new Date().toISOString(),
          locked: true,
        }),
      });
      setPresentation(prev => prev ? { ...prev, status: 'approved' } : prev);
      toast.success('Presentation approved');
    } catch { toast.error('Approval failed'); }
    finally { setApproving(false); }
  }, [isTransient, presentationId]);

  const rejectPresentation = useCallback(async () => {
    if (isTransient) return;
    try {
      await base44.entities.StoriesPresentation.update(presentationId, {
        status: 'reviewing',
        producer_metadata: JSON.stringify({
          review_state: 'changes_requested',
          approval_status: 'rejected',
          locked: false,
        }),
      });
      setPresentation(prev => prev ? { ...prev, status: 'reviewing' } : prev);
      toast.success('Changes requested');
    } catch { toast.error('Failed to request changes'); }
  }, [isTransient, presentationId]);

  const shareToCreapd = useCallback(async () => {
    if (isTransient) return;
    setSharing(true);
    try {
      const res = await base44.functions.invoke('sharePresentation', { presentation_id: presentationId });
      const result = res.data || res;
      if (result.showcase) setShareResult(result.showcase);
      toast.success('Shared to CREAPD Showcase');
    } catch { toast.error('Share failed'); }
    finally { setSharing(false); }
  }, [isTransient, presentationId]);

  const exportMP4 = useCallback(async () => {
    if (isTransient) return;
    setExportingMP4(true);
    try {
      const res = await base44.functions.invoke('createExportJob', { presentation_id: presentationId });
      const result = res.data || res;
      if (result.export_job) setExportJob(result.export_job);
      toast.success('Export job created');
    } catch { toast.error('Export failed'); }
    finally { setExportingMP4(false); }
  }, [isTransient, presentationId]);

  const regeneratePresentation = useCallback(async () => {
    if (isTransient || !presentation) return;
    setRegeneratingPres(true);
    try {
      // Save pending changes before re-directing
      if (dirty) await saveAll();
      const res = await base44.functions.invoke('directPresentation', {
        presentation_id: presentationId,
      });
      const result = res.data || res;
      if (result.error) {
        toast.error(result.error);
        return;
      }
      await loadPresentation();
      toast.success('Presentation re-directed by APD');
    } catch { toast.error('Regeneration failed'); }
    finally { setRegeneratingPres(false); }
  }, [isTransient, presentation, presentationId, dirty, saveAll, loadPresentation]);

  // ═══ Playback ═══
  const slideDuration = activeSlide
    ? parseJSON(activeSlide.timing, {}).duration_ms || activeSlide.duration_ms || 5000
    : 5000;

  const totalTime = scope === 'slide' ? slideDuration : slides.reduce((sum, s) =>
    sum + (parseJSON(s.timing, {}).duration_ms || s.duration_ms || 5000), 0);

  useEffect(() => {
    if (!isPlaying) { if (playRef.current) clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => {
      setCurrentTime(t => {
        const next = t + 100 * playbackSpeed;
        if (next >= totalTime) {
          if (loop) return 0;
          setIsPlaying(false);
          return totalTime;
        }
        return next;
      });
    }, 100);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, totalTime, playbackSpeed, loop]);

  // Keep isPlayingRef in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Load audio objects from current slide's audio elements + timeline
  useEffect(() => {
    audioObjs.current.forEach(a => { a.pause(); a.src = ''; });
    audioObjs.current = [];
    const audioEls = (elements || []).filter(e => e.type === 'audio' && e.content);
    audioEls.forEach(el => { audioObjs.current.push(new Audio(el.content)); });
    if (activeSlide?.slide_timeline) {
      try {
        const tl = JSON.parse(activeSlide.slide_timeline);
        if (tl.voice_audio_url) audioObjs.current.push(new Audio(tl.voice_audio_url));
      } catch {}
    }
    if (isPlayingRef.current) {
      audioObjs.current.forEach(a => a.play().catch(() => {}));
    }
  }, [elements, activeSlide]);

  // Play/pause audio when isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      audioObjs.current.forEach(a => a.play().catch(() => {}));
    } else {
      audioObjs.current.forEach(a => a.pause());
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || scope !== 'full') return;
    let elapsed = 0;
    for (let i = 0; i < slides.length; i++) {
      const dur = parseJSON(slides[i].timing, {}).duration_ms || slides[i].duration_ms || 5000;
      if (currentTime >= elapsed && currentTime < elapsed + dur) {
        if (i !== activeIndex) selectSlide(i);
        break;
      }
      elapsed += dur;
    }
  }, [currentTime, isPlaying, scope]);

  // Frame step (≈33ms at 30fps)
  const frameStepForward = useCallback(() => {
    setCurrentTime(t => Math.min(t + (1000 / 30), totalTime));
  }, [totalTime]);
  const frameStepBackward = useCallback(() => {
    setCurrentTime(t => Math.max(t - (1000 / 30), 0));
  }, []);

  const selectedElement = selectedId && !selectedId.startsWith('__')
    ? elements.find(e => e.id === selectedId) : null;
  const selectedElements = selectedIds.filter(id => !id.startsWith('__'))
    .map(id => elements.find(e => e.id === id)).filter(Boolean);

  return {
    CANVAS_W, CANVAS_H,
    presentation, slides, activeSlide, activeIndex, elements, selectedId, selectedElement,
    zoom, setZoom, mode, setMode, loading, loadError, saving, dirty, presenting, setPresenting,
    isPlaying, currentTime, scope, setScope, totalTime, slideDuration,
    selectSlide, updateElement, deleteElement, duplicateElement, addElement, bringForward, sendBackward,
    updateSlide, updatePresentation, addSlide, duplicateSlide, deleteSlide, reorderSlides,
    undo, redo, undoStack, redoStack, saveAll,
    regenerateSlide, regenerateElement, runQA, exportPresentation,
    approvePresentation, rejectPresentation, shareToCreapd, exportMP4, regeneratePresentation,
    approving, exportJob, exportingMP4, sharing, shareResult, regeneratingPres,
    selectedId, setSelectedId, selectedIds, setSelectedIds, toggleSelection, clearSelection,
    selectedElements, copyElement, cutElement, pasteElement, moveSelected,
    alignElements, distributeElements,
    // Viewport
    zoomMode, setZoomMode, panX, panY, setViewport,
    zoomIn, zoomOut, zoomFit, zoom100,
    showGrid, setShowGrid, showSafeAreas, setShowSafeAreas,
    showGuides, setShowGuides, snapEnabled, setSnapEnabled,
    play: () => setIsPlaying(true), pause: () => setIsPlaying(false),
    stop: () => { audioObjs.current.forEach(a => { a.pause(); a.currentTime = 0; }); setIsPlaying(false); setCurrentTime(0); },
    restart: () => { setCurrentTime(0); setIsPlaying(true); },
    scrub: setCurrentTime,
    playbackSpeed, setPlaybackSpeed, loop, setLoop,
    frameStepForward, frameStepBackward,
  };
}