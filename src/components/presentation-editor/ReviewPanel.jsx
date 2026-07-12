import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, CheckCircle, XCircle, Clock, FileStack, TrendingUp,
  Download, Share2, Loader2, Check, RefreshCw, AlertTriangle,
} from 'lucide-react';

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function ScoreBar({ label, score }) {
  const color = score >= 90 ? 'bg-emerald-500' : score >= 80 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 capitalize">{label.replace(/_/g, ' ')}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{score}</span>
    </div>
  );
}

export default function ReviewPanel({
  presentation,
  onClose,
  onApprove,
  onReject,
  onShare,
  onExportMP4,
  onRegenerate,
  approving,
  sharing,
  exporting,
  regenerating,
  exportJob,
  shareResult,
}) {
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const metadata = (() => { try { return JSON.parse(presentation.presentation_metadata || '{}'); } catch { return {}; } })();
  const qaScores = (() => { try { return JSON.parse(presentation.qa_scores || '{}'); } catch { return {}; } })();
  const isApproved = presentation.status === 'approved';
  const qaEntries = Object.entries(qaScores);

  return (
    <div className="w-80 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto cpe-review-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
        <h3 className="text-sm font-heading font-semibold">Review & Production</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isApproved ? 'default' : 'outline'} className="capitalize">{presentation.status}</Badge>
          {presentation.qa_result === 'pass' && <Badge className="bg-emerald-600">QA Pass</Badge>}
          {presentation.qa_result === 'warning' && <Badge className="bg-yellow-600">QA Warning</Badge>}
          {presentation.qa_result === 'fail' && <Badge className="bg-red-600">QA Fail</Badge>}
        </div>

        {/* Production Overview */}
        <div className="space-y-3">
          <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Production Overview</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{formatTime(presentation.total_runtime_ms || 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileStack className="w-4 h-4 text-muted-foreground" />
              <span>{presentation.story_count} stories</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span>{presentation.confidence_score}/100</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">v{presentation.presentation_version}</span>
            </div>
          </div>
          {metadata.creator && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Created by {metadata.creator} on {new Date(metadata.generation_timestamp || presentation.created_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* QA Scores */}
        {qaEntries.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Quality Assurance</h4>
              <Badge variant={presentation.confidence_score >= 90 ? 'default' : 'outline'}>
                {presentation.confidence_score >= 95 ? 'Broadcast Ready' :
                 presentation.confidence_score >= 90 ? 'Review Recommended' :
                 presentation.confidence_score >= 80 ? 'Minor Issues' : 'Regenerate'}
              </Badge>
            </div>
            {qaEntries.map(([key, val]) => (
              <ScoreBar key={key} label={key} score={val} />
            ))}
          </div>
        )}

        {/* Producer Review Actions */}
        {!isApproved ? (
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Producer Review</h4>
            <p className="text-xs text-muted-foreground">
              Review the presentation and approve or request changes.
            </p>
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
            <p className="text-xs text-muted-foreground">
              This presentation has been approved and is ready for export.
            </p>

            {/* Export MP4 */}
            <div className="flex flex-col gap-2">
              {exportJob ? (
                <div className="text-center py-2">
                  {exportJob.status === 'queued' && (
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Export job queued
                    </p>
                  )}
                  {exportJob.status === 'rendering' && (
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Rendering... {exportJob.progress}%
                    </p>
                  )}
                  {exportJob.status === 'complete' && (
                    <p className="text-xs text-emerald-500 flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Export complete
                    </p>
                  )}
                  {exportJob.status === 'failed' && (
                    <p className="text-xs text-red-500">Export failed</p>
                  )}
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={onExportMP4} disabled={exporting}>
                  {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating job...</> : <><Download className="w-4 h-4" /> Export MP4</>}
                </Button>
              )}

              {/* Share to CREAPD */}
              {shareResult ? (
                <div className="text-center py-2">
                  <p className="text-xs text-emerald-500 flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> Shared to CREAPD Showcase
                  </p>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={onShare} disabled={sharing}>
                  {sharing ? <><Loader2 className="w-4 h-4 animate-spin" /> Sharing...</> : <><Share2 className="w-4 h-4" /> Share with CREAPD</>}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Full Regeneration */}
        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">APD Regeneration</h4>
          {!confirmRegenerate ? (
            <Button variant="outline" className="w-full" onClick={() => setConfirmRegenerate(true)} disabled={regenerating}>
              <RefreshCw className="w-4 h-4" /> Regenerate with APD
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This will replace all slides with new APD-generated content. Old slides will be lost.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmRegenerate(false)}>Cancel</Button>
                <Button size="sm" className="flex-1 bg-primary" onClick={onRegenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}