import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle, Cpu, ImageIcon, Film, Volume2, Languages } from 'lucide-react';

const TEXT_MODELS = [
  { value: 'automatic', label: 'Automatic (recommended)' },
  { value: 'gpt_5_mini', label: 'GPT-5 Mini (fast, economical)' },
  { value: 'gemini_3_flash', label: 'Gemini 3 Flash (with web search)' },
  { value: 'gpt_5_4', label: 'GPT-5.4' },
  { value: 'gpt_5_5', label: 'GPT-5.5' },
  { value: 'gemini_3_1_pro', label: 'Gemini 3.1 Pro (with web search)' },
  { value: 'claude_sonnet_4_6', label: 'Claude Sonnet 4.6' },
  { value: 'claude_opus_4_6', label: 'Claude Opus 4.6 (highest quality)' },
];

const VOICES = [
  { value: 'river', label: 'River — Calm, neutral' },
  { value: 'honey', label: 'Honey — Warm, soft' },
  { value: 'sunny', label: 'Sunny — Bright, upbeat' },
  { value: 'storm', label: 'Storm — Formal, authoritative' },
  { value: 'spark', label: 'Spark — Energetic, quick' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ru', label: 'Russian' },
];

export default function AISettingsPanel({ settings, onUpdate }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    base44.entities.AIServiceAccount.list('-created_date', 50).then(setAccounts).catch(() => {});
  }, []);

  return (
    <div className="glass-panel p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-white neon-underline">AI Services & Provider Preferences</h2>
        <p className="text-[10px] text-muted-foreground mt-1">Choose preferred AI providers for each task type. These are used as workspace defaults — show and brand profiles may override them.</p>
      </div>

      {/* Connected Accounts */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-3.5 h-3.5 text-berna-emerald" />
          <span className="text-xs font-semibold text-white">Connected AI Accounts</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {accounts.map(a => (
            <div key={a.id} className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
              <div className={`w-1.5 h-1.5 rounded-full ${a.is_connected ? 'bg-berna-emerald' : 'bg-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white truncate">{a.provider_label || a.provider_name}</p>
                <p className="text-[9px] text-muted-foreground capitalize">{a.provider_category.replace(/_/g, ' ')}</p>
              </div>
              {a.is_default && <span className="text-[9px] text-berna-purple bg-berna-purple/10 px-1.5 py-0.5 rounded">Default</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Provider Preferences */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3 h-3" /> Preferred Text Generation Model
          </Label>
          <Select value={settings.preferred_text_model || 'automatic'} onValueChange={v => onUpdate('preferred_text_model', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {TEXT_MODELS.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Volume2 className="w-3 h-3" /> Preferred Audio Voice
          </Label>
          <Select value={settings.preferred_audio_voice || 'river'} onValueChange={v => onUpdate('preferred_audio_voice', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {VOICES.map(v => <SelectItem key={v.value} value={v.value} className="text-xs">{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> Image Generation Provider
          </Label>
          <Input value={settings.preferred_image_provider || 'Built-in (DALL-E)'} disabled className="bg-white/[0.02] border-white/[0.08] text-muted-foreground text-sm" />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Film className="w-3 h-3" /> Video Generation Provider
          </Label>
          <Input value={settings.preferred_video_provider || 'Built-in (Veo)'} disabled className="bg-white/[0.02] border-white/[0.08] text-muted-foreground text-sm" />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Languages className="w-3 h-3" /> Preferred Translation Language
          </Label>
          <Select value={settings.preferred_translation_language || 'en'} onValueChange={v => onUpdate('preferred_translation_language', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}