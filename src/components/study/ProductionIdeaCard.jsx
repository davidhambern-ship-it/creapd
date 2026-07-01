import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Hammer, Loader2 } from 'lucide-react';

export default function ProductionIdeaCard({ idea, onBuild, isBuilding }) {
  const [expanded, setExpanded] = useState(false);
  const description = idea.description || idea.fullDescription || '';
  const needsExpand = description.length > 120;

  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-accent/30 transition-colors">
      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">{idea.production_type}</span>
      <p className="text-sm font-medium mt-1.5 mb-1">{idea.title}</p>
      <p className={`text-xs text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>{description}</p>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> View Less</> : <><ChevronDown className="w-3 h-3" /> View More</>}
        </button>
      )}
      {expanded && (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
          {idea.suggested_audience && (
            <div><span className="text-foreground/70 font-medium">Audience:</span> {idea.suggested_audience}</div>
          )}
          {idea.suggested_tone && (
            <div><span className="text-foreground/70 font-medium">Tone:</span> {idea.suggested_tone}</div>
          )}
          {idea.suggested_runtime && (
            <div><span className="text-foreground/70 font-medium">Runtime:</span> {idea.suggested_runtime}</div>
          )}
          {idea.suggested_structure && (
            <div><span className="text-foreground/70 font-medium">Structure:</span> {idea.suggested_structure}</div>
          )}
          {idea.source_study_topic && (
            <div><span className="text-foreground/70 font-medium">Source Study:</span> {idea.source_study_topic}</div>
          )}
          {idea.suggested_assets && idea.suggested_assets.length > 0 && (
            <div><span className="text-foreground/70 font-medium">Assets:</span> {idea.suggested_assets.join(', ')}</div>
          )}
        </div>
      )}
      <Button
        size="sm"
        className="w-full mt-2"
        onClick={() => onBuild(idea)}
        disabled={isBuilding}
      >
        {isBuilding ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Hammer className="w-3.5 h-3.5 mr-1" />}
        Build Production
      </Button>
    </div>
  );
}