import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  FileText, AlignLeft, MessageSquare, Type, Heading,
  Image, ImageIcon, Eye, Film, Share2, CheckSquare, Volume2,
  Sparkles, Loader2, Clock, ExternalLink, Save, CheckCircle,
  StickyNote, BookMarked, MessageSquareCode, Cpu, Download, RefreshCw,
  Music, Mic2, ChefHat, BookOpen, Lightbulb, ListOrdered
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopPackageWorkspace from '@/components/production/DesktopPackageWorkspace';
import MobilePackageWorkspace from '@/components/production/mobile/MobilePackageWorkspace';
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

export default function PackageWorkspace({ article, pkg, onPackageUpdate, onPackageApproved, onBack }) {
  const isMobile = useIsMobile();
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

  // Mobile stage-specific loading states
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [generatingMedia, setGeneratingMedia] = useState(false);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);

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
      } catch { /* */ }
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
      const updated = await callGenerate(assetDefs.map(a => a.key));
      onPackageUpdate(updated);
      logActivity('generate', {
        entity_type: 'ProductionPackage',
        entity_id: updated?.id || '',
        entity_name: article.title,
        details: `Generated full package (${updated?.tone || 'professional'}, ${updated?.reading_style || 'broadcast_news'})`,
      });

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
          const withAudio = await base44.entities.ProductionPackage.update(updated.id, { generated_audio_url: audioUrl, voice_package_id: vpResult?.data?.voice_package_id || updated.voice_package_id });
          onPackageUpdate(withAudio);
        }
      } catch (err) { console.error('Voiceover generation failed:', err); }

      setMediaStep('thumbnail');
      try {
        const thumbResult = await base44.integrations.Core.GenerateImage({ prompt: updated.thumbnail_prompt });
        const thumbUrl = thumbResult?.url || thumbResult?.data?.url;
        if (thumbUrl) {
          const withThumb = await base44.entities.ProductionPackage.update(updated.id, { generated_thumbnail_url: thumbUrl });
          onPackageUpdate(withThumb);
        }
      } catch (err) { console.error('Thumbnail generation failed:', err); }

      setMediaStep('story_image');
      try {
        const imgResult = await base44.integrations.Core.GenerateImage({ prompt: updated.image_prompt });
        const imgUrl = imgResult?.url || imgResult?.data?.url;
        if (imgUrl) {
          const withImg = await base44.entities.ProductionPackage.update(updated.id, { generated_image_url: imgUrl });
          onPackageUpdate(withImg);
        }
      } catch (err) { console.error('Story image generation failed:', err); }

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

  // Mobile stage handler: regenerate a group of assets in one call
  const handleRegenerateAssets = async (assetKeys) => {
    setGenerating('group');
    try {
      const updated = await callGenerate(assetKeys);
      onPackageUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(null);
    }
  };

  // Mobile stage handler: generate only the voice package
  const handleGenerateVoice = async () => {
    if (!pkg) return;
    setGeneratingVoice(true);
    try {
      const vpResult = await base44.functions.invoke('generateVoicePackage', {
        script_text: pkg[scriptField],
        voice: 'river',
        language_code: 'en',
        source_type: 'production_package',
        source_id: pkg.id,
      });
      const audioUrl = vpResult?.data?.audio_url;
      if (audioUrl) {
        const withAudio = await base44.entities.ProductionPackage.update(pkg.id, { generated_audio_url: audioUrl, voice_package_id: vpResult?.data?.voice_package_id || pkg.voice_package_id });
        onPackageUpdate(withAudio);
      }
    } catch (err) {
      console.error('Voice generation failed:', err);
    } finally {
      setGeneratingVoice(false);
    }
  };

  // Mobile stage handler: generate only media (thumbnail, image, video)
  const handleGenerateMedia = async () => {
    if (!pkg) return;
    setGeneratingMedia(true);
    try {
      try {
        const thumbResult = await base44.integrations.Core.GenerateImage({ prompt: pkg.thumbnail_prompt });
        const thumbUrl = thumbResult?.url || thumbResult?.data?.url;
        if (thumbUrl) { const u = await base44.entities.ProductionPackage.update(pkg.id, { generated_thumbnail_url: thumbUrl }); onPackageUpdate(u); }
      } catch (err) { console.error('Thumbnail generation failed:', err); }
      try {
        const imgResult = await base44.integrations.Core.GenerateImage({ prompt: pkg.image_prompt });
        const imgUrl = imgResult?.url || imgResult?.data?.url;
        if (imgUrl) { const u = await base44.entities.ProductionPackage.update(pkg.id, { generated_image_url: imgUrl }); onPackageUpdate(u); }
      } catch (err) { console.error('Story image generation failed:', err); }
      try {
        const vidResult = await base44.integrations.Core.GenerateVideo({ prompt: pkg.image_prompt, duration: 6, aspect_ratio: '16:9' });
        const vidUrl = vidResult?.url || vidResult?.data?.url;
        if (vidUrl) { const u = await base44.entities.ProductionPackage.update(pkg.id, { generated_video_url: vidUrl }); onPackageUpdate(u); }
      } catch (err) { console.error('Video generation failed:', err); }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingMedia(false);
    }
  };

  // Mobile stage handler: generate presentation via APD
  const handleGeneratePresentation = async () => {
    if (!pkg) return;
    setGeneratingPresentation(true);
    try {
      await base44.functions.invoke('generateNewsPresentation', { package_ids: [pkg.id] });
    } catch (err) {
      console.error('Presentation generation failed:', err);
    } finally {
      setGeneratingPresentation(false);
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
    if (onPackageApproved) onPackageApproved(article, updated);
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

  const sharedProps = {
    article, pkg, onPackageUpdate,
    config, setConfig,
    generating, generatingAll, mediaStep,
    edits, handleAssetChange, handleSaveAll, saving, hasEdits,
    handleGenerateAll, handleRegenerate, handleRegenerateAssets,
    handleApprove, handleQuickExport,
    handleGenerateVoice, generatingVoice,
    handleGenerateMedia, generatingMedia,
    handleGeneratePresentation, generatingPresentation,
    selectedDomain, setSelectedDomain, contentDomains,
    promptTemplates, selectedTemplateId, setSelectedTemplateId,
    customPrompt, setCustomPrompt, showPromptEditor, setShowPromptEditor,
    preferredTextModel, activeDomainConfig, assetDefs, scriptField,
  };

  if (isMobile) {
    return <MobilePackageWorkspace {...sharedProps} onBack={onBack} />;
  }
  return <DesktopPackageWorkspace {...sharedProps} />;
}