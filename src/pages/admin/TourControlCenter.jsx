import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Clapperboard, Plus, Play, RefreshCw, ChevronLeft, Save, Loader2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NARRATION_ROUTES } from '@/lib/systemNarration';
import { findIconName, VOICE_OPTIONS } from '@/lib/tourIcons';
import { clearTourScriptCache } from '@/hooks/useTourScript';
import TourSceneList from '@/components/tour/TourSceneList';
import TourPreview from '@/components/tour/TourPreview';

export default function TourControlCenter() {
  const [scripts, setScripts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStart, setPreviewStart] = useState(0);
  const [draftScript, setDraftScript] = useState(null);

  const loadScripts = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await base44.entities.TourScript.list('route_path');
      setScripts(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load scripts:', err);
    }
    setIsLoading(false);
  }, [selectedId]);

  useEffect(() => { loadScripts(); }, []);

  // Load scenes when selected script changes
  useEffect(() => {
    if (!selectedId) { setScenes([]); return; }
    (async () => {
      try {
        const script = scripts.find(s => s.id === selectedId);
        setDraftScript(script ? { ...script } : null);
        const list = await base44.entities.TourScene.filter({ tour_script_id: selectedId });
        list.sort((a, b) => (a.scene_order || 0) - (b.scene_order || 0));
        setScenes(list.map(s => ({ ...s, _key: s.id })));
      } catch (err) {
        console.error('Failed to load scenes:', err);
      }
    })();
  }, [selectedId]);

  // ── Seed all hardcoded scripts into the database ──
  const handleSeedAll = async () => {
    setIsSeeding(true);
    try {
      for (const [routePath, scriptData] of Object.entries(NARRATION_ROUTES)) {
        const existing = await base44.entities.TourScript.filter({ route_path: routePath });
        let scriptId;
        if (existing.length > 0) {
          scriptId = existing[0].id;
          await base44.entities.TourScene.deleteMany({ tour_script_id: scriptId });
        } else {
          const created = await base44.entities.TourScript.create({
            route_path: routePath,
            script_name: scriptData.name,
            is_active: true,
            default_voice: 'storm',
          });
          scriptId = created.id;
        }
        const sceneEntities = scriptData.scenes.map((s, i) => ({
          tour_script_id: scriptId,
          scene_order: i,
          scene_id: s.id || `scene-${i}`,
          text: s.text,
          speech_text: s.speech || s.text,
          visual_type: s.visual || 'reveal',
          icon_name: findIconName(s.icon),
          icon_color: s.color || 'text-berna-purple',
          font_style: 'heading',
          voice_override: '',
        }));
        if (sceneEntities.length > 0) {
          await base44.entities.TourScene.bulkCreate(sceneEntities);
        }
      }
      clearTourScriptCache();
      await loadScripts();
    } catch (err) {
      console.error('Seed error:', err);
    }
    setIsSeeding(false);
  };

  // ── Scene CRUD ──
  const handleSceneChange = (index, field, value) => {
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSceneDelete = async (index) => {
    const scene = scenes[index];
    setScenes(prev => prev.filter((_, i) => i !== index));
    if (scene.id && !scene._isNew) {
      try { await base44.entities.TourScene.delete(scene.id); } catch {}
    }
  };

  const handleSceneAdd = () => {
    setScenes(prev => [...prev, {
      _key: `new-${Date.now()}`,
      _isNew: true,
      tour_script_id: selectedId,
      scene_order: prev.length,
      scene_id: `scene-${prev.length}`,
      text: 'New scene text',
      speech_text: '',
      visual_type: 'reveal',
      icon_name: 'Sparkles',
      icon_color: 'text-berna-purple',
      font_style: 'heading',
      voice_override: '',
    }]);
  };

  const handleReorder = (from, to) => {
    setScenes(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((s, i) => ({ ...s, scene_order: i }));
    });
  };

  // ── Save all scene changes ──
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update script meta
      if (draftScript) {
        await base44.entities.TourScript.update(selectedId, {
          script_name: draftScript.script_name,
          route_path: draftScript.route_path,
          default_voice: draftScript.default_voice,
          is_active: draftScript.is_active,
          description: draftScript.description,
        });
      }
      // Save scenes
      for (const scene of scenes) {
        const payload = {
          tour_script_id: selectedId,
          scene_order: scene.scene_order,
          scene_id: scene.scene_id,
          text: scene.text,
          speech_text: scene.speech_text,
          visual_type: scene.visual_type,
          icon_name: scene.icon_name,
          icon_color: scene.icon_color,
          font_style: scene.font_style,
          voice_override: scene.voice_override,
        };
        if (scene._isNew || !scene.id) {
          await base44.entities.TourScene.create(payload);
        } else {
          await base44.entities.TourScene.update(scene.id, payload);
        }
      }
      clearTourScriptCache(draftScript?.route_path);
      // Reload
      const list = await base44.entities.TourScene.filter({ tour_script_id: selectedId });
      list.sort((a, b) => (a.scene_order || 0) - (b.scene_order || 0));
      setScenes(list.map(s => ({ ...s, _key: s.id })));
    } catch (err) {
      console.error('Save error:', err);
    }
    setIsSaving(false);
  };

  const handlePreview = (index) => {
    setPreviewStart(index);
    setPreviewOpen(true);
  };

  const selectedScript = scripts.find(s => s.id === selectedId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-muted-foreground hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center glow-purple">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">Tour Control Center</h1>
              <p className="text-xs text-muted-foreground">Fully edit guided tour scripts, visuals, voices & fonts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSeedAll} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Seed All from Defaults
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Script List */}
        <div className="w-72 shrink-0 space-y-2">
          <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60 px-1 pb-2">
            Tour Scripts ({scripts.length})
          </p>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : scripts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-muted-foreground mb-3">No tour scripts yet.</p>
                <p className="text-xs text-muted-foreground/60">Click "Seed All from Defaults" to import the built-in tours.</p>
              </div>
            ) : (
              scripts.map(script => (
                <button
                  key={script.id}
                  onClick={() => setSelectedId(script.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedId === script.id
                      ? 'bg-white/[0.06] border border-white/[0.1]'
                      : 'border border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate">{script.script_name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{script.route_path}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      script.is_active ? 'bg-berna-emerald/15 text-berna-emerald' : 'bg-white/[0.05] text-muted-foreground'
                    }`}>
                      {script.is_active ? 'Active' : 'Paused'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{script.default_voice || 'storm'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Scene Editor */}
        <div className="flex-1 min-w-0">
          {!selectedScript ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Select a tour script to edit, or seed from defaults to get started.
            </div>
          ) : (
            <div>
              {/* Script meta editor */}
              <div className="glass-panel p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Script Name</Label>
                    <Input
                      value={draftScript?.script_name || ''}
                      onChange={e => setDraftScript(prev => ({ ...prev, script_name: e.target.value }))}
                      className="bg-white/[0.03] border-white/[0.08] text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Route Path</Label>
                    <Input
                      value={draftScript?.route_path || ''}
                      onChange={e => setDraftScript(prev => ({ ...prev, route_path: e.target.value }))}
                      className="bg-white/[0.03] border-white/[0.08] text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Default Voice</Label>
                    <Select
                      value={draftScript?.default_voice || 'storm'}
                      onValueChange={v => setDraftScript(prev => ({ ...prev, default_voice: v }))}
                    >
                      <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_OPTIONS.map(v => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      variant={draftScript?.is_active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDraftScript(prev => ({ ...prev, is_active: !prev?.is_active }))}
                      className="w-full"
                    >
                      {draftScript?.is_active ? 'Active' : 'Paused'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scene list + actions */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-heading font-semibold text-white">
                  Scenes ({scenes.length})
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePreview(0)} disabled={scenes.length === 0}>
                    <Play className="w-4 h-4 mr-1" />
                    Preview Tour
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save Changes
                  </Button>
                </div>
              </div>

              <TourSceneList
                scenes={scenes}
                onReorder={handleReorder}
                onChange={handleSceneChange}
                onDelete={handleSceneDelete}
                onAdd={handleSceneAdd}
                onPreview={handlePreview}
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && scenes.length > 0 && (
        <TourPreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          scenes={scenes}
          defaultVoice={draftScript?.default_voice || 'storm'}
          startIndex={previewStart}
        />
      )}
    </div>
  );
}