import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Download, RefreshCw, Volume2, Film, ImageIcon, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const prompt = pkg?.[promptField] || '';
  const mediaUrl = pkg?.[urlField] || '';

  const handleGenerate = async () => {
    if (!prompt && mediaType !== 'audio') {
      setError(`Generate the ${promptField.replace(/_/g, ' ')} first.`);
      return;
    }
    if (mediaType === 'audio' && !pkg?.teleprompter_script) {
      setError('Generate the teleprompter script first.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      let result;
      if (mediaType === 'image') {
        result = await base44.integrations.Core.GenerateImage({ prompt });
      } else if (mediaType === 'video') {
        result = await base44.integrations.Core.GenerateVideo({ prompt, duration: 6, aspect_ratio: '16:9' });
      } else if (mediaType === 'audio') {
        result = await base44.integrations.Core.GenerateSpeech({
          text: pkg.teleprompter_script,
          voice,
          language_code: 'en',
        });
      }
      const url = result?.url || result?.data?.url;
      if (!url) throw new Error('No URL returned');
      const updated = await base44.entities.ProductionPackage.update(pkg.id, { [urlField]: url });
      onMediaUpdate(updated);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-berna-orange" />
          <span className="text-xs font-semibold text-white">{label}</span>
        </div>
        {mediaUrl && !generating && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" download>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-berna-orange hover:bg-berna-orange/10">
              <Download className="w-3 h-3 mr-1" />Download
            </Button>
          </a>
        )}
      </div>
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
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] border-white/10 text-white hover:bg-white/[0.04] w-full"
              onClick={handleGenerate}
            >
              <RefreshCw className="w-3 h-3 mr-1" />Regenerate
            </Button>
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
            <Button
              size="sm"
              className="bg-berna-orange/90 hover:bg-berna-orange text-white text-xs h-8 w-full"
              onClick={handleGenerate}
              disabled={!prompt && mediaType !== 'audio'}
            >
              <Icon className="w-3 h-3 mr-1" />
              {prompt || (mediaType === 'audio' && pkg?.teleprompter_script) ? `Generate ${label}` : `Need ${promptField.replace(/_/g, ' ')} first`}
            </Button>
            {error && <p className="text-[10px] text-red-400">{error}</p>}
            {prompt && (
              <p className="text-[10px] text-muted-foreground line-clamp-2 italic">"{prompt.substring(0, 120)}{prompt.length > 120 ? '...' : ''}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}