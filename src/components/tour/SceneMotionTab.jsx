import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { TRANSITION_OPTIONS, TRANSITION_OPTIONS_OUT, ANIMATION_SPEED_OPTIONS } from '@/lib/tourIcons';

export default function SceneMotionTab({ scene, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Transition In</Label>
          <Select value={scene.transition_in || 'fade'} onValueChange={v => onChange('transition_in', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRANSITION_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Transition Out</Label>
          <Select value={scene.transition_out || 'fade'} onValueChange={v => onChange('transition_out', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRANSITION_OPTIONS_OUT.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Animation Speed</Label>
        <Select value={scene.animation_speed || 'normal'} onValueChange={v => onChange('animation_speed', v)}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ANIMATION_SPEED_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Pause After Scene</Label>
          <span className="text-xs font-mono text-muted-foreground">{scene.pause_after_ms ?? 500}ms</span>
        </div>
        <Slider
          value={[scene.pause_after_ms ?? 500]}
          onValueChange={([v]) => onChange('pause_after_ms', v)}
          min={0}
          max={3000}
          step={100}
        />
      </div>
    </div>
  );
}