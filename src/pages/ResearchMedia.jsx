import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import MediaGenerator from '@/components/production/MediaGenerator';
import {
  Loader2, FlaskConical, ImageIcon, Film, Volume2, Wand2,
  Sparkles, AlertCircle, Package
} from 'lucide-react';

export default function ResearchMedia() {
  const { config, packages, points, loading, refresh } = useResearchProduction();
  const [selectedPkgId, setSelectedPkgId] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [mediaStep, setMediaStep] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <FlaskConical className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  // Map packages to their source points
  const packagesWithPoints = packages.map(pkg => ({
    pkg,
    point: points.find(p => p.id === pkg.source_entity_id)
  })).filter(item => item.point);

  const selectedItem = packagesWithPoints.find(item => item.pkg.id === selectedPkgId) || packagesWithPoints[0];
  const selectedPkg = selectedItem?.pkg;

  const handleMediaUpdate = (updatedPkg) => {
    refresh();
  };

  const handleGenerateAll = async () => {
    if (!selectedPkg) return;
    setGeneratingAll(true);
    setMediaStep('voiceover');
    try {
      // 1. Voiceover
      if (selectedPkg.teleprompter_script) {
        try {
          const vpResult = await base44.functions.invoke('generateVoicePackage', {
            script_text: selectedPkg.teleprompter_script,
            voice: 'river',
            language_code: 'en',
            source_type: 'production_package',
            source_id: selectedPkg.id,
          });
          const audioUrl = vpResult?.data?.audio_url;
          if (audioUrl) {
            await base44.entities.ProductionPackage.update(selectedPkg.id, {
              generated_audio_url: audioUrl,
              voice_package_id: vpResult?.data?.voice_package_id || selectedPkg.voice_package_id
            });
          }
        } catch (err) { console.error('Voiceover failed:', err); }
      }

      // 2. Thumbnail
      setMediaStep('thumbnail');
      if (selectedPkg.thumbnail_prompt) {
        try {
          const thumbResult = await base44.integrations.Core.GenerateImage({ prompt: selectedPkg.thumbnail_prompt });
          const thumbUrl = thumbResult?.url || thumbResult?.data?.url;
          if (thumbUrl) {
            await base44.entities.ProductionPackage.update(selectedPkg.id, { generated_thumbnail_url: thumbUrl });
          }
        } catch (err) { console.error('Thumbnail failed:', err); }
      }

      // 3. Story Image
      setMediaStep('story_image');
      if (selectedPkg.image_prompt) {
        try {
          const imgResult = await base44.integrations.Core.GenerateImage({ prompt: selectedPkg.image_prompt });
          const imgUrl = imgResult?.url || imgResult?.data?.url;
          if (imgUrl) {
            await base44.entities.ProductionPackage.update(selectedPkg.id, { generated_image_url: imgUrl });
          }
        } catch (err) { console.error('Story image failed:', err); }
      }

      // 4. Video
      setMediaStep('video');
      if (selectedPkg.image_prompt) {
        try {
          const vidResult = await base44.integrations.Core.GenerateVideo({ prompt: selectedPkg.image_prompt, duration: 6, aspect_ratio: '16:9' });
          const vidUrl = vidResult?.url || vidResult?.data?.url;
          if (vidUrl) {
            await base44.entities.ProductionPackage.update(selectedPkg.id, { generated_video_url: vidUrl });
          }
        } catch (err) { console.error('Video failed:', err); }
      }

      setMediaStep('done');
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAll(false);
      setMediaStep(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="!flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="!flex items-center gap-2 mb-1">
            <Wand2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-heading font-bold">AI Generation Center</h1>
          </div>
          <p className="text-sm text-muted-foreground">Generate images, voiceovers, thumbnails, and videos from your synthesized package prompts</p>
        </div>
        {selectedPkg && (
          <Button onClick={handleGenerateAll} disabled={generatingAll} className="bg-berna-purple hover:bg-berna-purple/90 text-white">
            {generatingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {generatingAll ? 'Generating...' : 'Generate All Media'}
          </Button>
        )}
      </div>

      {packagesWithPoints.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No packages available. Generate packages from approved Point Cards first.</p>
        </div>
      ) : (
        <div className="!flex flex-col lg:flex-row gap-4">
          {/* Package List */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-2">
            {packagesWithPoints.map(({ pkg, point }) => {
              const isSelected = (selectedPkgId || packagesWithPoints[0]?.pkg.id) === pkg.id;
              const hasMedia = pkg.generated_audio_url || pkg.generated_thumbnail_url || pkg.generated_image_url || pkg.generated_video_url;
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`w-full text-left glass-panel p-3 transition-all ${isSelected ? 'border-primary/40 glow-purple' : 'hover:border-white/[0.12]'}`}
                >
                  <div className="!flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasMedia ? 'bg-emerald-400' : 'bg-muted-foreground/40'} flex-shrink-0`} />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {hasMedia ? 'Media Ready' : 'No Media'}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2 mb-1">{point.title}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{point.topic_title}</p>
                </button>
              );
            })}
          </div>

          {/* Media Generation Workspace */}
          <div className="flex-1 min-w-0">
            {selectedPkg ? (
              <div className="space-y-4">
                {/* Package Info */}
                <div className="glass-panel p-4">
                  <div className="!flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-primary" />
                    <h3 className="font-heading font-semibold text-sm">{selectedItem.point.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedItem.point.topic_title}</p>
                  {selectedPkg.estimated_runtime && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mt-2 inline-block">
                      {selectedPkg.estimated_runtime}
                    </span>
                  )}
                </div>

                {/* Generating All Progress */}
                {generatingAll && (
                  <div className="glass-panel p-4">
                    <div className="!flex items-center gap-2 mb-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm font-medium">Generating all media...</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { key: 'voiceover', label: 'Voiceover', icon: Volume2 },
                        { key: 'thumbnail', label: 'Thumbnail', icon: ImageIcon },
                        { key: 'story_image', label: 'Story Image', icon: ImageIcon },
                        { key: 'video', label: 'Video', icon: Film },
                      ].map(step => {
                        const isDone = ['thumbnail', 'story_image', 'video', 'done'].indexOf(mediaStep) >
                          ['voiceover', 'thumbnail', 'story_image', 'video'].indexOf(step.key);
                        const isActive = mediaStep === step.key;
                        return (
                          <div key={step.key} className={`!flex items-center gap-2 text-xs ${isActive ? 'text-primary' : isDone ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                            {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? '✓' : <step.icon className="w-3 h-3" />}
                            {step.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Media Generators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaGenerator
                    pkg={selectedPkg}
                    mediaType="audio"
                    promptField="teleprompter_script"
                    urlField="generated_audio_url"
                    label="AI Voiceover"
                    icon={Volume2}
                    onMediaUpdate={handleMediaUpdate}
                  />
                  <MediaGenerator
                    pkg={selectedPkg}
                    mediaType="image"
                    promptField="thumbnail_prompt"
                    urlField="generated_thumbnail_url"
                    label="Thumbnail Image"
                    icon={ImageIcon}
                    onMediaUpdate={handleMediaUpdate}
                  />
                  <MediaGenerator
                    pkg={selectedPkg}
                    mediaType="image"
                    promptField="image_prompt"
                    urlField="generated_image_url"
                    label="Story Image"
                    icon={ImageIcon}
                    onMediaUpdate={handleMediaUpdate}
                  />
                  <MediaGenerator
                    pkg={selectedPkg}
                    mediaType="video"
                    promptField="image_prompt"
                    urlField="generated_video_url"
                    label="Video Clip"
                    icon={Film}
                    onMediaUpdate={handleMediaUpdate}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-panel p-12 text-center h-full !flex flex-col items-center justify-center">
                <Package className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a package to generate media</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}