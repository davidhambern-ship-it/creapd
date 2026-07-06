import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Compass, ShieldCheck, Layers, CheckCircle2, Brain,
  Loader2, CheckCircle, XCircle, ExternalLink, Globe, FileSearch, AlertTriangle
} from 'lucide-react';

const STAGES = [
  { id: 'query_expansion', label: 'Query Expansion', description: 'Breaking topic into targeted search queries', icon: Search },
  { id: 'discovery', label: 'Parallel Discovery', description: 'Searching the web from multiple angles', icon: Compass },
  { id: 'source_verification', label: 'Source Verification', description: 'Fetching and reading real source pages', icon: ShieldCheck },
  { id: 'synthesis', label: 'Synthesis', description: 'Merging findings into structured dossier', icon: Layers },
  { id: 'verification', label: 'Fact Verification', description: 'Cross-checking claims against source text', icon: CheckCircle2 },
  { id: 'critical_analysis', label: 'Critical Analysis', description: 'Identifying gaps and debate potential', icon: Brain },
];

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function safeHostname(url) {
  try { return new URL(url).hostname; } catch { return url || 'Unknown'; }
}

export default function ResearchProgressModal({ open, topicId, topicTitle, onClose }) {
  const [dossier, setDossier] = useState(null);
  const [progress, setProgress] = useState({});
  const [sources, setSources] = useState([]);

  useEffect(() => {
    if (!open || !topicId) return;
    let active = true;
    let pollTimer = null;

    const poll = async () => {
      try {
        const dossiers = await base44.entities.ResearchDossier.filter(
          { topic_id: topicId }, '-created_date', 1
        );
        if (!active) return;

        if (dossiers && dossiers.length > 0) {
          const d = dossiers[0];
          setDossier(d);
          setProgress(safeParse(d.orchestration_metadata, {}));

          const discovery = safeParse(d.discovery_raw_data, null);
          if (discovery?.all_sources) {
            setSources(discovery.all_sources);
          }
        }
      } catch { /* ignore */ }

      pollTimer = setTimeout(poll, 2000);
    };

    poll();
    return () => { active = false; if (pollTimer) clearTimeout(pollTimer); };
  }, [open, topicId]);

  const isComplete = dossier?.status === 'ready';
  const isFailed = dossier?.status === 'failed';
  const currentStage = progress.current_stage;
  const stageOrder = STAGES.map(s => s.id);
  const currentStageIndex = currentStage ? stageOrder.indexOf(currentStage) : -1;
  const stageErrors = progress.stage_errors || [];

  const getStageStatus = (stageId) => {
    if (isComplete) return 'complete';
    const hasError = stageErrors.some(e => e.stage === stageId);
    if (hasError && currentStage === stageId) return 'failed';
    if (currentStageIndex === -1) return 'pending';
    const stageIdx = stageOrder.indexOf(stageId);
    if (stageIdx < currentStageIndex) return 'complete';
    if (stageIdx === currentStageIndex) return 'running';
    return 'pending';
  };

  const stats = {
    sub_queries: progress.sub_queries_run || 0,
    sources_discovered: progress.sources_discovered || sources.length || 0,
    sources_verified: progress.sources_verified || 0,
    findings_collected: progress.findings_collected || 0,
  };

  const timings = progress.stage_timings || {};

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && onClose) onClose(); }}>
      <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="!flex items-center gap-2">
            {isComplete ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
             isFailed ? <XCircle className="w-5 h-5 text-red-400" /> :
             <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            Deep Research Pipeline
          </DialogTitle>
          {topicTitle && <p className="text-sm text-muted-foreground">{topicTitle}</p>}
        </DialogHeader>

        {/* Pipeline stages */}
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const status = getStageStatus(stage.id);
            const Icon = stage.icon;
            const timing = timings[`${stage.id}_ms`];
            return (
              <div key={stage.id} className={`!flex items-center gap-3 p-3 rounded-lg transition-all ${
                status === 'running' ? 'bg-primary/10 border border-primary/30' :
                status === 'complete' ? 'bg-emerald-500/5' :
                status === 'failed' ? 'bg-red-500/10 border border-red-500/20' :
                'bg-secondary/20 opacity-50'
              }`}>
                <div className={`shrink-0 w-8 h-8 rounded-full !flex items-center justify-center ${
                  status === 'running' ? 'bg-primary text-primary-foreground' :
                  status === 'complete' ? 'bg-emerald-500 text-white' :
                  status === 'failed' ? 'bg-red-500 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   status === 'complete' ? <CheckCircle className="w-4 h-4" /> :
                   status === 'failed' ? <XCircle className="w-4 h-4" /> :
                   <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{stage.label}</p>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </div>
                {timing && timing > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(timing / 1000).toFixed(1)}s
                  </span>
                )}
                {status === 'running' && (
                  <span className="text-xs text-primary shrink-0 animate-pulse">Running...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-secondary/20">
          <StatBlock label="Sub-queries" value={stats.sub_queries} icon={Search} />
          <StatBlock label="Sources found" value={stats.sources_discovered} icon={Globe} />
          <StatBlock label="Verified" value={stats.sources_verified} icon={ShieldCheck} />
          <StatBlock label="Findings" value={stats.findings_collected} icon={FileSearch} />
        </div>

        {/* Source discovery feed */}
        {sources.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg bg-secondary/10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Source Discovery Feed</p>
            {sources.map((src, i) => (
              <div key={i} className="!flex items-center gap-2 text-xs animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-foreground/80 truncate flex-1">
                  {src.name || safeHostname(src.url)}
                </span>
                {src.url && (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Completion state */}
        {isComplete && (
          <div className="p-3 rounded-lg bg-emerald-500/10 !flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-emerald-400">
              Research complete — {stats.sources_verified} of {stats.sources_discovered} sources verified.
              Confidence: {dossier?.confidence_score || 0}%
            </p>
          </div>
        )}

        {/* Error state */}
        {isFailed && dossier?.error_message && (
          <div className="p-3 rounded-lg bg-red-500/10 !flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{dossier.error_message}</p>
          </div>
        )}

        {/* Connecting status text */}
        {!dossier && (
          <div className="p-3 rounded-lg bg-primary/10 !flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <p className="text-sm text-primary">Initializing research pipeline...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBlock({ label, value, icon: Icon }) {
  return (
    <div className="text-center">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}