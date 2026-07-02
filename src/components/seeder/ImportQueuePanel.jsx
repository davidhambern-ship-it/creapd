import React from 'react';
import { Loader2, Play, Pause, RotateCcw, CheckCircle2, XCircle, Database, Clock, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const JOB_STATUS_META = {
  'Queued': { color: 'text-primary', bg: 'bg-primary/10', icon: Clock },
  'Running': { color: 'text-accent', bg: 'bg-accent/10', icon: Loader2 },
  'Validating': { color: 'text-accent', bg: 'bg-accent/10', icon: Loader2 },
  'Completed': { color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', icon: CheckCircle2 },
  'Failed': { color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  'Paused': { color: 'text-muted-foreground', bg: 'bg-secondary', icon: Pause },
  'Cancelled': { color: 'text-muted-foreground', bg: 'bg-secondary', icon: XCircle },
  'Retry': { color: 'text-accent', bg: 'bg-accent/10', icon: RotateCcw },
};

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function parseMeta(str) {
  if (!str) return {};
  try { return JSON.parse(str); } catch { return {}; }
}

export default function ImportQueuePanel({ jobs, onExecute, onRetry, onPause, loading }) {
  // Sort by created_date descending
  const sorted = [...jobs].sort((a, b) => {
    const da = new Date(a.created_date || 0).getTime();
    const db = new Date(b.created_date || 0).getTime();
    return db - da;
  });

  const active = sorted.filter(j => ['Queued', 'Running', 'Validating', 'Retry'].includes(j.status));
  const completed = sorted.filter(j => ['Completed', 'Failed', 'Paused', 'Cancelled'].includes(j.status));

  const renderJob = (job) => {
    const meta = JOB_STATUS_META[job.status] || JOB_STATUS_META['Queued'];
    const Icon = meta.icon;
    const jobMeta = parseMeta(job.metadata);
    const isActive = ['Running', 'Validating'].includes(job.status);

    return (
      <div key={job.id} className="glass-panel p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${meta.color} ${isActive ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{job.work_title || 'Unknown work'}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{job.status}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {job.tradition && <span>{job.tradition}</span>}
              <span>·</span>
              <span>{job.import_method}</span>
              {job.started_at && <><span>·</span><span>Started: {new Date(job.started_at).toLocaleString()}</span></>}
            </div>

            {/* Progress bar for active jobs */}
            {isActive && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{jobMeta.handler_name || 'Processing...'}</span>
                  <span>{job.progress_percent || 0}%</span>
                </div>
                <div className="w-full bg-secondary/30 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-accent h-full transition-all duration-500" style={{ width: `${job.progress_percent || 0}%` }} />
                </div>
                {jobMeta.resume_info && (
                  <p className="text-xs text-muted-foreground mt-1">{jobMeta.resume_info}</p>
                )}
              </div>
            )}

            {/* Records imported */}
            {job.records_imported > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" /> {job.records_imported.toLocaleString()}
                  {job.total_records_expected > 0 && ` / ${job.total_records_expected.toLocaleString()}`} records
                </span>
                {job.duration_seconds > 0 && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(job.duration_seconds)}</span>
                )}
                {job.duplicate_check_status !== 'Not Checked' && (
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {job.duplicate_check_status}</span>
                )}
              </div>
            )}

            {/* Error log */}
            {job.error_log && (
              <div className="mt-2 p-2 rounded-md bg-destructive/10 text-xs text-destructive">
                {job.error_log.substring(0, 200)}{job.error_log.length > 200 ? '...' : ''}
              </div>
            )}

            {/* Validation results */}
            {job.validation_status === 'Validation Failed' && (
              <div className="mt-2 p-2 rounded-md bg-destructive/10 text-xs text-destructive">
                Validation failed — see error log for details.
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {job.status === 'Queued' && (
                <Button size="sm" onClick={() => onExecute(job)} disabled={loading}>
                  <Play className="w-3 h-3 mr-1" /> Execute
                </Button>
              )}
              {isActive && (
                <Button size="sm" variant="outline" onClick={() => onPause(job)} disabled={loading}>
                  <Pause className="w-3 h-3 mr-1" /> Pause
                </Button>
              )}
              {job.status === 'Failed' && (
                <Button size="sm" variant="outline" onClick={() => onRetry(job)} disabled={loading}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Retry
                </Button>
              )}
              {job.status === 'Paused' && (
                <Button size="sm" variant="outline" onClick={() => onExecute(job)} disabled={loading}>
                  <Play className="w-3 h-3 mr-1" /> Resume
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Active Jobs */}
      {active.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-accent animate-spin" /> Active Jobs ({active.length})
          </h3>
          <div className="space-y-2">
            {active.map(renderJob)}
          </div>
        </div>
      )}

      {/* Completed / Failed Jobs */}
      <div>
        <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Job History ({completed.length})
        </h3>
        {completed.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <Database className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No import jobs yet. Import works from the Seed Manifest to see them here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completed.slice(0, 50).map(renderJob)}
          </div>
        )}
      </div>
    </div>
  );
}