import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { STUDY_TYPE_LABELS } from '@/lib/studyConstants';

export default function RelatedStudyCard({ study, sourceSessionId }) {
  const [expanded, setExpanded] = useState(false);
  const studyTypeLabel = STUDY_TYPE_LABELS[study.study_type] || 'Custom Research';
  const relevance = study.relevance || '';
  const needsExpand = relevance.length > 100;
  const targetUrl = `/spiritual/study?query=${encodeURIComponent(study.question)}&autoRun=true&sourceSession=${sourceSessionId}`;

  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{studyTypeLabel}</span>
      </div>
      <p className="text-sm font-medium mb-1">{study.question}</p>
      {relevance && (
        <>
          <p className={`text-xs text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>{relevance}</p>
          {needsExpand && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> View Less</> : <><ChevronDown className="w-3 h-3" /> View More</>}
            </button>
          )}
        </>
      )}
      <Button asChild size="sm" className="w-full mt-2">
        <Link to={targetUrl}>
          <Play className="w-3.5 h-3.5 mr-1" /> Start Study
        </Link>
      </Button>
    </div>
  );
}