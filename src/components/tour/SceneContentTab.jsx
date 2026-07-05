import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SceneContentTab({ scene, onChange }) {
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
          <Label className="text-xs text-muted-foreground">Scene ID</Label>
          <input
            value={scene.scene_id || ''}
            onChange={e => onChange('scene_id', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Order</Label>
          <input
            type="number"
            value={scene.scene_order ?? 0}
            onChange={e => onChange('scene_order', Number(e.target.value))}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}