import React from 'react';
import {
  CLASSIFICATION_LABELS,
  STATUS_LABELS,
  QUALITY_MODES,
} from '@/lib/creapd/controllerConstants';
import { ShieldCheck, AlertTriangle, ArrowUpRight, RotateCcw, Eye, FileX } from 'lucide-react';

const STATUS_ICONS = {
  pass: ShieldCheck,
  revise: RotateCcw,
  escalate: ArrowUpRight,
  producer_review: Eye,
  invalid_report: FileX,
};

function ScoreBar({ label, score, minScore, critical }) {
  const pct = Math.min(100, Math.max(0, score));
  const passed = !minScore || score >= minScore;
  const barColor = passed
    ? 'hsl(152 60% 45%)'
    : critical
      ? 'hsl(0 72% 51%)'
      : 'hsl(25 95% 55%)';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {critical && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
          {label}
        </span>
        <span className={`text-[10px] font-mono ${passed ? 'text-muted-foreground' : 'text-destructive'}`}>
          {score}{minScore ? ` / ${minScore}` : ''}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

export default function QualityReportCard({ report }) {
  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.pass;
  const classInfo = CLASSIFICATION_LABELS[report.classification] || CLASSIFICATION_LABELS.draft;
  const StatusIcon = STATUS_ICONS[report.status] || ShieldCheck;

  let scores = report.scores;
  if (typeof scores === 'string') {
    try { scores = JSON.parse(scores); } catch { scores = {}; }
  }
  if (!scores) scores = {};

  let recommendations = report.recommendations;
  if (typeof recommendations === 'string') {
    try { recommendations = JSON.parse(recommendations); } catch { recommendations = []; }
  }
  if (!recommendations) recommendations = [];

  let controllerDecision = report.controller_decision;
  if (typeof controllerDecision === 'string') {
    try { controllerDecision = JSON.parse(controllerDecision); } catch { controllerDecision = null; }
  }

  const modeConfig = QUALITY_MODES[report.quality_mode] || QUALITY_MODES.standard;
  const failedCats = controllerDecision?.failed_critical_categories || [];

  return (
    <div className="glass-panel p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusInfo.dot ? 'bg-white/5' : ''}`}>
            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground">{report.asset_type}</p>
            <p className="text-sm font-heading font-semibold text-white truncate max-w-[180px]">
              {report.asset_id}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-mono font-bold ${report.overall_score >= modeConfig.minScore ? 'text-berna-emerald' : 'text-berna-orange'}`}>
            {report.overall_score}
          </span>
          <p className={`text-[10px] uppercase tracking-wider ${classInfo.color}`}>{classInfo.label}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${statusInfo.color} bg-white/5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
          {statusInfo.label}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {report.quality_mode || 'standard'} mode ({modeConfig.minScore}+)
        </span>
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="uppercase tracking-wider text-muted-foreground">Confidence</span>
        <span className={`font-mono ${report.confidence >= 85 ? 'text-muted-foreground' : 'text-yellow-400'}`}>
          {report.confidence}%
          {report.confidence < 85 && ' (low)'}
        </span>
      </div>

      {/* Category scores */}
      {Object.keys(scores).length > 0 && (
        <div className="space-y-2 pt-1">
          {Object.entries(scores).map(([cat, score]) => {
            const criticalMap = {
              accuracy: 95,
              technical_integrity: 95,
              copyright_compliance: 100,
              copyright: 100,
              accessibility: 85,
              brand_consistency: 90,
              educational_value: 90,
            };
            return (
              <ScoreBar
                key={cat}
                label={cat.replace(/_/g, ' ')}
                score={score}
                minScore={criticalMap[cat]}
                critical={!!criticalMap[cat]}
              />
            );
          })}
        </div>
      )}

      {/* Failed critical categories */}
      {failedCats.length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2">
          <p className="text-[10px] uppercase tracking-wider text-destructive mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Critical Failures
          </p>
          {failedCats.map((fc, i) => (
            <p key={i} className="text-[11px] text-destructive/80">
              {fc.category.replace(/_/g, ' ')}: {fc.score} / {fc.min}
            </p>
          ))}
        </div>
      )}

      {/* Revision metadata */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-white/[0.06]">
        <span>Revision {report.review_iteration || 1} / {report.maximum_iterations || 5}</span>
        {report.assigned_worker && (
          <span className="text-berna-purple">→ {report.assigned_worker}</span>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Recommendations</p>
          <ul className="space-y-0.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-[11px] text-white/70 flex items-start gap-1.5">
                <span className="mt-1 w-1 h-1 rounded-full bg-berna-purple shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}