import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, XCircle, Clock, FileStack, TrendingUp, Share2, Loader2, Check } from 'lucide-react';

function formatTime(ms) {
  const totalSec = Math.floor(Number(ms || 0) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function ScoreBar({ label, score }) {
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)));
  const color = safeScore >= 90 ? 'bg-emerald-500' : safeScore >= 80 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 capitalize">{label.replace(/_/g, ' ')}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${safeScore}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{safeScore}</span>
    </div>
  );
}

export default function ReviewPanel({
  presentation,
  slides,
  onClose,
  onApprove,
  onReject,
  onShare,
  approving,
  sharing,
  shareResult,
}) {
  const isApproved = presentation?.status === 'approved';
  const qaScores = (() => {
    try { return JSON.parse(presentation?.qa_scores || '{}'); } catch { return {}; }
  })();
  const qaEntries = Object.entries(qaScores);
  const slideCount = slides?.length || presentation?.story_count || 0;

  return (
    <div className="w-full min-h-full border-l border-border bg-card flex flex-col overflow-y-auto cpe-review-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
        <div>
          <h3 className="text-sm font-heading font-semibold">Review Room</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Manual review · no AI credits</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors" title="Close Review Room">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isApproved ? 'default' : 'outline'} className="capitalize">{presentation?.status || 'editing'}</Badge>
          {presentation?.qa_result === 'pass' && <Badge className="bg-emerald-600">Prior QA Pass</Badge>}
          {presentation?.qa_result === 'warning' && <Badge className="bg-yellow-600">Prior QA Warning</Badge>}
          {presentation?.qa_result === 'fail' && <Badge className="bg-red-600">Prior QA Fail</Badge>}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Production Overview</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{formatTime(presentation?.total_runtime_ms || 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileStack className="w-4 h-4 text-muted-foreground" />
              <span>{slideCount} slides</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span>{Number(presentation?.confidence_score || 0)}/100</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              v{presentation?.presentation_version || 1}
            </div>
          </div>
        </div>

        {qaEntries.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Stored QA Scores</h4>
            <p className="text-[10px] text-muted-foreground">These are existing results only. This room does not run a paid AI review.</p>
            {qaEntries.map(([key, val]) => <ScoreBar key={key} label={key} score={val} />)}
          </div>
        )}

        {!isApproved ? (
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Producer Decision</h4>
            <p className="text-xs text-muted-foreground">Inspect the slides yourself, then approve the presentation or request changes.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={onApprove} disabled={approving} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {approving ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</> : <><CheckCircle className="w-4 h-4" /> Approve Presentation</>}
              </Button>
              <Button onClick={onReject} variant="outline" className="w-full">
                <XCircle className="w-4 h-4" /> Request Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h4 className="text-sm font-heading font-semibold text-emerald-500">Approved</h4>
            </div>
            <p className="text-xs text-muted-foreground">This presentation has been approved by the producer.</p>
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Share</h4>
          {shareResult ? (
            <p className="text-xs text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> Shared with CREAPD</p>
          ) : (
            <Button variant="outline" className="w-full" onClick={onShare} disabled={sharing}>
              {sharing ? <><Loader2 className="w-4 h-4 animate-spin" /> Sharing...</> : <><Share2 className="w-4 h-4" /> Share with CREAPD</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
