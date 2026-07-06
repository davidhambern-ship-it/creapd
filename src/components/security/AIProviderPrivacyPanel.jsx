import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, Loader2, Lock, Eye } from 'lucide-react';

const MODEL_LABELS = {
  automatic: 'Automatic (Platform Default)', gpt_5_mini: 'GPT-5 Mini', gemini_3_flash: 'Gemini 3 Flash',
  gpt_5_4: 'GPT-5.4', gpt_5_5: 'GPT-5.5', gemini_3_1_pro: 'Gemini 3.1 Pro',
  claude_sonnet_4_6: 'Claude Sonnet 4.6', claude_opus_4_6: 'Claude Opus 4.6'
};

const DATA_TRANSMITTED = [
  { task: 'Script Generation', data: 'Story summary, production context, tone settings, template variables' },
  { task: 'Image Generation', data: 'Image prompt, style preferences, associated story context' },
  { task: 'Video Generation', data: 'Video prompt, duration, aspect ratio preferences' },
  { task: 'Audio / TTS', data: 'Teleprompter script text, voice selection, language code' },
  { task: 'Translation', data: 'Script text, target language, cultural context notes' },
  { task: 'Briefing Generation', data: 'Article summaries, source metadata, editorial preferences' },
];

export default function AIProviderPrivacyPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.NewsSettings.list();
        if (items.length > 0) setSettings(items[0]);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-berna-purple animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-berna-purple" />
        <h3 className="text-sm font-semibold text-white">AI Provider Privacy</h3>
      </div>
      <p className="text-xs text-muted-foreground">Producer only transmits information necessary to complete the requested task. You choose which provider is used for each generation type.</p>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-berna-purple" />
          <h4 className="text-xs font-semibold text-white">Active Provider Preferences</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-md p-2">
            <p className="text-[10px] text-muted-foreground">Text Model</p>
            <p className="text-xs text-white">{settings ? (MODEL_LABELS[settings.preferred_text_model] || settings.preferred_text_model || 'Automatic') : 'Not configured'}</p>
          </div>
          <div className="bg-white/[0.03] rounded-md p-2">
            <p className="text-[10px] text-muted-foreground">Image Provider</p>
            <p className="text-xs text-white capitalize">{settings?.preferred_image_provider || 'Default'}</p>
          </div>
          <div className="bg-white/[0.03] rounded-md p-2">
            <p className="text-[10px] text-muted-foreground">Video Provider</p>
            <p className="text-xs text-white capitalize">{settings?.preferred_video_provider || 'Default'}</p>
          </div>
          <div className="bg-white/[0.03] rounded-md p-2">
            <p className="text-[10px] text-muted-foreground">Audio Voice</p>
            <p className="text-xs text-white capitalize">{settings?.preferred_audio_voice || 'River'}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-berna-purple" />
          <h4 className="text-xs font-semibold text-white">What Data Is Transmitted</h4>
        </div>
        <div className="space-y-1.5">
          {DATA_TRANSMITTED.map(item => (
            <div key={item.task} className="flex items-start gap-2 text-xs">
              <span className="text-berna-purple font-medium min-w-[120px]">{item.task}</span>
              <span className="text-muted-foreground">{item.data}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-white/[0.04]">
          Producer does not transmit unnecessary personal data, credentials, or unrelated production content to AI providers.
        </p>
      </div>
    </div>
  );
}