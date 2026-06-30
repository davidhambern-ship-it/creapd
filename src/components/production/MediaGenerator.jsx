import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Download, RefreshCw, Volume2, Film, ImageIcon, Play,
  Pencil, Check, X, Trash2, Copy, History, Cpu, Clock, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VOICES = [
  { value: 'river', label: 'River — Calm, neutral' },
  { value: 'honey', label: 'Honey — Warm, soft' },
  { value: 'sunny', label: 'Sunny — Bright, upbeat' },
  { value: 'storm', label: 'Storm — Formal, authoritative' },
  { value: 'spark', label: 'Spark — Energetic, quick' },
];

export default function MediaGenerator({ pkg, mediaType, promptField, urlField, label, icon: Icon, onMediaUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [voice, setVoice] = useState('river');
  const [error, setError] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const [showVariations, setShowVariations] = useState(false);

  const prompt = pkg?.[promptField] || '';
  const mediaUrl = pkg?.[urlField] || '';

  // PRD 9.15: Parse image variations from stored JSON string
  const variations = (() => {
    const field = mediaType === 'image' && urlField === 'generated_thumbnail_url' ? 'thumbnail_variations' : 'image_variations';
    try { return JSON.parse(pkg?.[field] || '[]'); } catch { return []; }
  })();

  const handleGenerate = async (customPrompt) => {
    const usePrompt = customPrompt !== undefined ? customPrompt : prompt;
    if (!usePrompt && mediaType !== 'audio') {
      setError(`Generate the ${promptField.replace(/_/g, ' ')} first.`);
      return;
    }
    if (mediaType === 'audio' && !pkg?.teleprompter_script) {
      setError('Generate the teleprompter script first.');
      return;
    }
    setGenerating(true);
    setError(null);
    setEditingPrompt(false);
    try {
      let result;
      if (mediaType === 'image') {
        result = await base44.integrations.Core.GenerateImage({ prompt: usePrompt });
      } else if (mediaType === 'video') {
        result = await base44.integrations.Core.GenerateVideo({ prompt: usePrompt, duration: 6, aspect_ratio: '16:9' });
      } else if (mediaType === 'audio') {
        result = await base44.integrations.Core.GenerateSpeech({
          text: pkg.teleprompter_script,
          voice,
          language_code: 'en',
        });
      }
      const url = result?.url || result?.data?.url;
      if (!url) throw new Error('No URL returned');

      // PRD 9.15: Store variation history for images
      const updateData = { [urlField]: url };
      if (mediaType === 'image' && mediaUrl) {
        const varField = urlField === 'generated_thumbnail_url' ? 'thumbnail_variations' : 'image_variations';
        const existingVars = variations.filter(v => v.url !== mediaUrl);
        updateData[varField] = JSON.stringify([...existingVars, { url: mediaUrl, prompt: usePrompt, created_at: new Date().toISOString() }]);
      }

      const updated = await base44.entities.ProductionPackage.update(pkg.id, updateData);
      onMediaUpdate(updated);

      // PRD 12: Auto-sync generated images to Image Library
      if (mediaType === 'image') {
        const isThumbnail = urlField === 'generated_thumbnail_url';
        try {
          await base44.entities.ImageAsset.create({
            title: `${pkg.story_summary || 'Production'} — ${isThumbnail ? 'Thumbnail' : 'Image'}`,
            image_url: url,
            image_type: isThumbnail ? 'thumbnail' : 'ai_generated',
            source_prompt: usePrompt,
            associated_production_id: pkg.id,
            associated_production_title: pkg.story_summary || '',
            associated_story_id: pkg.article_id,
            approval_status: 'pending',
            file_format: 'png',
            version_number: pkg.generation_count || 1,
          });
        } catch (e) {
          console.error('Image Library sync failed:', e);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // PRD 9.16: Delete generated media
  const handleDelete = async () => {
    const updated = await base44.entities.ProductionPackage.update(pkg.id, { [urlField]: '' });
    onMediaUpdate(updated);
  };

  // PRD 9.15: Select a previous variation as the active image
  const handleSelectVariation = async (varUrl) => {
    const varField = urlField === 'generated_thumbnail_url' ? 'thumbnail_variations' : 'image_variations';
    const remaining = variations.filter(v => v.url !== varUrl);
    const updateData = { [urlField]: varUrl, [varField]: JSON.stringify(remaining) };
    if (mediaUrl) {
      updateData[varField] = JSON.stringify([...remaining, { url: mediaUrl, prompt: prompt, created_at: new Date().toISOString() }]);
    }
    const updated = await base44.entities.ProductionPackage.update(pkg.id, updateData);
    onMediaUpdate(updated);
  };

  const handleSavePrompt = () => {
    base44.entities.ProductionPackage.update(pkg.id, { [promptField]: promptDraft }).then(updated => {
      onMediaUpdate(updated);
      setEditingPrompt(false);
    });
  };

  const handleStartEditPrompt = () => {
    setPromptDraft(prompt);
    setEditingPrompt(true);
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-berna-orange" />
          <span className="text-xs font-semibold text-white">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {mediaUrl && !generating && (
            <>
              {mediaType === 'image' && variations.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04]" onClick={() => setShowVariations(!showVariations)}>
                  <History className="w-3 h-3 mr-1" />{variations.length}
                </Button>
              )}
              <a href={mediaUrl} target="_blank" rel="noopener noreferrer" download>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-berna-orange hover:bg-berna-orange/10">
                  <Download className="w-3 h-3 mr-1" />Save
                </Button>
              </a>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-red-400 hover:bg-red-400/10" onClick={handleDelete}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PRD 9.21: AI Transparency */}
      {mediaUrl && pkg.generated_at && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/[0.02] bg-white/[0.01] flex-wrap">
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <Cpu className="w-2.5 h-2.5" />{pkg.generation_provider || 'automatic'}
          </span>
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />{new Date(pkg.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {pkg.is_regenerated && <span className="text-[9px] text-berna-orange">Regenerated ×{pkg.generation_count || 1}</span>}
          {pkg.is_edited && <span className="text-[9px] text-berna-emerald">Edited</span>}
        </div>
      )}

      <div className="p-3">
        {generating ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 text-berna-orange animate-spin" />
            <span className="text-[10px] text-muted-foreground">
              {mediaType === 'image' ? 'Generating image (5-10s)...' :
               mediaType === 'video' ? 'Generating video (30-60s)...' :
               'Generating audio...'}
            </span>
          </div>
        ) : mediaUrl ? (
          <div className="space-y-2">
            {mediaType === 'image' && (
              <img src={mediaUrl} alt={label} className="w-full rounded-lg border border-white/[0.06]" />
            )}
            {mediaType === 'video' && (
              <video src={mediaUrl} controls className="w-full rounded-lg border border-white/[0.06]" />
            )}
            {mediaType === 'audio' && (
              <audio src={mediaUrl} controls className="w-full" />
            )}

            {/* PRD 9.15: Variation history */}
            {mediaType === 'image' && showVariations && variations.length > 0 && (
              <div className="space-y-1.5 p-2 rounded-lg bg-white/[0.02]">
                <p className="text-[9px] text-muted-foreground font-semibold">Previous Variations ({variations.length})</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {variations.map((v, i) => (
                    <button key={i} onClick={() => handleSelectVariation(v.url)} className="relative group">
                      <img src={v.url} alt={`Variation ${i+1}`} className="w-full aspect-square object-cover rounded border border-white/[0.06] group-hover:border-berna-purple" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded transition-colors flex items-center justify-center">
                        <Copy className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-white hover:bg-white/[0.04] flex-1" onClick={() => handleGenerate()}>
                <RefreshCw className="w-3 h-3 mr-1" />Regenerate
              </Button>
              {mediaType === 'image' && prompt && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-white hover:bg-white/[0.04]" onClick={handleStartEditPrompt}>
                  <Pencil className="w-3 h-3 mr-1" />Edit Prompt
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {mediaType === 'audio' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Voice:</span>
                <select
                  value={voice}
                  onChange={e => setVoice(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.08] text-white text-[10px] rounded-md px-2 py-1 h-7"
                >
                  {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
            )}

            {/* PRD 9.12: Prompt review/editing before generation */}
            {mediaType === 'image' && prompt && !editingPrompt && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-semibold">Prompt</span>
                  <button onClick={handleStartEditPrompt} className="text-[9px] text-berna-purple hover:underline flex items-center gap-0.5">
                    <Pencil className="w-2.5 h-2.5" />Edit
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-3 italic bg-white/[0.02] p-2 rounded">"{prompt.substring(0, 150)}{prompt.length > 150 ? '...' : ''}"</p>
              </div>
            )}

            {/* PRD 9.12: Editable prompt before generation */}
            {mediaType === 'image' && editingPrompt && (
              <div className="space-y-1.5">
                <span className="text-[9px] text-muted-foreground font-semibold">Edit Prompt (9.12)</span>
                <Textarea
                  value={promptDraft}
                  onChange={e => setPromptDraft(e.target.value)}
                  className="bg-white/[0.02] border-white/[0.06] text-white text-[10px] min-h-20 resize-y"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-[10px] bg-berna-purple hover:bg-berna-purple/90 text-white flex-1" onClick={() => handleGenerate(promptDraft)}>
                    <Check className="w-3 h-3 mr-1" />Generate with This Prompt
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-white" onClick={handleSavePrompt}>
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground" onClick={() => setEditingPrompt(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {!editingPrompt && (
              <Button
                size="sm"
                className="bg-berna-orange/90 hover:bg-berna-orange text-white text-xs h-8 w-full"
                onClick={() => handleGenerate()}
                disabled={!prompt && mediaType !== 'audio'}
              >
                <Icon className="w-3 h-3 mr-1" />
                {prompt || (mediaType === 'audio' && pkg?.teleprompter_script) ? `Generate ${label}` : `Need ${promptField.replace(/_/g, ' ')} first`}
              </Button>
            )}
            {error && <p className="text-[10px] text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}