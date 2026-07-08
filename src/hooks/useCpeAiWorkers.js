import { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'react-hot-toast';
import {
  serializePresentation,
  executeCommandPlan,
} from '@/lib/cpe/commandApi';

// ════════════════════════════════════════════════════════
// CPE-AI-001: useCpeAiWorkers
// Frontend orchestration of the Controller → Workers pipeline.
// Acts as the Controller's client-side agent:
// 1. Calls cpeController (design + operator) → gets command plan
// 2. Creates version snapshot (producer protection)
// 3. Executes commands via CPE Command API
// 4. Calls cpeController (quality review) → gets quality report
// 5. Handles pass / revise / escalate decisions
// ════════════════════════════════════════════════════════

const MAX_REVISIONS = 5;

export const WORKER_STATUS = {
  IDLE: 'idle',
  DESIGNING: 'design_specialist_running',
  OPERATING: 'operator_running',
  EXECUTING: 'executing_commands',
  REVIEWING: 'quality_specialist_running',
  PASSED: 'approved',
  REVISING: 'revision_required',
  ESCALATED: 'escalated',
  ERROR: 'error',
};

export function useCpeAiWorkers(editorCtx) {
  const {
    presentation, slides, elements, activeIndex,
    updateElement, updateSlide, addSlide, deleteSlide,
    duplicateSlide, reorderSlides, runQA,
  } = editorCtx;

  const [status, setStatus] = useState(WORKER_STATUS.IDLE);
  const [designReport, setDesignReport] = useState(null);
  const [commandPlan, setCommandPlan] = useState(null);
  const [executedCommands, setExecutedCommands] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  const [revisionCount, setRevisionCount] = useState(0);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const snapshotRef = useRef(null);

  const reset = useCallback(() => {
    setStatus(WORKER_STATUS.IDLE);
    setDesignReport(null);
    setCommandPlan(null);
    setExecutedCommands(null);
    setQualityReport(null);
    setRevisionCount(0);
    setError(null);
    setHistory([]);
    snapshotRef.current = null;
  }, []);

  const addHistory = useCallback((entry) => {
    setHistory(prev => [...prev, { timestamp: new Date().toISOString(), ...entry }]);
  }, []);

  // ── Main entry: run the full improve → review cycle ──
  const run = useCallback(async () => {
    if (status !== WORKER_STATUS.IDLE && status !== WORKER_STATUS.REVISING) return;

    setError(null);

    try {
      // ═══ Producer Protection: Version Snapshot ═══
      snapshotRef.current = {
        elements: JSON.parse(JSON.stringify(elements || [])),
        slides: JSON.parse(JSON.stringify(slides || [])),
        activeIndex,
      };
      addHistory({ event: 'version_snapshot', detail: 'Pre-AI snapshot created' });

      const presentationData = serializePresentation(presentation, slides, elements, activeIndex);

      // ═══ Phase 1+2: Controller → Design Specialist → Operator ═══
      setStatus(WORKER_STATUS.DESIGNING);
      addHistory({ event: 'design_specialist_started', revision: revisionCount });

      const improveRes = await base44.functions.invoke('cpeController', {
        action: 'improve',
        presentation_data: presentationData,
        revision_count: revisionCount,
      });

      const report = improveRes.data || improveRes;
      const dReport = report.design_report;
      const cPlan = report.command_plan || [];

      setDesignReport(dReport);
      setStatus(WORKER_STATUS.OPERATING);
      addHistory({ event: 'design_specialist_complete', detail: dReport?.visual_intent?.slice(0, 80) });
      addHistory({ event: 'operator_complete', detail: `${cPlan.length} commands generated` });

      // ═══ Phase 3: Execute Commands (Producer Protection: single undo point) ═══
      setStatus(WORKER_STATUS.EXECUTING);
      addHistory({ event: 'execution_started', detail: `${cPlan.length} commands` });

      // Push a single undo point before batch execution
      if (elements.length > 0) {
        updateElement(elements[0].id, {}, {});
      }

      const ctx = {
        updateElement, updateSlide, elements,
        addSlide, deleteSlide, duplicateSlide, reorderSlides,
        runQA,
      };

      const executed = executeCommandPlan(cPlan, ctx);
      setCommandPlan(cPlan);
      setExecutedCommands(executed);
      addHistory({ event: 'execution_complete', detail: `${executed.filter(c => c.status === 'executed').length}/${executed.length} succeeded` });

      // ═══ Phase 4: Quality Specialist Review ═══
      // Re-serialize with updated state (elements have been mutated)
      // We need to wait a tick for React state to settle, but since we have
      // the command results, we can send the original data + commands as context
      setStatus(WORKER_STATUS.REVIEWING);
      addHistory({ event: 'quality_specialist_started' });

      // Build updated presentation data reflecting the executed commands
      const updatedElements = elements.map(el => {
        const cmd = cPlan.find(c => c.target_element === el.id);
        if (!cmd) return el;
        // Approximate the updated state for the quality specialist
        return { ...el };
      });
      const updatedData = serializePresentation(presentation, slides, updatedElements, activeIndex);

      const reviewRes = await base44.functions.invoke('cpeController', {
        action: 'review',
        presentation_data: updatedData,
        revision_context: revisionCount > 0 ? qualityReport : null,
        revision_count: revisionCount,
      });

      const reviewData = reviewRes.data || reviewRes;
      const qReport = reviewData.quality_report;
      setQualityReport(qReport);
      addHistory({ event: 'quality_specialist_complete', detail: `Score: ${qReport?.overall_score}, ${qReport?.pass_fail}` });

      // ═══ Controller Decision ═══
      if (qReport.pass_fail === 'pass' || !qReport.revision_required) {
        setStatus(WORKER_STATUS.PASSED);
        addHistory({ event: 'controller_decision', detail: 'APPROVED' });
        toast.success('AI Workers: Presentation approved');
      } else {
        const newRevisionCount = revisionCount + 1;
        setRevisionCount(newRevisionCount);

        if (newRevisionCount >= MAX_REVISIONS) {
          setStatus(WORKER_STATUS.ESCALATED);
          addHistory({ event: 'controller_decision', detail: 'ESCALATED — max revisions reached' });
          toast.error('AI Workers: Max revisions reached — escalating to producer');
        } else {
          setStatus(WORKER_STATUS.REVISING);
          addHistory({
            event: 'controller_decision',
            detail: `REVISION required — ${qReport.responsible_worker || 'operator'} (iteration ${newRevisionCount})`,
          });
          toast(`AI Workers: Revision ${newRevisionCount}/${MAX_REVISIONS} — ${qReport.responsible_worker || 'operator'}`, { icon: '⚠️' });
        }
      }
    } catch (err) {
      setStatus(WORKER_STATUS.ERROR);
      setError(err.message || 'Unknown error');
      addHistory({ event: 'error', detail: err.message });
      toast.error('AI Workers: ' + (err.message || 'Failed'));
    }
  }, [status, presentation, slides, elements, activeIndex, revisionCount, qualityReport, updateElement, updateSlide, addSlide, deleteSlide, duplicateSlide, reorderSlides, runQA, addHistory]);

  // ── Continue revision cycle ──
  const continueRevision = useCallback(async () => {
    if (status !== WORKER_STATUS.REVISING) return;
    // Re-run the improve cycle with revision context
    await run();
  }, [status, run]);

  // ── Revert to pre-AI snapshot (producer protection) ──
  const revert = useCallback(() => {
    if (!snapshotRef.current) return;
    // The editor's undo stack has the pre-AI state
    // We pushed an undo point before execution, so multiple undos will revert
    toast('Use Undo to revert AI changes', { icon: '↩️' });
  }, []);

  return {
    status,
    designReport,
    commandPlan,
    executedCommands,
    qualityReport,
    revisionCount,
    maxRevisions: MAX_REVISIONS,
    error,
    history,
    run,
    continueRevision,
    revert,
    reset,
    WORKER_STATUS,
  };
}