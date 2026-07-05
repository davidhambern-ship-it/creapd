import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import {
  GripVertical, Lock, Unlock, Copy, Trash2, Archive,
  StickyNote, Clock, ChevronDown, ChevronUp, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CategoryBadge from '@/components/shared/CategoryBadge';

const PRIORITY_STYLES = {
  breaking: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-berna-orange/20 text-berna-orange border-berna-orange/30',
  standard: 'bg-white/[0.06] text-white/60 border-white/[0.08]',
  feature: 'bg-berna-purple/20 text-berna-purple border-berna-purple/30',
  optional: 'bg-white/[0.04] text-muted-foreground border-white/[0.06]',
  archived: 'bg-white/[0.02] text-muted-foreground/50 border-white/[0.04]',
};

const PRODUCTION_STATUS_LABELS = {
  selected: 'Selected',
  researching: 'Researching',
  generating_package: 'Generating Package',
  package_ready: 'Package Ready',
  editing: 'Editing',
  ready_for_review: 'Ready for Review',
  approved: 'Approved',
  ready_for_export: 'Ready for Export',
  exported: 'Exported',
  archived: 'Archived',
};

const PACKAGE_STATUS_STYLES = {
  not_generated: { label: 'No Package', color: 'text-muted-foreground/50', dot: 'bg-muted-foreground/30' },
  generating: { label: 'Generating', color: 'text-berna-purple', dot: 'bg-berna-purple animate-pulse' },
  generated: { label: 'Generated', color: 'text-blue-400', dot: 'bg-blue-400' },
  edited: { label: 'Edited', color: 'text-berna-orange', dot: 'bg-berna-orange' },
  approved: { label: 'Approved', color: 'text-berna-emerald', dot: 'bg-berna-emerald' },
};

export default function RundownItem({
  story, pkg, hasNotes, index,
  onRemove, onDuplicate, onArchive, onUpdateStatus, onUpdatePriority, onToggleLock, onOpenPackage
}) {
  const [expanded, setExpanded] = useState(false);
  const priority = story.production_priority || 'standard';
  const prodStatus = story.production_status || 'selected';
  const pkgStatus = pkg?.status || 'not_generated';
  const pkgStyle = PACKAGE_STATUS_STYLES[pkgStatus] || PACKAGE_STATUS_STYLES.not_generated;
  const isLocked = story.locked;

  return (
    <Draggable draggableId={story.id} index={index} isDragDisabled={isLocked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`glass-panel p-3 transition-all ${snapshot.isDragging ? 'ring-1 ring-berna-purple/40 shadow-lg' : ''} ${isLocked ? 'border-berna-emerald/20' : ''}`}
        >
          <div className="flex items-start gap-2">
            <div {...provided.dragHandleProps} className={`mt-1 ${isLocked ? 'cursor-not-allowed opacity-30' : 'cursor-grab hover:text-berna-purple'} text-muted-foreground`}>
              <GripVertical className="w-4 h-4" />
            </div>

            <span className="mt-0.5 text-xs font-mono text-berna-purple font-bold flex-shrink-0 w-6">
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase border ${PRIORITY_STYLES[priority]}`}>
                  {priority}
                </span>
                {isLocked && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-berna-emerald">
                    <Lock className="w-2.5 h-2.5" />Locked
                  </span>
                )}
                {hasNotes && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-400" title="Has producer notes">
                    <StickyNote className="w-2.5 h-2.5" />Notes
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-[9px] ${pkgStyle.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pkgStyle.dot}`} />
                  {pkgStyle.label}
                </span>
                {pkg?.estimated_runtime && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />{pkg.estimated_runtime}
                  </span>
                )}
              </div>

              <Link to={`/story/${story.id}`}>
                <h4 className="text-sm font-semibold text-white leading-snug hover:text-berna-purple transition-colors">{story.title}</h4>
              </Link>

              {story.category && (
                <div className="mt-1"><CategoryBadge category={story.category} /></div>
              )}

              {expanded && (
                <div className="mt-3 space-y-2 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20">Status:</span>
                    <Select value={prodStatus} onValueChange={(v) => onUpdateStatus(story.id, v)} disabled={isLocked}>
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRODUCTION_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20">Priority:</span>
                    <Select value={priority} onValueChange={(v) => onUpdatePriority(story.id, v)} disabled={isLocked}>
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breaking">Breaking</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="text-berna-purple hover:bg-berna-purple/10 text-xs h-7" onClick={() => onOpenPackage(story.id)}>
                      <Package className="w-3 h-3 mr-1" />Open Package
                    </Button>
                    <Button size="sm" variant="ghost" className="text-berna-emerald hover:bg-berna-emerald/10 text-xs h-7" onClick={() => onToggleLock(story.id, !isLocked)}>
                      {isLocked ? <><Unlock className="w-3 h-3 mr-1" />Unlock</> : <><Lock className="w-3 h-3 mr-1" />Lock</>}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7" onClick={() => onDuplicate(story)}>
                      <Copy className="w-3 h-3 mr-1" />Duplicate
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-yellow-400 text-xs h-7" onClick={() => onArchive(story.id)}>
                      <Archive className="w-3 h-3 mr-1" />Archive
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-400 text-xs h-7" onClick={() => onRemove(story.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setExpanded(!expanded)} className="mt-1 text-muted-foreground hover:text-white flex-shrink-0">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}