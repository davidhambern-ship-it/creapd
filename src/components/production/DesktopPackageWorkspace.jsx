import React from 'react';
import {
  FileText, AlignLeft, MessageSquare, Type, Heading,
  Image, ImageIcon, Eye, Film, Share2, CheckSquare, Volume2,
  Sparkles, Loader2, Clock, ExternalLink, Save, CheckCircle,
  StickyNote, BookMarked, MessageSquareCode, Cpu, Download, RefreshCw,
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

export default function DesktopPackageWorkspace({
  article, pkg, onPackageUpdate,
  config, setConfig,
  generating, generatingAll, mediaStep,
  edits, handleAssetChange, handleSaveAll, saving, hasEdits,
  handleGenerateAll, handleRegenerate, handleApprove, handleQuickExport,
  selectedDomain, setSelectedDomain, contentDomains,
  promptTemplates, selectedTemplateId, setSelectedTemplateId,
  customPrompt, setCustomPrompt, showPromptEditor, setShowPromptEditor,
  preferredTextModel, activeDomainConfig, assetDefs, scriptField,
}) {
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

        {/* Prompt Template & Custom Prompt */}
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
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <Cpu className="w-3 h-3" />
            <span>Text model: <span className="text-white">{preferredTextModel}</span></span>
          </div>
        </div>

        {/* AI Transparency badges */}
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

        {/* Producer Notes */}
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

        {/* Source References */}
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

        {/* Approve + Regenerate */}
        {pkg && (
          <div className="glass-panel p-3 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground mr-auto">Package ready — approve to send to Production</span>
            <Button
              size="sm"
              className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8"
              onClick={handleGenerateAll}
              disabled={generatingAll || generating !== null}
            >
              {generatingAll ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              {generatingAll ? 'Regenerating...' : 'Regenerate'}
            </Button>
            {pkg.status !== 'approved' ? (
              <Button size="sm" variant="outline" className="border-berna-emerald/20 text-berna-emerald text-xs h-8 hover:bg-berna-emerald/10" onClick={handleApprove}>
                <CheckCircle className="w-3 h-3 mr-1" />Approve Package
              </Button>
            ) : (
              <span className="text-[10px] text-berna-emerald flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />Approved</span>
            )}
          </div>
        )}

        {/* Translation */}
        {pkg && (
          <div className="pt-2">
            <TranslationPanel pkg={pkg} onPackageUpdate={onPackageUpdate} />
          </div>
        )}
      </div>
    </div>
  );
}