import React, { useState } from 'react';
import {
  Brain, Scale, AlertTriangle, GitBranch, HelpCircle,
  ShieldCheck, ChevronDown, ChevronUp, Gauge, Users, FileSearch
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function ScoreBar({ score, max = 10 }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = score >= 7 ? 'bg-amber-500' : score >= 4 ? 'bg-primary' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground shrink-0">{score.toFixed(1)}/{max}</span>
    </div>
  );
}

function CollapsibleSection({ icon: Icon, title, count, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg bg-secondary/20 border border-white/[0.04]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium">{title}</span>
          {count > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{count}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 pt-0 space-y-3">{children}</div>}
    </div>
  );
}

export default function SpecialistInsights({ dossier }) {
  if (!dossier) return null;

  const critical = safeParse(dossier.critical_analysis_report, {});
  const claims = safeParse(dossier.claim_confidence_scores, []);
  const org = safeParse(dossier.organization_structure, {});
  const meta = safeParse(dossier.orchestration_metadata, {});
  const roleAssignments = safeParse(dossier.role_assignments, {});

  const grayAreas = critical.gray_areas || [];
  const logicalGaps = critical.logical_gaps || [];
  const competingPerspectives = critical.competing_perspectives || [];
  const openQuestions = critical.open_questions || [];
  const themes = org.themes || [];
  const stageErrors = meta.stage_errors || [];
  const stageTimings = meta.stage_timings || {};

  const hasAnySpecialistData =
    grayAreas.length > 0 ||
    logicalGaps.length > 0 ||
    competingPerspectives.length > 0 ||
    openQuestions.length > 0 ||
    claims.length > 0 ||
    (dossier.debate_potential_score || 0) > 0;

  if (!hasAnySpecialistData) {
    return (
      <div className="mt-3 p-4 rounded-lg bg-secondary/20 border border-white/[0.04] text-center">
        <Brain className="w-5 h-5 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          No specialist analysis data available. Run research via the Research Department Orchestrator to generate insights.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Brain className="w-4 h-4 text-berna-purple" />
        <span className="text-xs font-semibold uppercase tracking-wider text-berna-purple">Specialist Insights</span>
      </div>

      {/* Debate Potential Score */}
      {(dossier.debate_potential_score || 0) > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium">Debate Potential</span>
          </div>
          <ScoreBar score={dossier.debate_potential_score} max={10} />
        </div>
      )}

      {/* Competing Perspectives */}
      {competingPerspectives.length > 0 && (
        <CollapsibleSection
          icon={Scale}
          title="Competing Perspectives"
          count={competingPerspectives.length}
          color="text-amber-400"
          defaultOpen
        >
          {competingPerspectives.map((p, i) => (
            <div key={i} className="p-3 rounded-md bg-secondary/40 border border-white/[0.03]">
              <div className="flex items-start gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{p.viewpoint}</p>
              </div>
              {p.evidence && (
                <p className="text-xs text-muted-foreground ml-5 mb-1"><span className="text-emerald-400 font-medium">Evidence:</span> {p.evidence}</p>
              )}
              {p.weakness && (
                <p className="text-xs text-muted-foreground ml-5"><span className="text-red-400 font-medium">Weakness:</span> {p.weakness}</p>
              )}
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Gray Areas */}
      {grayAreas.length > 0 && (
        <CollapsibleSection
          icon={AlertTriangle}
          title="Gray Areas"
          count={grayAreas.length}
          color="text-amber-400"
        >
          <ul className="space-y-2">
            {grayAreas.map((g, i) => (
              <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-md bg-secondary/30">
                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{g}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Logical Gaps */}
      {logicalGaps.length > 0 && (
        <CollapsibleSection
          icon={GitBranch}
          title="Logical Gaps"
          count={logicalGaps.length}
          color="text-red-400"
        >
          <ul className="space-y-2">
            {logicalGaps.map((g, i) => (
              <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-md bg-secondary/30">
                <GitBranch className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{g}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Open Questions */}
      {openQuestions.length > 0 && (
        <CollapsibleSection
          icon={HelpCircle}
          title="Open Questions"
          count={openQuestions.length}
          color="text-primary"
        >
          <ul className="space-y-2">
            {openQuestions.map((q, i) => (
              <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-md bg-secondary/30">
                <HelpCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{q}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Claim Confidence Scores */}
      {claims.length > 0 && (
        <CollapsibleSection
          icon={ShieldCheck}
          title="Claim Confidence"
          count={claims.length}
          color="text-emerald-400"
        >
          <div className="space-y-2">
            {claims.map((c, i) => (
              <div key={i} className="p-2 rounded-md bg-secondary/30">
                <p className="text-sm mb-1">{c.claim}</p>
                <ScoreBar score={c.score} max={100} />
                {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Orchestration Metadata */}
      {Object.keys(stageTimings).length > 0 && (
        <CollapsibleSection
          icon={FileSearch}
          title="Pipeline Metadata"
          color="text-muted-foreground"
        >
          <div className="space-y-1 text-xs text-muted-foreground">
            {Object.entries(roleAssignments).length > 0 && (
              <div>
                <span className="font-medium text-foreground/80">Models:</span>{' '}
                {Object.entries(roleAssignments).map(([role, model]) => `${role}: ${model}`).join(', ')}
              </div>
            )}
            {Object.entries(stageTimings).map(([stage, ms]) => (
              <div key={stage}>
                <span className="font-medium text-foreground/80">{stage}:</span> {(ms / 1000).toFixed(1)}s
              </div>
            ))}
            {stageErrors.length > 0 && (
              <div className="text-red-400">Errors: {stageErrors.join(', ')}</div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}