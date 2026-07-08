import React from 'react';
import {
  X, Sparkles, Palette, Wrench, ShieldCheck, CheckCircle2,
  AlertTriangle, ArrowRight, RotateCcw, ChevronRight, Cpu,
} from 'lucide-react';

// ════════════════════════════════════════════════════════
// CPE-AI-001: CpeAiPanel
// UI for the Presentation Editor AI Worker System.
// Shows the Controller-coordinated workflow:
// Design Specialist → Operator → Quality Specialist → Decision
// ════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  idle: { icon: Cpu, label: 'Ready', color: 'hsl(var(--cpe-text-dim))' },
  design_specialist_running: { icon: Palette, label: 'Design Specialist', color: 'hsl(210 70% 56%)' },
  operator_running: { icon: Wrench, label: 'Operator', color: 'hsl(38 70% 52%)' },
  executing_commands: { icon: ArrowRight, label: 'Executing', color: 'hsl(var(--cpe-accent))' },
  quality_specialist_running: { icon: ShieldCheck, label: 'Quality Specialist', color: 'hsl(280 50% 60%)' },
  approved: { icon: CheckCircle2, label: 'Approved', color: 'hsl(152 60% 45%)' },
  revision_required: { icon: AlertTriangle, label: 'Revision Required', color: 'hsl(38 80% 52%)' },
  escalated: { icon: AlertTriangle, label: 'Escalated', color: 'hsl(0 60% 52%)' },
  error: { icon: X, label: 'Error', color: 'hsl(0 60% 52%)' },
};

const WORKER_STEPS = [
  { key: 'design_specialist_running', label: 'Design', icon: Palette },
  { key: 'operator_running', label: 'Operate', icon: Wrench },
  { key: 'executing_commands', label: 'Execute', icon: ArrowRight },
  { key: 'quality_specialist_running', label: 'Review', icon: ShieldCheck },
];

export default function CpeAiPanel({ aiWorkers, onClose }) {
  const { status, designReport, commandPlan, executedCommands, qualityReport, revisionCount, maxRevisions, error, history } = aiWorkers;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const StatusIcon = statusCfg.icon;
  const isRunning = status.includes('running') || status === 'executing_commands';
  const currentStepIdx = WORKER_STEPS.findIndex(s => s.key === status);

  return (
    <div className="cpe-ai-panel">
      {/* Header */}
      <div className="cpe-ai-header">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: 'hsl(var(--cpe-accent))' }} />
          <span className="cpe-ai-title">AI Workers</span>
        </div>
        <button className="cpe-icon-btn" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>

      {/* Status badge */}
      <div className="px-3 pb-2">
        <div className="cpe-ai-status-badge" style={{ color: statusCfg.color, borderColor: statusCfg.color + '40' }}>
          <StatusIcon className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} style={isRunning ? { animationDuration: '2s' } : {}} />
          <span>{statusCfg.label}</span>
          {revisionCount > 0 && <span className="cpe-ai-rev-count">Rev {revisionCount}/{maxRevisions}</span>}
        </div>
      </div>

      {/* Workflow steps */}
      <div className="px-3 pb-3">
        <div className="cpe-ai-steps">
          {WORKER_STEPS.map((step, i) => {
            const isActive = status === step.key;
            const isDone = currentStepIdx > i || status === 'approved';
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.key}>
                <div className={`cpe-ai-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                  <StepIcon className="w-3 h-3" />
                  <span>{step.label}</span>
                </div>
                {i < WORKER_STEPS.length - 1 && <ChevronRight className="w-3 h-3 cpe-ai-step-arrow" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="cpe-ai-scroll">
        {/* Error */}
        {error && (
          <div className="cpe-ai-section">
            <div className="cpe-ai-error">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Design Direction Report */}
        {designReport && (
          <div className="cpe-ai-section">
            <SectionHeader icon={Palette} label="Design Direction Report" />
            <div className="cpe-ai-card">
              <Field label="Visual Intent" value={designReport.visual_intent} />
              {designReport.design_rationale && (
                <Field label="Rationale" value={designReport.design_rationale} />
              )}
              {designReport.typography_instructions && (
                <Field label="Typography" value={JSON.stringify(designReport.typography_instructions)} mono />
              )}
              {designReport.color_instructions && (
                <Field label="Colors" value={JSON.stringify(designReport.color_instructions)} mono />
              )}
              {designReport.operator_instructions?.length > 0 && (
                <div className="mt-2">
                  <span className="cpe-ai-field-label">Operator Instructions</span>
                  <ul className="cpe-ai-list">
                    {designReport.operator_instructions.slice(0, 5).map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Command Plan */}
        {commandPlan && (
          <div className="cpe-ai-section">
            <SectionHeader icon={Wrench} label={`Editor Command Plan (${commandPlan.length})`} />
            <div className="space-y-1">
              {(executedCommands || commandPlan).slice(0, 8).map((cmd, i) => (
                <div key={i} className="cpe-ai-command-row">
                  <span className={`cpe-ai-cmd-status ${cmd.status === 'executed' ? 'done' : cmd.status === 'failed' ? 'fail' : 'pending'}`}>
                    {cmd.status === 'executed' ? '✓' : cmd.status === 'failed' ? '✗' : '○'}
                  </span>
                  <span className="cpe-ai-cmd-op">{cmd.operation}</span>
                  {cmd.target_element && <span className="cpe-ai-cmd-target">→ {cmd.target_element.slice(0, 12)}</span>}
                </div>
              ))}
              {commandPlan.length > 8 && (
                <p className="cpe-ai-more">+{commandPlan.length - 8} more commands</p>
              )}
            </div>
          </div>
        )}

        {/* Quality Review Report */}
        {qualityReport && (
          <div className="cpe-ai-section">
            <SectionHeader icon={ShieldCheck} label="Quality Review Report" />
            <div className="cpe-ai-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="cpe-ai-score" style={{
                  color: qualityReport.overall_score >= 80 ? 'hsl(152 60% 45%)' : qualityReport.overall_score >= 60 ? 'hsl(38 80% 52%)' : 'hsl(0 60% 52%)',
                }}>
                  {qualityReport.overall_score}
                  <span className="cpe-ai-score-max">/100</span>
                </div>
                <div className={`cpe-ai-pass-fail ${qualityReport.pass_fail}`}>
                  {qualityReport.pass_fail?.toUpperCase()}
                </div>
              </div>

              {qualityReport.rubric_scores && (
                <div className="cpe-ai-rubrics">
                  {Object.entries(qualityReport.rubric_scores).map(([key, score]) => (
                    <div key={key} className="cpe-ai-rubric">
                      <span className="cpe-ai-rubric-label">{key.replace(/_/g, ' ')}</span>
                      <div className="cpe-ai-rubric-bar">
                        <div className="cpe-ai-rubric-fill" style={{
                          width: `${score}%`,
                          background: score >= 80 ? 'hsl(152 60% 45%)' : score >= 60 ? 'hsl(38 80% 52%)' : 'hsl(0 60% 52%)',
                        }} />
                      </div>
                      <span className="cpe-ai-rubric-score">{score}</span>
                    </div>
                  ))}
                </div>
              )}

              {qualityReport.issues?.length > 0 && (
                <div className="mt-2">
                  <span className="cpe-ai-field-label">Issues ({qualityReport.issues.length})</span>
                  {qualityReport.issues.slice(0, 4).map((issue, i) => (
                    <div key={i} className="cpe-ai-issue">
                      <span className={`cpe-ai-issue-sev ${issue.severity}`}>{issue.severity}</span>
                      <span>{issue.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {qualityReport.approval_recommendation && (
                <Field label="Recommendation" value={qualityReport.approval_recommendation} />
              )}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="cpe-ai-section">
            <SectionHeader icon={Cpu} label="Audit History" />
            <div className="cpe-ai-history">
              {history.slice(-8).map((h, i) => (
                <div key={i} className="cpe-ai-history-row">
                  <span className="cpe-ai-history-event">{h.event.replace(/_/g, ' ')}</span>
                  {h.detail && <span className="cpe-ai-history-detail">{h.detail}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="cpe-ai-actions">
        {status === 'idle' && (
          <button className="cpe-autobuild-btn w-full justify-center" onClick={aiWorkers.run}>
            <Sparkles className="w-4 h-4" /> Run AI Workers
          </button>
        )}
        {isRunning && (
          <button className="cpe-mini-btn w-full justify-center" disabled>
            <RotateCcw className="w-3 h-3 animate-spin" style={{ animationDuration: '2s' }} /> Processing…
          </button>
        )}
        {status === 'revision_required' && (
          <button className="cpe-autobuild-btn w-full justify-center" onClick={aiWorkers.continueRevision}>
            <RotateCcw className="w-4 h-4" /> Continue Revision ({revisionCount + 1}/{maxRevisions})
          </button>
        )}
        {status === 'approved' && (
          <button className="cpe-mini-btn w-full justify-center" onClick={aiWorkers.reset}>
            <CheckCircle2 className="w-3 h-3" /> Done — Reset
          </button>
        )}
        {status === 'escalated' && (
          <button className="cpe-mini-btn w-full justify-center" onClick={aiWorkers.reset}>
            <AlertTriangle className="w-3 h-3" /> Acknowledge & Reset
          </button>
        )}
        {status === 'error' && (
          <button className="cpe-mini-btn w-full justify-center" onClick={aiWorkers.reset}>
            <X className="w-3 h-3" /> Dismiss Error
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="w-3 h-3" style={{ color: 'hsl(var(--cpe-text-dim))' }} />
      <span className="cpe-timeline-label">{label}</span>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div className="mb-1.5">
      <span className="cpe-ai-field-label">{label}</span>
      <p className={`cpe-ai-field-value ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}