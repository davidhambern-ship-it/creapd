import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import MediaGenerator from '@/components/production/MediaGenerator';
import {
  Loader2, ImageIcon, Film, Volume2, Wand2, Sparkles, FileText
} from 'lucide-react';

const MEDIA_CENTER_FIELDS = {
  story_summary: 'Teleprompter Script',
  talking_points: 'Talking Points',
  image_prompt: 'Image Prompt',
  thumbnail_prompt: 'Thumbnail Prompt',
  visual_suggestions: 'Visual Suggestions',
  broll_suggestions: 'B-Roll Suggestions',
  social_caption: 'Social Caption',
  fact_check_notes: 'Fact Check Notes'
};

const STEPS = [
  { key: 'voiceover', label: 'Voiceover', icon: Volume2 },
  { key: 'thumbnail', label: 'Thumbnail', icon: ImageIcon },
  { key: 'story_image', label: 'Story Image', icon: ImageIcon },
  { key: 'video', label: 'Video', icon: Film },
];

export default function PointMediaGenerator({ pkg, point, onMediaUpdate }) {
  const [generatingAll, setGeneratingAll] = useState(false);
  const [mediaStep, setMediaStep] = useState(null);

  if (!pkg) return null;

  const hasMedia = pkg.generated_audio_url || pkg.generated_thumbnail_url || pkg.generated_image_url || pkg.generated_video_url;

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    setMediaStep('voiceover');
    try {
      if (pkg.story_summary) {
        try {
          const vpResult = await base44.functions.invoke('generateVoicePackage', {
            script_text: pkg.story_summary,
            voice: 'river',
            language_code: 'en',
            source_type: 'production_package',
            source_id: pkg.id,
          });
          const audioUrl = vpResult?.data?.audio_url;
          if (audioUrl) {
            const updated = await base44.entities.ProductionPackage.update(pkg.id, {
              generated_audio_url: audioUrl,
              voice_package_id: vpResult?.data?.voice_package_id || pkg.voice_package_id
            });
            onMediaUpdate(updated);
          }
        } catch (err) { console.error('Voiceover failed:', err); }
      }

      setMediaStep('thumbnail');
      if (pkg.thumbnail_prompt) {
        try {
          const thumbResult = await base44.integrations.Core.GenerateImage({ prompt: pkg.thumbnail_prompt });
          const thumbUrl = thumbResult?.url || thumbResult?.data?.url;
          if (thumbUrl) {
            const updated = await base44.entities.ProductionPackage.update(pkg.id, { generated_thumbnail_url: thumbUrl });
            onMediaUpdate(updated);
          }
        } catch (err) { console.error('Thumbnail failed:', err); }
      }

      setMediaStep('story_image');
      if (pkg.image_prompt) {
        try {
          const imgResult = await base44.integrations.Core.GenerateImage({ prompt: pkg.image_prompt });
          const imgUrl = imgResult?.url || imgResult?.data?.url;
          if (imgUrl) {
            const updated = await base44.entities.ProductionPackage.update(pkg.id, { generated_image_url: imgUrl });
            onMediaUpdate(updated);
          }
        } catch (err) { console.error('Story image failed:', err); }
      }

      setMediaStep('video');
      if (pkg.image_prompt) {
        try {
          const vidResult = await base44.integrations.Core.GenerateVideo({ prompt: pkg.image_prompt, duration: 6, aspect_ratio: '16:9' });
          const vidUrl = vidResult?.url || vidResult?.data?.url;
          if (vidUrl) {
            const updated = await base44.entities.ProductionPackage.update(pkg.id, { generated_video_url: vidUrl });
            onMediaUpdate(updated);
          }
        } catch (err) { console.error('Video failed:', err); }
      }

      setMediaStep('done');
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAll(false);
      setMediaStep(null);
    }
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-white/[0.04]">
      <div className="!flex items-center justify-between mb-3">
        <div className="!flex items-center gap-2">
          <Wand2 className="w-3.5 h-3.5 text-berna-purple" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">AI Generation Center</span>
          {hasMedia && (
            <span className="text-[9px] text-emerald-400 !flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Media Ready
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleGenerateAll}
          disabled={generatingAll}
          className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-7"
        >
          {generatingAll ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
          {generatingAll ? 'Generating...' : 'Generate All'}
        </Button>
      </div>

      {generatingAll && (
        <div className="mb-3 flex flex-wrap gap-3">
          {STEPS.map(step => {
            const stepOrder = STEPS.map(s => s.key);
            const isDone = stepOrder.indexOf(mediaStep) > stepOrder.indexOf(step.key) || mediaStep === 'done';
            const isActive = mediaStep === step.key;
            return (
              <div key={step.key} className={`!flex items-center gap-1 text-[10px] ${isActive ? 'text-primary' : isDone ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {isActive ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : isDone ? '✓' : <step.icon className="w-2.5 h-2.5" />}
                {step.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Package content fields that feed the media generation pipeline */}
      <div className="mb-3 space-y-2">
        {Object.entries(MEDIA_CENTER_FIELDS).map(([key, label]) => {
          const value = key === 'talking_points' ? point?.significance : pkg[key];
          if (!value) return null;
          return (
            <div key={key} className="p-2.5 rounded-md bg-secondary/40 border border-white/[0.03]">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 !flex items-center gap-1">
                <FileText className="w-2.5 h-2.5" />
                {label}
              </p>
              <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">{value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MediaGenerator
          pkg={pkg}
          mediaType="audio"
          promptField="story_summary"
          urlField="generated_audio_url"
          label="AI Voiceover"
          icon={Volume2}
          onMediaUpdate={onMediaUpdate}
        />
        <MediaGenerator
          pkg={pkg}
          mediaType="image"
          promptField="thumbnail_prompt"
          urlField="generated_thumbnail_url"
          label="Thumbnail"
          icon={ImageIcon}
          onMediaUpdate={onMediaUpdate}
        />
        <MediaGenerator
          pkg={pkg}
          mediaType="image"
          promptField="image_prompt"
          urlField="generated_image_url"
          label="Story Image"
          icon={ImageIcon}
          onMediaUpdate={onMediaUpdate}
        />
        <MediaGenerator
          pkg={pkg}
          mediaType="video"
          promptField="image_prompt"
          urlField="generated_video_url"
          label="Video Clip"
          icon={Film}
          onMediaUpdate={onMediaUpdate}
        />
      </div>
    </div>
  );
}