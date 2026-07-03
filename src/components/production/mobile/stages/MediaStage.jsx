import React from 'react';
import { Sparkles, Loader2, Image, ImageIcon, Film, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MediaGenerator from '@/components/production/MediaGenerator';
import AssetEditor from '@/components/production/AssetEditor';

const PROMPT_KEYS = ['image_prompt', 'thumbnail_prompt', 'visual_suggestions', 'broll_suggestions'];

export default function MediaStage({ pkg, assetDefs, edits, handleAssetChange, handleRegenerate, generating, handleGenerateMedia, generatingMedia, onPackageUpdate, scriptField }) {
  const promptAssets = assetDefs.filter(a => PROMPT_KEYS.includes(a.key));

  return (
    <div className="space-y-3">
      <Button className="w-full bg-berna-orange/80 hover:bg-berna-orange text-white h-9" onClick={handleGenerateMedia} disabled={generatingMedia || !pkg}>
        {generatingMedia ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        {generatingMedia ? 'Generating Media...' : 'Generate All Media'}
      </Button>

      {pkg?.generated_thumbnail_url && (
        <div className="glass-panel p-2"><img src={pkg.generated_thumbnail_url} alt="Thumbnail" className="w-full rounded-lg" /></div>
      )}
      {pkg?.generated_image_url && (
        <div className="glass-panel p-2"><img src={pkg.generated_image_url} alt="Story" className="w-full rounded-lg" /></div>
      )}
      {pkg?.generated_video_url && (
        <div className="glass-panel p-2"><video src={pkg.generated_video_url} controls className="w-full rounded-lg" /></div>
      )}

      <div className="space-y-3">
        <MediaGenerator pkg={pkg} mediaType="image" promptField="thumbnail_prompt" urlField="generated_thumbnail_url" label="Thumbnail Image" icon={ImageIcon} onMediaUpdate={onPackageUpdate} />
        <MediaGenerator pkg={pkg} mediaType="image" promptField="image_prompt" urlField="generated_image_url" label="Story Image" icon={Image} onMediaUpdate={onPackageUpdate} />
        <MediaGenerator pkg={pkg} mediaType="audio" promptField={scriptField} urlField="generated_audio_url" label="Voiceover Audio" icon={Volume2} onMediaUpdate={onPackageUpdate} />
        <MediaGenerator pkg={pkg} mediaType="video" promptField="image_prompt" urlField="generated_video_url" label="Promo Video" icon={Film} onMediaUpdate={onPackageUpdate} />
      </div>

      {promptAssets.map(def => (
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
    </div>
  );
}