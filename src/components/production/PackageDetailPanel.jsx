import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  FileText, AlignLeft, MessageSquare, Type, Heading,
  Image, ImageIcon, Eye, Film, Share2, CheckSquare, Volume2,
  Sparkles, Loader2, Clock, ExternalLink, Save, CheckCircle,
  StickyNote, BookMarked, MessageSquareCode, Cpu
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

const ASSET_DEFS = [
  { key: 'teleprompter_script', label: 'Teleprompter Script', icon: FileText },
  { key: 'story_summary', label: 'Story Summary', icon: AlignLeft },
  { key: 'talking_points', label: 'Talking Points', icon: MessageSquare },
  { key: 'lower_third_text', label: 'Lower Third Text', icon: Type },
  { key: 'headline_suggestions', label: 'Headline Suggestions', icon: Heading },
  { key: 'image_prompt', label: 'Image Generation Prompt', icon: Image },
  { key: 'thumbnail_prompt', label: 'Thumbnail Prompt', icon: ImageIcon },
  { key: 'visual_suggestions', label: 'Visual Suggestions', icon: Eye },
  { key: 'broll_suggestions', label: 'B-roll Suggestions', icon: Film },
  { key: 'social_caption', label: 'Social Media Caption', icon: Share2 },
  { key: 'fact_check_notes', label: 'Fact Check Notes', icon: CheckSquare },
];

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
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [preferredTextModel, setPreferredTextModel] = useState('automatic');

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
  }, []);

  const callGenerate = async (assetTypes) => {
    const params = {
      article_id: article.id,
      asset_types: assetTypes,
      ...config,
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
    try {
      const updated = await callGenerate(ASSET_DEFS.map(a => a.key));
      onPackageUpdate(updated);
      logActivity('generate', {
        entity_type: 'ProductionPackage',
        entity_id: updated?.id || '',
        entity_name: article.title,
        details: `Generated full package (${updated?.tone || 'professional'}, ${updated?.reading_style || 'broadcast_news'})`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAll(false);
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

  return (
    <div className="flex flex-col h-full">
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
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7">
                <ExternalLink className="w-3 h-3 mr-1" />Source
              </Button>
            </a>
          )}
        </div>

        {/* Customization controls */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
            {generatingAll ? 'Generating Package...' : pkg ? 'Regenerate Full Package' : 'Generate Full Package'}
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
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {ASSET_DEFS.map(def => (
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
                promptField="teleprompter_script"
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