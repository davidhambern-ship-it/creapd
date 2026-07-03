import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  FileText, AlignLeft, MessageSquare, Type, Heading,
  Image, ImageIcon, Eye, Film, Share2, CheckSquare, Volume2,
  Sparkles, Loader2, Clock, ExternalLink, Save, CheckCircle,
  StickyNote, BookMarked, MessageSquareCode, Cpu, Download,
  Music, Mic2, ChefHat, BookOpen, Lightbulb, ListOrdered
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import CategoryBadge from '@/components/shared/CategoryBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';
import AssetEditor from '@/components/production/AssetEditor';
import MediaGenerator from '@/components/production/MediaGenerator';
import TranslationPanel from '@/components/production/TranslationPanel';
import { logActivity } from '@/lib/activityUtils';

const ALL_ASSET_DEFS = {
  teleprompter_script: { label: 'Teleprompter Script', icon: FileText },
  show_script: { label: 'Show Script', icon: FileText },
  story_summary: { label: 'Story Summary', icon: AlignLeft },
  talking_points: { label: 'Talking Points', icon: MessageSquare },
  lower_third_text: { label: 'Lower Third Text', icon: Type },
  headline_suggestions: { label: 'Headline Suggestions', icon: Heading },
  image_prompt: { label: 'Image Generation Prompt', icon: Image },
  thumbnail_prompt: { label: 'Thumbnail Prompt', icon: ImageIcon },
  visual_suggestions: { label: 'Visual Suggestions', icon: Eye },
  broll_suggestions: { label: 'B-roll Suggestions', icon: Film },
  social_caption: { label: 'Social Media Caption', icon: Share2 },
  fact_check_notes: { label: 'Fact Check Notes', icon: CheckSquare },
  artist_facts: { label: 'Artist Facts', icon: Mic2 },
  playlist_segment: { label: 'Playlist Segment', icon: Music },
  cooking_notes: { label: 'Cooking Notes', icon: ChefHat },
  ingredient_list: { label: 'Ingredient List', icon: ListOrdered },
  scripture_references: { label: 'Scripture References', icon: BookOpen },
  reflection_notes: { label: 'Reflection Notes', icon: Lightbulb },
};

const TONES = ['professional', 'conversational', 'energetic', 'serious', 'investigative', 'educational', 'inspirational', 'neutral', 'urgent', 'humorous'];
const READING_STYLES = ['broadcast_news', 'podcast', 'livestream', 'interview', 'documentary', 'educational_presentation', 'corporate_communication', 'storytelling'];
const AUDIENCES = ['General Public', 'Local Community', 'National Audience', 'Business Professionals', 'Students', 'Families', 'Church Congregations', 'Sports Fans', 'Industry Professionals'];
const RUNTIMES = ['15 Seconds', '30 Seconds', '45 Seconds', '1 Minute', '2 Minutes', '5 Minutes', 'Custom'];

export default function PackageDetailPanel({ article, pkg, onPackageUpdate }) {
  const [config, setConfig] = useState({
    tone: pkg?.tone || 'professional',
    reading_style: pkg?.reading_style || 'broadcast_news',
    audience: pkg?.audience || 'General Public',
    target_runtime: pkg?.target_runtime || '1 Minute',
  });
  const [generating, setGenerating] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [mediaStep, setMediaStep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [preferredTextModel, setPreferredTextModel] = useState('automatic');
  const [contentDomains, setContentDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('news');
  const [activeDomainConfig, setActiveDomainConfig] = useState(null);

  useEffect(() => {
    if (pkg) {
      setConfig({
        tone: pkg.tone || 'professional',
        reading_style: pkg.reading_style || 'broadcast_news',
        audience: pkg.audience || 'General Public',
        target_runtime: pkg.target_runtime || '1 Minute',
      });
      setSelectedTemplateId(pkg.prompt_template_id || '');
      setCustomPrompt(pkg.custom_prompt || '');
    }
  }, [pkg?.id]);

  useEffect(() => {
    base44.entities.PromptTemplate.filter({ is_active: true }, '-created_date', 50).then(setPromptTemplates).catch(() => {});
    base44.entities.ProducerSettings.filter({}, '-created_date', 1).then(res => {
      if (res.length > 0) setPreferredTextModel(res[0].preferred_text_model || 'automatic');
    }).catch(() => {});
    base44.entities.ContentDomain.list().then(d => setContentDomains(d.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))).catch(() => {});
  }, []);

  useEffect(() => {
    const domain = contentDomains.find(d => d.domain_key === selectedDomain);
    setActiveDomainConfig(domain || null);
  }, [selectedDomain, contentDomains]);

  const assetDefs = useMemo(() => {
    let keys;
    if (activeDomainConfig?.asset_types) {
      try { keys = JSON.parse(activeDomainConfig.asset_types); } catch { keys = null; }
    }
    if (!keys || !Array.isArray(keys)) {
      keys = ['teleprompter_script', 'story_summary', 'talking_points', 'lower_third_text', 'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions', 'broll_suggestions', 'social_caption', 'fact_check_notes'];
    }
    return keys.map(k => ({ key: k, label: ALL_ASSET_DEFS[k]?.label || k.replace(/_/g, ' '), icon: ALL_ASSET_DEFS[k]?.icon || FileText }));
  }, [activeDomainConfig]);

  const scriptField = useMemo(() => {
    if (activeDomainConfig?.asset_types) {
      try {
        const types = JSON.parse(activeDomainConfig.asset_types);
        if (types.includes('show_script')) return 'show_script';
        if (types.includes('teleprompter_script')) return 'teleprompter_script';
      } catch {}
    }
    return 'teleprompter_script';
  }, [activeDomainConfig]);

  const callGenerate = async (assetTypes) => {
    const params = {
      article_id: article.id,
      asset_types: assetTypes,
      ...config,
      content_domain: selectedDomain,
      preferred_text_model: preferredTextModel,
    };
    // PRD 9.12-9.13: Pass custom prompt or prompt template if set
    if (customPrompt.trim()) {
      params.custom_prompt = customPrompt;
    } else if (selectedTemplateId) {
      params.prompt_template_id = selectedTemplateId;
    }
    const res = await base44.functions.invoke('generateProductionPackage', params);
    return res.data.package;
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    setMediaStep(null);
    try {
      // ===== STEP 1: Generate text assets (scripts, prompts, talking points) =====
      const updated = await callGenerate(assetDefs.map(a => a.key));
      onPackageUpdate(updated);
      logActivity('generate', {
        entity_type: 'ProductionPackage',
        entity_id: updated?.id || '',
        entity_name: article.title,
        details: `Generated full package (${updated?.tone || 'professional'}, ${updated?.reading_style || 'broadcast_news'})`,
      });

      // ===== STEP 2: Generate voiceover audio (provides timing via Voice Package) =====
      // This must run first because the VP timing data is the master clock for all downstream media.
      setMediaStep('voiceover');
      try {
        const vpResult = await base44.functions.invoke('generateVoicePackage', {
          script_text: updated[scriptField],
          voice: 'river',
          language_code: 'en',
          source_type: 'production_package',
          source_id: updated.id,
        });
        const audioUrl = vpResult?.data?.audio_url;
        if (audioUrl) {
          const withAudio = await base44.entities.ProductionPackage.update(updated.id, { generated_audio_url: audioUrl });
          onPackageUpdate(withAudio);
        }
      } catch (err) { console.error('Voiceover generation failed:', err); }

      // ===== STEP 3: Generate thumbnail image =====
      setMediaStep('thumbnail');
      try {
        const thumbResult = await base44.integrations.Core.GenerateImage({ prompt: updated.thumbnail_prompt });
        const thumbUrl = thumbResult?.url || thumbResult?.data?.url;
        if (thumbUrl) {
          const withThumb = await base44.entities.ProductionPackage.update(updated.id, { generated_thumbnail_url: thumbUrl });
          onPackageUpdate(withThumb);
        }
      } catch (err) { console.error('Thumbnail generation failed:', err); }

      // ===== STEP 4: Generate story image (visual reference for video) =====
      setMediaStep('story_image');
      try {
        const imgResult = await base44.integrations.Core.GenerateImage({ prompt: updated.image_prompt });
        const imgUrl = imgResult?.url || imgResult?.data?.url;
        if (imgUrl) {
          const withImg = await base44.entities.ProductionPackage.update(updated.id, { generated_image_url: imgUrl });
          onPackageUpdate(withImg);
        }
      } catch (err) { console.error('Story image generation failed:', err); }

      // ===== STEP 5: Generate promo video (uses image prompts + audio timing) =====
      // The video prompt incorporates the visual scene established by the generated images.
      setMediaStep('video');
      try {
        const vidResult = await base44.integrations.Core.GenerateVideo({ prompt: updated.image_prompt, duration: 6, aspect_ratio: '16:9' });
        const vidUrl = vidResult?.url || vidResult?.data?.url;
        if (vidUrl) {
          const withVid = await base44.entities.ProductionPackage.update(updated.id, { generated_video_url: vidUrl });
          onPackageUpdate(withVid);
        }
      } catch (err) { console.error('Video generation failed:', err); }

      setMediaStep('done');
      logActivity('generate', {
        entity_type: 'ProductionPackage',
        entity_id: updated?.id || '',
        entity_name: article.title,
        details: 'Full package generated with automated media chain (voiceover → thumbnail → story image → video)',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAll(false);
      setMediaStep(null);
    }
  };

  const handleRegenerate = async (assetKey) => {
    setGenerating(assetKey);
    try {
      const updated = await callGenerate([assetKey]);
      onPackageUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(null);
    }
  };

  const handleAssetChange = (key, value) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    if (!pkg || Object.keys(edits).length === 0) return;
    setSaving(true);
    try {
      const updated = await base44.entities.ProductionPackage.update(pkg.id, { ...edits, status: 'edited', is_edited: true });
      onPackageUpdate(updated);
      setEdits({});
      logActivity('update', {
        entity_type: 'ProductionPackage',
        entity_id: pkg.id,
        entity_name: article.title,
        details: `Edited ${Object.keys(edits).length} asset(s): ${Object.keys(edits).join(', ')}`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!pkg) return;
    const updated = await base44.entities.ProductionPackage.update(pkg.id, { status: 'approved' });
    onPackageUpdate(updated);
    logActivity('approve', {
      entity_type: 'ProductionPackage',
      entity_id: pkg.id,
      entity_name: article.title,
      details: 'Package approved for production',
    });
  };

  const hasEdits = Object.keys(edits).length > 0;

  const handleQuickExport = async () => {
    if (!pkg) return;
    const { generatePDF, downloadPDF, sanitizeFilename } = await import('@/lib/exportUtils');
    const assets = new Set([scriptField, 'story_summary', 'talking_points', 'lower_third_text']);
    const filename = `${sanitizeFilename(article.title)}.pdf`;
    const doc = await generatePDF(pkg, article, assets, true, null);
    downloadPDF(doc, filename);
    await base44.entities.ExportLog.create({ package_ids: pkg.id, format: 'pdf', file_name: filename, asset_count: 4, status: 'success' });
    logActivity('export', {
      entity_type: 'ExportLog',
      entity_name: `PDF quick export — ${article.title}`,
      details: `Quick exported package as PDF from Production page`,
    });
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="glass-panel p-4 mb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white leading-snug mb-2">{article.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {article.category && <CategoryBadge category={article.category} />}
              <OpportunityScore score={article.opportunity_score} />
              {article.source_name && <span className="text-[10px] text-muted-foreground">{article.source_name}</span>}
              {pkg?.estimated_runtime && (
                <span className="text-[10px] text-berna-emerald flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />{pkg.estimated_runtime}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {pkg && (
              <Button
                size="sm"
                variant="ghost"
                className="text-berna-purple hover:text-berna-purple hover:bg-berna-purple/10 text-xs h-7"
                onClick={() => handleQuickExport()}
                disabled={!pkg.teleprompter_script}
                title="Quick export as PDF"
              >
                <Download className="w-3 h-3 mr-1" />Export
              </Button>
            )}
            {article.url && (
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7">
                  <ExternalLink className="w-3 h-3 mr-1" />Source
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Customization controls */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">{contentDomains.map(d => <SelectItem key={d.domain_key} value={d.domain_key} className="text-xs">{d.display_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={config.tone} onValueChange={v => setConfig(p => ({ ...p, tone: v }))}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Tone" /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">{TONES.map(t => <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={config.reading_style} onValueChange={v => setConfig(p => ({ ...p, reading_style: v }))}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Style" /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">{READING_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={config.audience} onValueChange={v => setConfig(p => ({ ...p, audience: v }))}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Audience" /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">{AUDIENCES.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={config.target_runtime} onValueChange={v => setConfig(p => ({ ...p, target_runtime: v }))}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Runtime" /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">{RUNTIMES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* PRD 9.12-9.13: Prompt Template & Custom Prompt */}
        <div className="mt-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquareCode className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-[10px] font-semibold text-white">Prompt Template</span>
            <span className="text-[9px] text-muted-foreground">— edit or override the AI prompt before generation</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTemplateId || 'none'} onValueChange={v => { setSelectedTemplateId(v === 'none' ? '' : v); setCustomPrompt(''); }}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8 flex-1"><SelectValue placeholder="Default system prompt" /></SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="none" className="text-xs">Default system prompt</SelectItem>
                {promptTemplates.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-[10px] border-white/10 text-white hover:bg-white/[0.04]" onClick={() => setShowPromptEditor(!showPromptEditor)}>
              {showPromptEditor ? 'Hide' : 'Custom'}
            </Button>
          </div>
          {showPromptEditor && (
            <div className="space-y-1.5">
              <p className="text-[9px] text-muted-foreground">Write a custom prompt. Use variables: {'{title}'}, {'{summary}'}, {'{tone}'}, {'{audience}'}</p>
              <Textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Leave empty to use the default or selected template prompt..."
                className="bg-white/[0.02] border-white/[0.06] text-white text-[10px] min-h-20 font-mono resize-y"
              />
              {customPrompt && <p className="text-[9px] text-berna-emerald">Custom prompt active — overrides template and default</p>}
            </div>
          )}
          {/* PRD 9.8: AI Provider display */}
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <Cpu className="w-3 h-3" />
            <span>Text model: <span className="text-white">{preferredTextModel}</span></span>
          </div>
        </div>

        {/* PRD 9.21: AI Transparency badges */}
        {pkg?.generated_at && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[9px] text-muted-foreground">AI:</span>
            <span className="text-[9px] text-berna-purple bg-berna-purple/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Cpu className="w-2.5 h-2.5" />{pkg.generation_provider || 'automatic'}
            </span>
            <span className="text-[9px] text-muted-foreground bg-white/[0.04] px-1.5 py-0.5 rounded">
              {new Date(pkg.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {pkg.is_regenerated && <span className="text-[9px] text-berna-orange bg-berna-orange/10 px-1.5 py-0.5 rounded">Regenerated ×{pkg.generation_count || 1}</span>}
            {pkg.is_edited && <span className="text-[9px] text-berna-emerald bg-berna-emerald/10 px-1.5 py-0.5 rounded">Edited</span>}
            {pkg.translation_language && <span className="text-[9px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Translated</span>}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button
            size="sm"
            className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8"
            onClick={handleGenerateAll}
            disabled={generatingAll || generating !== null}
          >
            {generatingAll ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {generatingAll
              ? (mediaStep === 'voiceover' ? 'Generating Voiceover...'
                : mediaStep === 'thumbnail' ? 'Generating Thumbnail...'
                : mediaStep === 'story_image' ? 'Generating Story Image...'
                : mediaStep === 'video' ? 'Generating Promo Video...'
                : 'Generating Package...')
              : pkg ? 'Regenerate Full Package' : 'Generate Full Package'}
          </Button>
          {hasEdits && (
            <Button size="sm" variant="outline" className="border-white/10 text-white text-xs h-8 hover:bg-white/[0.04]" onClick={handleSaveAll} disabled={saving}>
              <Save className="w-3 h-3 mr-1" />{saving ? 'Saving...' : `Save Changes (${Object.keys(edits).length})`}
            </Button>
          )}
          {pkg && pkg.status !== 'approved' && (
            <Button size="sm" variant="outline" className="border-berna-emerald/20 text-berna-emerald text-xs h-8 hover:bg-berna-emerald/10" onClick={handleApprove}>
              <CheckCircle className="w-3 h-3 mr-1" />Approve Package
            </Button>
          )}
          {pkg?.status === 'approved' && (
            <span className="text-[10px] text-berna-emerald flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />Approved</span>
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="space-y-3 pr-1">
        {assetDefs.map(def => (
          <AssetEditor
            key={def.key}
            assetKey={def.key}
            label={def.label}
            icon={def.icon}
            value={pkg?.[def.key] || ''}
            onChange={handleAssetChange}
            onRegenerate={handleRegenerate}
            generating={generating}
          />
        ))}

        {/* Producer Notes — manual, no AI generation (PRD 7.4) */}
        <AssetEditor
          assetKey="producer_notes"
          label="Producer Notes"
          icon={StickyNote}
          value={pkg?.producer_notes || ''}
          onChange={handleAssetChange}
          onRegenerate={handleRegenerate}
          generating={generating}
          manual
        />

        {/* Source References (PRD 7.18) */}
        <div className="glass-panel overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
            <BookMarked className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-xs font-semibold text-white">Source References</span>
          </div>
          <div className="p-3 space-y-1.5">
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground w-28 flex-shrink-0">Original Source</span>
              <span className="text-white">{article.source_name || '—'}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground w-28 flex-shrink-0">Publication</span>
              <span className="text-white">{article.publication || '—'}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground w-28 flex-shrink-0">Publication Date</span>
              <span className="text-white">{article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground w-28 flex-shrink-0">Article Link</span>
              {article.url ? (
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-berna-purple hover:underline truncate flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />{article.url}
                </a>
              ) : <span className="text-white">—</span>}
            </div>
            {article.additional_sources && (
              <div className="flex gap-2 text-xs">
                <span className="text-muted-foreground w-28 flex-shrink-0">Additional Sources</span>
                <span className="text-white whitespace-pre-wrap">{article.additional_sources}</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Media Generation */}
        {pkg && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Sparkles className="w-3.5 h-3.5 text-berna-orange" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">AI Media Generation</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MediaGenerator
                pkg={pkg}
                mediaType="image"
                promptField="thumbnail_prompt"
                urlField="generated_thumbnail_url"
                label="Thumbnail Image"
                icon={ImageIcon}
                onMediaUpdate={onPackageUpdate}
              />
              <MediaGenerator
                pkg={pkg}
                mediaType="image"
                promptField="image_prompt"
                urlField="generated_image_url"
                label="Story Image"
                icon={Image}
                onMediaUpdate={onPackageUpdate}
              />
              <MediaGenerator
                pkg={pkg}
                mediaType="audio"
                promptField={scriptField}
                urlField="generated_audio_url"
                label="Voiceover Audio"
                icon={Volume2}
                onMediaUpdate={onPackageUpdate}
              />
              <MediaGenerator
                pkg={pkg}
                mediaType="video"
                promptField="image_prompt"
                urlField="generated_video_url"
                label="Promo Video"
                icon={Film}
                onMediaUpdate={onPackageUpdate}
              />
            </div>
          </div>
        )}

        {/* PRD 9.19: Translation */}
        {pkg && (
          <div className="pt-2">
            <TranslationPanel pkg={pkg} onPackageUpdate={onPackageUpdate} />
          </div>
        )}
      </div>
    </div>
  );
}