import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle, CheckCircle2, Loader2, Sparkles,
  ChevronLeft, ChevronRight, FileText, Eye, Brain,
} from 'lucide-react';

// ════════════════════════════════════════════════════════
// SlideCritiquePanel — Per-slide Director's Critique
// Allows producer to flag issues + write notes per slide,
// then submit as revision_context to the cpeController.
// ════════════════════════════════════════════════════════

export default function SlideCritiquePanel({
  slides,
  activeIndex,
  activeSlide,
  qualityReport,
  revisionContext,
  onSetRevisionContext,
  onSubmit,
  isProcessing,
  revisionCount,
  maxRevisions,
}) {
  const [tabMode, setTabMode] = useState('issues'); // 'issues' | 'notes'

  // Issues from the quality report, scoped to the active slide
  const slideIssues = useMemo(() => {
    if (!qualityReport?.issues) return [];
    const slideIdx = activeIndex;
    return qualityReport.issues.filter(issue => {
      const desc = (issue.description || '').toLowerCase();
      return desc.includes(`slide ${slideIdx + 1}`) || desc.includes(`slide ${slideIdx}`) || issue.slide_index === slideIdx;
    });
  }, [qualityReport, activeIndex]);

  // Existing critique for this slide (from revisionContext)
  const existingCritique = useMemo(() => {
    if (!revisionContext) return null;
    const arr = Array.isArray(revisionContext) ? revisionContext : [revisionContext];
    return arr.find(c => c.slide_index === activeIndex || c.slide_id === activeSlide?.id);
  }, [revisionContext, activeIndex, activeSlide]);

  const [selectedIssues, setSelectedIssues] = useState(existingCritique?.selectedIssues || []);
  const [note, setNote] = useState(existingCritique?.note || '');

  // Sync local state when slide changes
  React.useEffect(() => {
    setSelectedIssues(existingCritique?.selectedIssues || []);
    setNote(existingCritique?.note || '');
  }, [activeIndex]);

  const toggleIssue = (issueDesc) => {
    setSelectedIssues(prev =>
      prev.includes(issueDesc)
        ? prev.filter(i => i !== issueDesc)
        : [...prev, issueDesc]
    );
  };

  const handleSubmit = () => {
    const critique = {
      slide_index: activeIndex,
      slide_id: activeSlide?.id || null,
      slide_title: activeSlide?.title || `Slide ${activeIndex + 1}`,
      note: note.trim(),
      selectedIssues,
      action: 'targeted_revision',
    };

    // Merge into existing revision context array
    let ctxArray = Array.isArray(revisionContext) ? [...revisionContext] : (revisionContext ? [revisionContext] : []);
    const existingIdx = ctxArray.findIndex(c => c.slide_index === activeIndex);
    if (existingIdx >= 0) {
      ctxArray[existingIdx] = critique;
    } else {
      ctxArray.push(critique);
    }

    onSetRevisionContext(ctxArray);
    onSubmit?.(ctxArray);
  };

  const hasFeedback = note.trim() || selectedIssues.length > 0;
  const allIssues = slideIssues.length > 0 ? slideIssues : (qualityReport?.issues || []).slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Slide context banner */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {activeSlide?.title || `Slide ${activeIndex + 1}`}
          </p>
          <p className="text-[10px] text-muted-foreground">Slide {activeIndex + 1} of {slides?.length || 0}</p>
        </div>
        <Badge variant="outline" className="text-[10px]">Critique</Badge>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-muted">
        <button
          onClick={() => setTabMode('issues')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${tabMode === 'issues' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <AlertTriangle className="w-3 h-3" /> Issues ({allIssues.length})
        </button>
        <button
          onClick={() => setTabMode('notes')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${tabMode === 'notes' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Eye className="w-3 h-3" /> Director's Note
        </button>
      </div>

      {/* Issues tab */}
      {tabMode === 'issues' && (
        <div className="space-y-1.5">
          {allIssues.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No issues detected for this slide. Switch to the Director's Note tab to add custom feedback.
            </p>
          ) : (
            allIssues.map((issue, idx) => {
              const issueDesc = issue.description || issue.issue || String(issue);
              const isChecked = selectedIssues.includes(issueDesc);
              const sevColor = issue.severity === 'high' ? 'bg-red-500' : issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500';
              return (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-card border border-border">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleIssue(issueDesc)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug">{issueDesc}</p>
                    {issue.severity && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${sevColor}`} />
                        <span className="text-[10px] text-muted-foreground capitalize">{issue.severity}</span>
                        {issue.responsible_worker && (
                          <span className="text-[10px] text-muted-foreground">→ {issue.responsible_worker.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Notes tab */}
      {tabMode === 'notes' && (
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Director's Note: e.g., 'The headline is clashing with the background image — reduce opacity or reposition. The pacing feels too fast for this slide — slow down the entrance animations.'"
            className="min-h-[120px] text-xs resize-none"
          />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Brain className="w-3 h-3" />
            <span>This note will be sent to the AI Design Specialist as a high-priority directive.</span>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="pt-2 border-t border-border">
        <Button
          onClick={handleSubmit}
          disabled={!hasFeedback || isProcessing}
          className="w-full bg-primary hover:bg-primary/90"
          size="sm"
        >
          {isProcessing ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI Processing Critique…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Submit Director's Correction</>
          )}
        </Button>
        {revisionCount > 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Revision {revisionCount}/{maxRevisions} — AI will focus on flagged slides
          </p>
        )}
      </div>

      {/* Existing critiques summary */}
      {revisionContext && Array.isArray(revisionContext) && revisionContext.length > 0 && (
        <div className="pt-2 border-t border-border space-y-1">
          <p className="text-[10px] font-heading font-semibold uppercase tracking-wide text-muted-foreground">
            Pending Critiques ({revisionContext.length})
          </p>
          {revisionContext.map((c, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${c.slide_index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              <span className="text-muted-foreground truncate">
                Slide {c.slide_index + 1}: {c.note?.slice(0, 40) || `${c.selectedIssues?.length || 0} issues`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}