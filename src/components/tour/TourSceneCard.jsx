import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2, Eye, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TourSceneForm from './TourSceneForm';
import { resolveTourIcon } from '@/lib/tourIcons';

export default function TourSceneCard({ scene, index, isActive, onChange, onDelete, onPreview, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const PreviewIcon = resolveTourIcon(scene.icon_name);

  const handleCardClick = () => {
    onSelect?.();
    setExpanded(!expanded);
  };

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${
      isActive
        ? 'border-berna-purple/40 bg-berna-purple/[0.04] glow-purple'
        : 'border-white/[0.08] bg-white/[0.02]'
    }`}>
      <div className="flex items-center gap-2 p-3">
        <div className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </div>

        <button
          onClick={handleCardClick}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">#{index + 1} · {scene.scene_id || `scene-${index}`}</span>
            {isActive && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-berna-purple/15 text-berna-purple font-mono uppercase">Live</span>
            )}
          </div>
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
              <TourSceneForm scene={scene} onChange={onChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}