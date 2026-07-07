import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'react-hot-toast';
import EditorToolbar from '@/components/presentation-editor/EditorToolbar';
import SlideThumbnailSidebar from '@/components/presentation-editor/SlideThumbnailSidebar';
import SlideCanvas from '@/components/presentation-editor/SlideCanvas';
import InspectorPanel from '@/components/presentation-editor/InspectorPanel';
import PlaybackControls from '@/components/presentation-editor/PlaybackControls';
import SlideTimeline from '@/components/presentation-editor/SlideTimeline';

export default function PresentationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [presentation, setPresentation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [elements, setElements] = useState([]);
  const [originalElements, setOriginalElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [zoom, setZoom] = useState(0.5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState('edit');
  const [previewing, setPreviewing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackScope, setPlaybackScope] = useState('slide');
  const playbackRef = useRef(null);

  // ═══ Load ═══
  useEffect(() => {
    loadPresentation();
  }, [id]);

  const loadPresentation = async () => {
    try {
      const pres = await base44.entities.StoriesPresentation.get(id);
      setPresentation(pres);

      const slideIds = (() => {
        try { return JSON.parse(pres.slide_order || pres.story_slide_ids || '[]'); }
        catch { return []; }
      })();

      const loaded = [];
      for (const sid of slideIds) {
        try { loaded.push(await base44.entities.StorySlide.get(sid)); } catch {}
      }
      setSlides(loaded);
      if (loaded.length > 0) {
        setActiveIndex(0);
        loadElements(loaded[0].id);
      }
    } catch (error) {
      toast.error('Failed to load presentation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadElements = async (slideId) => {
    try {
      const els = await base44.entities.SlideElement.filter({ slide_id: slideId });
      setElements(els || []);
      setOriginalElements(els || []);
    } catch {
      setElements([]);
      setOriginalElements([]);
    }
  };

  const activeSlide = slides[activeIndex];

  const handleSelectSlide = (index) => {
    if (dirty) saveAll();
    setActiveIndex(index);
    setSelectedElementId(null);
    setCurrentTime(0);
    setIsPlaying(false);
    if (slides[index]) loadElements(slides[index].id);
  };

  // ═══ Element operations ═══
  const pushHistory = () => {
    setHistory(prev => [...prev, {
      elements: JSON.parse(JSON.stringify(elements)),
      slide: JSON.parse(JSON.stringify(activeSlide)),
    }].slice(-30));
    setRedoStack([]);
    setDirty(true);
  };

  const handleUpdateElement = (elId, updates) => {
    pushHistory();
    setElements(prev => prev.map(el => el.id === elId ? { ...el, ...updates } : el));
  };

  const handleDeleteElement = (elId) => {
    pushHistory();
    setElements(prev => prev.filter(el => el.id !== elId));
    setSelectedElementId(null);
  };

  const handleAddElement = (type) => {
    pushHistory();
    const defaults = {
      text: { width: 400, height: 60, content: 'New text box' },
      image: { width: 400, height: 300, content: '' },
      shape: { width: 200, height: 150, content: '' },
      lower_third: { width: 800, height: 80, content: 'Lower third text', x: 240, y: 600 },
      caption: { width: 600, height: 40, content: 'Caption text', x: 340, y: 660 },
    };
    const def = defaults[type] || { width: 200, height: 100, content: '' };
    const newEl = {
      id: `temp-${Date.now()}`,
      slide_id: activeSlide.id,
      presentation_id: id,
      type,
      content: def.content || '',
      x: def.x ?? 100, y: def.y ?? 100,
      width: def.width, height: def.height,
      rotation: 0, opacity: 100, z_index: (elements?.length || 0) + 1,
      style: JSON.stringify({ fontSize: type === 'text' ? 24 : 16, color: '#ffffff' }),
      locked: false, visible: true,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const handleSelectElement = (elId) => {
    if (mode === 'preview') return;
    setSelectedElementId(elId);
  };

  // ═══ Slide operations ═══
  const handleUpdateSlide = (updates) => {
    pushHistory();
    setSlides(prev => prev.map((s, i) => i === activeIndex ? { ...s, ...updates } : s));
  };

  const handleAddSlide = async () => {
    try {
      const newSlide = await base44.entities.StorySlide.create({
        stories_presentation_id: id,
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
      setSelectedElementId(null);
      setElements([]);
      setOriginalElements([]);
      setDirty(true);
      toast.success('Slide added');
    } catch {
      toast.error('Failed to add slide');
    }
  };

  const handleDuplicateSlide = async (index) => {
    const src = slides[index];
    if (!src) return;
    try {
      const dup = await base44.entities.StorySlide.create({
        stories_presentation_id: id,
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
      toast.success('Slide duplicated');
    } catch {
      toast.error('Failed to duplicate slide');
    }
  };

  const handleDeleteSlide = async (index) => {
    const slide = slides[index];
    if (!slide) return;
    if (slides.length <= 1) { toast.error('Cannot delete the last slide'); return; }
    try {
      await base44.entities.StorySlide.delete(slide.id);
      const remaining = slides.filter((_, i) => i !== index);
      setSlides(remaining);
      if (activeIndex >= remaining.length) setActiveIndex(remaining.length - 1);
      setDirty(true);
      toast.success('Slide deleted');
    } catch {
      toast.error('Failed to delete slide');
    }
  };

  // ═══ Undo / Redo ═══
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack(r => [...r, { elements: JSON.parse(JSON.stringify(elements)), slide: JSON.parse(JSON.stringify(activeSlide)) }]);
    setElements(prev.elements);
    setSlides(s => s.map((sl, i) => i === activeIndex ? prev.slide : sl));
    setHistory(h => h.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(h => [...h, { elements: JSON.parse(JSON.stringify(elements)), slide: JSON.parse(JSON.stringify(activeSlide)) }]);
    setElements(next.elements);
    setSlides(s => s.map((sl, i) => i === activeIndex ? next.slide : sl));
    setRedoStack(r => r.slice(0, -1));
  };

  // ═══ Save ═══
  const saveAll = async () => {
    if (!activeSlide) return;
    setSaving(true);
    try {
      await base44.entities.StorySlide.update(activeSlide.id, {
        title: activeSlide.title, body_text: activeSlide.body_text,
        speaker_notes: activeSlide.speaker_notes, slide_type: activeSlide.slide_type,
        background: activeSlide.background, transition: activeSlide.transition,
        timing: activeSlide.timing, references: activeSlide.references,
        animations: activeSlide.animations,
        status: activeSlide.status === 'editing' ? 'editing' : activeSlide.status,
        version: (activeSlide.version || 1) + 1,
      });

      const currentIds = new Set(elements.map(e => e.id));
      const originalIds = new Set(originalElements.map(e => e.id));
      const toCreate = elements.filter(e => !originalIds.has(e.id) || e.id.startsWith('temp-'));
      const toUpdate = elements.filter(e => originalIds.has(e.id) && !e.id.startsWith('temp-'));
      const toDelete = originalElements.filter(e => !currentIds.has(e.id));

      if (toDelete.length > 0) {
        await base44.entities.SlideElement.deleteMany({ slide_id: activeSlide.id, id: { $in: toDelete.map(e => e.id) } });
      }
      for (const el of toCreate) {
        const { id: _id, ...rest } = el;
        await base44.entities.SlideElement.create({ ...rest, slide_id: activeSlide.id, presentation_id: id });
      }
      for (const el of toUpdate) {
        await base44.entities.SlideElement.update(el.id, { ...el, slide_id: activeSlide.id });
      }

      const slideOrder = slides.map(s => s.id);
      await base44.entities.StoriesPresentation.update(id, {
        slide_order: JSON.stringify(slideOrder),
        story_slide_ids: JSON.stringify(slideOrder),
        status: 'editing',
        presentation_version: (presentation.presentation_version || 1) + 1,
      });

      await loadElements(activeSlide.id);
      setHistory([]);
      setRedoStack([]);
      setDirty(false);
      toast.success('Saved');
    } catch (error) {
      toast.error('Save failed');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // ═══ Regenerate ═══
  const handleRegenerateSlide = async () => {
    if (!activeSlide) return;
    toast.loading('Regenerating slide...', { id: 'regen' });
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are regenerating a presentation slide. Current title: "${activeSlide.title}". Current body: "${activeSlide.body_text || ''}". Generate a fresh, improved version. Return JSON with "title" and "body_text" fields.`,
        response_json_schema: { type: 'object', properties: { title: { type: 'string' }, body_text: { type: 'string' } } },
      });
      handleUpdateSlide({ title: res.title, body_text: res.body_text });
      toast.success('Slide regenerated', { id: 'regen' });
    } catch {
      toast.error('Regeneration failed', { id: 'regen' });
    }
  };

  const handleRegenerateElement = async () => {
    const el = elements.find(e => e.id === selectedElementId);
    if (!el) return;
    if (!['text', 'lower_third', 'caption'].includes(el.type)) {
      toast.error('Only text elements can be regenerated');
      return;
    }
    toast.loading('Regenerating...', { id: 'regen-el' });
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Regenerate this presentation text element. Current: "${el.content}". Return an improved version. JSON: { "content": "string" }`,
        response_json_schema: { type: 'object', properties: { content: { type: 'string' } } },
      });
      handleUpdateElement(el.id, { content: res.content });
      toast.success('Element regenerated', { id: 'regen-el' });
    } catch {
      toast.error('Regeneration failed', { id: 'regen-el' });
    }
  };

  // ═══ QA ═══
  const handleRunQA = async () => {
    if (!activeSlide) return;
    toast.loading('Running QA...', { id: 'qa' });
    try {
      const content = `${activeSlide.title || ''}\n\n${activeSlide.body_text || ''}`;
      await base44.functions.invoke('dispatchWorker', {
        worker_id: 'develop_script', department: 'develop',
        pre_generated_content: content,
        asset_id: activeSlide.id, asset_type: 'StorySlide',
        production_id: id, quality_mode: 'standard',
      });
      toast.success('QA complete — check Controller Dashboard', { id: 'qa' });
    } catch {
      toast.error('QA failed', { id: 'qa' });
    }
  };

  // ═══ Export ═══
  const handleExport = async (format) => {
    if (dirty) await saveAll();
    if (format === 'Present Mode') {
      setPreviewing(true);
      return;
    }
    toast.loading(`Exporting as ${format}...`, { id: 'export' });
    try {
      await base44.functions.invoke('createExportJob', { presentation_id: id, format: format.toLowerCase().replace(/\s/g, '_') });
      toast.success(`${format} export started`, { id: 'export' });
    } catch {
      toast.error('Export failed', { id: 'export' });
    }
  };

  // ═══ Zoom ═══
  const handleCanvasAction = (action) => {
    if (action === 'zoom-in') setZoom(z => Math.min(z + 0.1, 2));
    if (action === 'zoom-out') setZoom(z => Math.max(z - 0.1, 0.2));
    if (action === 'zoom-fit') setZoom(0.5);
  };

  // ═══ Playback ═══
  const slideDuration = (() => {
    if (!activeSlide) return 5000;
    const timing = (() => { try { return JSON.parse(activeSlide.timing || '{}'); } catch { return {}; } })();
    return timing.duration_ms || activeSlide.duration_ms || 5000;
  })();

  const totalTime = playbackScope === 'slide' ? slideDuration : slides.reduce((sum, s) => {
    const t = (() => { try { return JSON.parse(s.timing || '{}'); } catch { return {}; } })();
    return sum + (t.duration_ms || s.duration_ms || 5000);
  }, 0);

  useEffect(() => {
    if (!isPlaying) {
      if (playbackRef.current) clearInterval(playbackRef.current);
      return;
    }
    playbackRef.current = setInterval(() => {
      setCurrentTime(t => {
        if (t >= totalTime) {
          setIsPlaying(false);
          return 0;
        }
        return t + 100;
      });
    }, 100);
    return () => { if (playbackRef.current) clearInterval(playbackRef.current); };
  }, [isPlaying, totalTime]);

  // Auto-advance slides in full presentation mode
  useEffect(() => {
    if (!isPlaying || playbackScope !== 'full') return;
    let elapsed = 0;
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const t = (() => { try { return JSON.parse(s.timing || '{}'); } catch { return {}; } })();
      const dur = t.duration_ms || s.duration_ms || 5000;
      if (currentTime >= elapsed && currentTime < elapsed + dur) {
        if (i !== activeIndex) setActiveIndex(i);
        break;
      }
      elapsed += dur;
    }
  }, [currentTime, isPlaying, playbackScope]);

  // ═══ Present mode ═══
  if (previewing) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center" onClick={() => setPreviewing(false)}>
        <button className="absolute top-4 right-4 text-white/60 hover:text-white text-sm z-10">Exit Preview</button>
        {activeSlide && (
          <div className="w-[80vw] aspect-video rounded-lg overflow-hidden" style={{ background: (() => { try { const bg = JSON.parse(activeSlide.background || '{}'); return bg.color || '#0a0a0a'; } catch { return '#0a0a0a'; } })() }}>
            <div className="p-12">
              <h1 className="text-4xl font-bold text-white mb-4">{activeSlide.title}</h1>
              <p className="text-xl text-white/80 whitespace-pre-wrap">{activeSlide.body_text}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!presentation) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Presentation not found</div>;
  }

  const selectedElement = selectedElementId && !selectedElementId.startsWith('__') ? elements.find(e => e.id === selectedElementId) : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <EditorToolbar
        saving={saving}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        hasSelection={!!selectedElement}
        presentationTitle={presentation.title}
        mode={mode}
        onSave={saveAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleMode={setMode}
        onExport={handleExport}
        onRegenerateSlide={handleRegenerateSlide}
        onRegenerateElement={handleRegenerateElement}
        onRunQA={handleRunQA}
        onAddElement={handleAddElement}
      />

      <div className="flex flex-1 overflow-hidden">
        <SlideThumbnailSidebar
          slides={slides}
          activeIndex={activeIndex}
          onSelect={handleSelectSlide}
          onReorder={() => {}}
          onAdd={handleAddSlide}
          onDuplicate={handleDuplicateSlide}
          onDelete={handleDeleteSlide}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <SlideCanvas
            slide={activeSlide}
            elements={elements}
            selectedElementId={selectedElementId}
            zoom={zoom}
            previewMode={mode === 'preview'}
            onSelectElement={handleSelectElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onCanvasAction={handleCanvasAction}
          />

          <SlideTimeline
            slide={activeSlide}
            elements={elements}
            currentTime={currentTime}
            onScrub={setCurrentTime}
          />

          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            totalTime={totalTime}
            scope={playbackScope}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onStop={() => { setIsPlaying(false); setCurrentTime(0); }}
            onRestart={() => { setCurrentTime(0); setIsPlaying(true); }}
            onPrev={() => { if (activeIndex > 0) handleSelectSlide(activeIndex - 1); }}
            onNext={() => { if (activeIndex < slides.length - 1) handleSelectSlide(activeIndex + 1); }}
            onScrub={setCurrentTime}
            onScopeChange={setPlaybackScope}
          />
        </div>

        <InspectorPanel
          slide={activeSlide}
          selectedElement={selectedElement}
          selectedType={selectedElementId}
          onUpdateSlide={handleUpdateSlide}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onRegenerateElement={handleRegenerateElement}
        />
      </div>
    </div>
  );
}