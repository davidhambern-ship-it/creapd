import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2, Eye, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TourSceneForm from './TourSceneForm';
import { resolveTourIcon } from '@/lib/tourIcons';

export default function TourSceneCard({ scene, index, onChange, onDelete, onPreview }) {
  const [expanded, setExpanded] = useState(false);
  const PreviewIcon = resolveTourIcon(scene.icon_name);

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0">
          <PreviewIcon className={`w-3.5 h-3.5 ${scene.icon_color || 'text-berna-purple'}`} />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-xs text-muted-foreground font-mono">#{index + 1} · {scene.scene_id || `scene-${index}`}</p>
          <p className="text-sm text-white truncate">{scene.text || '(empty)'}</p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPreview(index)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 border-t border-white/[0.06]">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground">Scene ID</label>
                  <input
                    value={scene.scene_id || ''}
                    onChange={e => onChange('scene_id', e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Order</label>
                  <input
                    type="number"
                    value={scene.scene_order ?? index}
                    onChange={e => onChange('scene_order', Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <TourSceneForm scene={scene} onChange={onChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}