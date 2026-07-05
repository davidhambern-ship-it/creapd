import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Volume2, X, Mic } from 'lucide-react';
import { VOICE_OPTIONS } from '@/lib/tourIcons';
import ElevenLabsVoicePicker from './ElevenLabsVoicePicker';

export default function SceneAudioTab({ scene, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Mic className="w-3 h-3" /> ElevenLabs Voice
        </Label>
        {scene.elevenlabs_voice_id ? (
          <div className="flex items-center gap-2 p-2 rounded-lg border border-berna-purple/20 bg-berna-purple/[0.06]">
            <Volume2 className="w-3.5 h-3.5 text-berna-purple shrink-0" />
            <span className="text-xs text-white flex-1 truncate font-mono">{scene.elevenlabs_voice_id}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange('elevenlabs_voice_id', '')}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setPickerOpen(true)}>
            <Mic className="w-3.5 h-3.5 mr-1" /> Browse ElevenLabs Voices
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground/60">
          {scene.elevenlabs_voice_id ? 'Overrides built-in voice below' : 'Falls back to built-in voice when not set'}
        </p>
      </div>

      {!scene.elevenlabs_voice_id && (
        <div>
          <Label className="text-xs text-muted-foreground">Built-in Voice Override</Label>
          <Select value={scene.voice_override || ''} onValueChange={v => onChange('voice_override', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue placeholder="Use script default" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Use script default</SelectItem>
              {VOICE_OPTIONS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Speech Speed</Label>
          <span className="text-xs font-mono text-muted-foreground">{(scene.speech_speed ?? 1).toFixed(2)}x</span>
        </div>
        <Slider
          value={[scene.speech_speed ?? 1]}
          onValueChange={([v]) => onChange('speech_speed', v)}
          min={0.5}
          max={2}
          step={0.05}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Voice Stability</Label>
          <span className="text-xs font-mono text-muted-foreground">{Math.round((scene.voice_stability ?? 0.5) * 100)}%</span>
        </div>
        <Slider
          value={[scene.voice_stability ?? 0.5]}
          onValueChange={([v]) => onChange('voice_stability', v)}
          min={0}
          max={1}
          step={0.05}
        />
        <p className="text-[10px] text-muted-foreground/60">Higher = more consistent, lower = more expressive</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Voice Similarity Boost</Label>
          <span className="text-xs font-mono text-muted-foreground">{Math.round((scene.voice_similarity ?? 0.75) * 100)}%</span>
        </div>
        <Slider
          value={[scene.voice_similarity ?? 0.75]}
          onValueChange={([v]) => onChange('voice_similarity', v)}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      <ElevenLabsVoicePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(voice) => onChange('elevenlabs_voice_id', voice.voice_id)}
      />
    </div>
  );
}