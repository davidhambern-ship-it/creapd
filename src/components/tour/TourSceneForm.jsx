import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  VISUAL_TYPES, VOICE_OPTIONS, FONT_OPTIONS,
  TOUR_ICON_NAMES, ICON_COLOR_OPTIONS, resolveTourIcon,
} from '@/lib/tourIcons';

export default function TourSceneForm({ scene, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Display Text</Label>
        <Textarea
          value={scene.text || ''}
          onChange={e => onChange('text', e.target.value)}
          rows={2}
          className="bg-white/[0.03] border-white/[0.08] text-sm"
          placeholder="Text shown on screen"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Speech Text (TTS)</Label>
        <Textarea
          value={scene.speech_text || ''}
          onChange={e => onChange('speech_text', e.target.value)}
          rows={2}
          className="bg-white/[0.03] border-white/[0.08] text-sm"
          placeholder="Leave empty to use display text"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Visual</Label>
          <Select value={scene.visual_type || 'reveal'} onValueChange={v => onChange('visual_type', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISUAL_TYPES.map(v => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Font</Label>
          <Select value={scene.font_style || 'heading'} onValueChange={v => onChange('font_style', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map(f => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Icon</Label>
          <Select value={scene.icon_name || ''} onValueChange={v => onChange('icon_name', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm">
              <SelectValue placeholder="Pick icon" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {TOUR_ICON_NAMES.map(name => {
                const Icon = resolveTourIcon(name);
                return (
                  <SelectItem key={name} value={name}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Icon Color</Label>
          <Select value={scene.icon_color || 'text-berna-purple'} onValueChange={v => onChange('icon_color', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_COLOR_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Voice Override (per-scene)</Label>
        <Select value={scene.voice_override || ''} onValueChange={v => onChange('voice_override', v)}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm">
            <SelectValue placeholder="Use script default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Use script default</SelectItem>
            {VOICE_OPTIONS.map(v => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}