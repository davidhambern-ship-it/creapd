import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  VISUAL_TYPES, FONT_OPTIONS, TOUR_ICON_NAMES, ICON_COLOR_OPTIONS,
  TEXT_COLOR_OPTIONS, TEXT_SIZE_OPTIONS, TEXT_ALIGNMENT_OPTIONS,
  BACKGROUND_TYPE_OPTIONS, ELEMENT_LAYOUT_OPTIONS, resolveTourIcon,
} from '@/lib/tourIcons';

export default function SceneVisualTab({ scene, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Visual</Label>
          <Select value={scene.visual_type || 'reveal'} onValueChange={v => onChange('visual_type', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VISUAL_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Layout</Label>
          <Select value={scene.element_layout || 'centered'} onValueChange={v => onChange('element_layout', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ELEMENT_LAYOUT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Icon</Label>
          <Select value={scene.icon_name || ''} onValueChange={v => onChange('icon_name', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue placeholder="Pick icon" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {TOUR_ICON_NAMES.map(name => {
                const Icon = resolveTourIcon(name);
                return (
                  <SelectItem key={name} value={name}>
                    <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" /><span>{name}</span></div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Icon Color</Label>
          <Select value={scene.icon_color || 'text-berna-purple'} onValueChange={v => onChange('icon_color', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ICON_COLOR_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Font</Label>
          <Select value={scene.font_style || 'heading'} onValueChange={v => onChange('font_style', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Text Size</Label>
          <Select value={scene.text_size || 'lg'} onValueChange={v => onChange('text_size', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEXT_SIZE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Text Color</Label>
          <Select value={scene.text_color || 'text-white'} onValueChange={v => onChange('text_color', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEXT_COLOR_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Text Alignment</Label>
          <Select value={scene.text_alignment || 'center'} onValueChange={v => onChange('text_alignment', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEXT_ALIGNMENT_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Background</Label>
        <Select value={scene.background_type || 'default'} onValueChange={v => onChange('background_type', v)}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BACKGROUND_TYPE_OPTIONS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {scene.generated_image_url && (
        <div className="rounded-lg overflow-hidden border border-white/[0.08]">
          <img src={scene.generated_image_url} alt="Scene visual" className="w-full h-32 object-cover" />
        </div>
      )}
    </div>
  );
}