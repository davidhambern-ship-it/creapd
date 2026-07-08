import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'react-hot-toast';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') ?? fallback; } catch { return fallback; }
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

export function usePresentationEditor(presentationId) {
  const [presentation, setPresentation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [elements, setElements] = useState([]);
  const [savedElements, setSavedElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(0.5);
  const [mode, setMode] = useState('edit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [presenting, setPresenting] = useState(false);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [scope, setScope] = useState('slide');
  const playRef = useRef(null);

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
    if (!presentationId) return;
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
    if (dirty) saveAll();
    setActiveIndex(index);
    setSelectedId(null);
    setCurrentTime(0);
    setIsPlaying(false);
    if (slides[index]) loadElements(slides[index].id);
  }, [dirty, slides, loadElements]);

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
      lower_third: { width: 800, height: 80, content: 'Lower third text', x: 240, y: 600 },
      caption: { width: 600, height: 40, content: 'Caption text', x: 340, y: 660 },
    };
    const def = presets[type] || { width: 200, height: 100, content: '' };
    const newEl = {
      id: `temp-${Date.now()}`,
      slide_id: activeSlide.id,
      presentation_id: presentationId,
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
  }, [activeSlide, elements, presentationId, pushUndo]);

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

  // ═══ Slide ops ═══
  const updateSlide = useCallback((updates) => {
    pushUndo();
    setSlides(prev => prev.map((s, i) => i === activeIndex ? { ...s, ...updates } : s));
  }, [activeIndex, pushUndo]);

  const addSlide = useCallback(async () => {
    try {
      const newSlide = await base44.entities.StorySlide.create({
        stories_presentation_id: presentationId,
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
  }, [presentationId, slides.length]);

  const duplicateSlide = useCallback(async (index) => {
    const src = slides[index];
    if (!src) return;
    try {
      const dup = await base44.entities.StorySlide.create({
        stories_presentation_id: presentationId,
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
  }, [slides, presentationId]);

  const deleteSlide = useCallback(async (index) => {
    if (slides.length <= 1) { toast.error('Cannot delete the last slide'); return; }
    const slide = slides[index];
    if (!slide) return;
    try {
      await base44.entities.StorySlide.delete(slide.id);
      const remaining = slides.filter((_, i) => i !== index);
      setSlides(remaining);
      if (activeIndex >= remaining.length) setActiveIndex(remaining.length - 1);
      setDirty(true);
    } catch { toast.error('Failed to delete slide'); }
  }, [slides, activeIndex]);

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
        await base44.entities.SlideElement.create({ ...rest, slide_id: activeSlide.id, presentation_id: presentationId });
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
  }, [activeSlide, elements, savedElements, slides, presentationId, presentation, loadElements]);

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
  }, [activeSlide, presentationId]);

  // ═══ Export ═══
  const exportPresentation = useCallback(async (format) => {
    if (dirty) await saveAll();
    if (format === 'Present Mode') { setPresenting(true); return; }
    toast.loading(`Exporting ${format}...`, { id: 'export' });
    try {
      await base44.functions.invoke('createExportJob', { presentation_id: presentationId, format: format.toLowerCase().replace(/\s/g, '_') });
      toast.success(`${format} export started`, { id: 'export' });
    } catch { toast.error('Export failed', { id: 'export' }); }
  }, [dirty, saveAll, presentationId]);

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

  return {
    CANVAS_W, CANVAS_H,
    presentation, slides, activeSlide, activeIndex, elements, selectedId, selectedElement,
    zoom, setZoom, mode, setMode, loading, saving, dirty, presenting, setPresenting,
    isPlaying, currentTime, scope, setScope, totalTime, slideDuration,
    selectSlide, updateElement, deleteElement, duplicateElement, addElement, bringForward, sendBackward,
    updateSlide, addSlide, duplicateSlide, deleteSlide, reorderSlides,
    undo, redo, undoStack, redoStack, saveAll,
    regenerateSlide, regenerateElement, runQA, exportPresentation,
    setSelectedId,
    play: () => setIsPlaying(true), pause: () => setIsPlaying(false),
    stop: () => { setIsPlaying(false); setCurrentTime(0); },
    restart: () => { setCurrentTime(0); setIsPlaying(true); },
    scrub: setCurrentTime,
  };
}