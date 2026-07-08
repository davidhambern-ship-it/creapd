import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'react-hot-toast';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') ?? fallback; } catch { return fallback; }
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function generatePpId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PP-${ts}-${rand}`;
}

export function usePresentationEditor(presentationId) {
  const navigate = useNavigate();
  const isTransient = !presentationId;

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

  // Transient mode: per-slide element cache (slide temp-id → elements[])
  const [transientElements, setTransientElements] = useState({});

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [scope, setScope] = useState('slide');
  const playRef = useRef(null);
  const audioObjs = useRef([]);
  const isPlayingRef = useRef(false);

  // Undo / Redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const activeSlide = slides[activeIndex];

  // ═══ Load ═══
  const loadElements = useCallback(async (slideId) => {
    try {
      const els = await base44.entities.SlideElement.filter({ slide_id: slideId });
      setElements(els || []);
      setSavedElements(els || []);
    } catch {
      setElements([]);
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
    try {
      const pres = await base44.entities.StoriesPresentation.get(presentationId);
      setPresentation(pres);
      const ids = parseJSON(pres.slide_order || pres.story_slide_ids, []);
      const loaded = [];
      for (const sid of ids) {
        try { loaded.push(await base44.entities.StorySlide.get(sid)); } catch {}
      }
      setSlides(loaded);
      if (loaded.length > 0) {
        setActiveIndex(0);
        await loadElements(loaded[0].id);
      }
    } catch {
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
    if (slides[index]) loadElements(slides[index].id);
  }, [isTransient, activeSlide, elements, slides, dirty, loadElements, transientElements]);

  // ═══ Element ops ═══
  const updateElement = useCallback((elId, updates) => {
    pushUndo();
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

  // ═══ Clipboard ═══
  const copyElement = useCallback((elId) => {
    const el = elements.find(e => e.id === elId);
    if (el) setClipboard(clone(el));
  }, [elements]);

  const cutElement = useCallback((elId) => {
    const el = elements.find(e => e.id === elId);
    if (el) { setClipboard(clone(el)); deleteElement(elId); }
  }, [elements, deleteElement]);

  const pasteElement = useCallback(() => {
    if (!clipboard || !activeSlide) return;
    pushUndo();
    const pasted = {
      ...clone(clipboard), id: `temp-${Date.now()}`,
      slide_id: activeSlide.id,
      x: (clipboard.x || 0) + 30, y: (clipboard.y || 0) + 30,
      z_index: (elements?.length || 0) + 1,
    };
    setElements(prev => [...prev, pasted]);
    setSelectedId(pasted.id);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAll(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !selectedId.startsWith('__')) { e.preventDefault(); deleteElement(selectedId); }
      }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedId, deleteElement]);

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
          const createdSlide = await base44.entities.StorySlide.create({
            stories_presentation_id: created.id,
            pp_id: presentation.pp_id,
            slide_number: slideIds.length + 1,
            slide_type: slide.slide_type || 'blank',
            title: slide.title || 'New Slide',
            body_text: slide.body_text || '',
            speaker_notes: slide.speaker_notes || '',
            transition: slide.transition || 'fade',
            status: 'editing',
            background: slide.background || JSON.stringify({ color: '#0a0a0a' }),
            version: 1,
          });
          slideIds.push(createdSlide.id);

          // Create elements for this slide
          const slideEls = allElements[slide.id] || [];
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
      await base44.entities.StorySlide.update(activeSlide.id, {
        title: activeSlide.title, body_text: activeSlide.body_text,
        speaker_notes: activeSlide.speaker_notes, slide_type: activeSlide.slide_type,
        background: activeSlide.background, transition: activeSlide.transition,
        timing: activeSlide.timing, references: activeSlide.references,
        animations: activeSlide.animations, status: 'editing',
        version: (activeSlide.version || 1) + 1,
      });

      const currentIds = new Set(elements.map(e => e.id));
      const savedIds = new Set(savedElements.map(e => e.id));
      const toCreate = elements.filter(e => e.id.startsWith('temp-'));
      const toUpdate = elements.filter(e => !e.id.startsWith('temp-') && savedIds.has(e.id));
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

      await loadElements(activeSlide.id);
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

  // ═══ AI Regenerate ═══
  const regenerateSlide = useCallback(async () => {
    if (!activeSlide) return;
    toast.loading('Regenerating slide...', { id: 'regen' });
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Regenerate this presentation slide. Current title: "${activeSlide.title}". Current body: "${activeSlide.body_text || ''}". Return improved JSON with "title" and "body_text".`,
        response_json_schema: { type: 'object', properties: { title: { type: 'string' }, body_text: { type: 'string' } } },
      });
      updateSlide({ title: res.title, body_text: res.body_text });
      toast.success('Slide regenerated', { id: 'regen' });
    } catch { toast.error('Regeneration failed', { id: 'regen' }); }
  }, [activeSlide, updateSlide]);

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
        if (t >= totalTime) { setIsPlaying(false); return 0; }
        return t + 100;
      });
    }, 100);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, totalTime]);

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

  const selectedElement = selectedId && !selectedId.startsWith('__')
    ? elements.find(e => e.id === selectedId) : null;
  const selectedElements = selectedIds.filter(id => !id.startsWith('__'))
    .map(id => elements.find(e => e.id === id)).filter(Boolean);

  return {
    CANVAS_W, CANVAS_H,
    presentation, slides, activeSlide, activeIndex, elements, selectedId, selectedElement,
    zoom, setZoom, mode, setMode, loading, saving, dirty, presenting, setPresenting,
    isPlaying, currentTime, scope, setScope, totalTime, slideDuration,
    selectSlide, updateElement, deleteElement, duplicateElement, addElement, bringForward, sendBackward,
    updateSlide, updatePresentation, addSlide, duplicateSlide, deleteSlide, reorderSlides,
    undo, redo, undoStack, redoStack, saveAll,
    regenerateSlide, regenerateElement, runQA, exportPresentation,
    selectedId, setSelectedId, selectedIds, setSelectedIds, toggleSelection, clearSelection,
    selectedElements, copyElement, cutElement, pasteElement,
    alignElements, distributeElements,
    play: () => setIsPlaying(true), pause: () => setIsPlaying(false),
    stop: () => { audioObjs.current.forEach(a => { a.pause(); a.currentTime = 0; }); setIsPlaying(false); setCurrentTime(0); },
    restart: () => { setCurrentTime(0); setIsPlaying(true); },
    scrub: setCurrentTime,
  };
}