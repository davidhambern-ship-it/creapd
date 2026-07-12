import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  ClipboardList, ListMusic, Search, Mic2, Package,
  Trophy, Disc3, CheckCircle2, AlertCircle, Loader2, ChevronDown,
} from 'lucide-react';

const STAGES = [
  { key: 'planning', label: 'Requirements', icon: ClipboardList, color: '#A78BFA' },
  { key: 'playlist', label: 'Playlist', icon: ListMusic, color: '#FF00FF' },
  { key: 'research', label: 'Research', icon: Search, color: '#00FFFF' },
  { key: 'topics', label: 'Topics', icon: Mic2, color: '#00FF88' },
  { key: 'assets', label: 'Assets', icon: Package, color: '#FFA500' },
  { key: 'top10', label: 'Top 10', icon: Trophy, color: '#FFD700' },
  { key: 'rundown', label: 'Rundown', icon: Disc3, color: '#FF00FF' },
];

function parseBuildLog(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export default function BuildStageTracker({ configId }) {
  const [log, setLog] = useState([]);
  const [status, setStatus] = useState('building');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!configId) return;
    const unsubscribe = base44.entities.MusicProductionConfiguration.subscribe((event) => {
      if (event.type === 'update' && event.data?.id === configId) {
        setLog(parseBuildLog(event.data.build_log));
        if (event.data.status) setStatus(event.data.status);
      }
    });
    return () => unsubscribe();
  }, [configId]);

  const stageStatuses = STAGES.map((stage) => {
    const entries = log.filter(e => e.stage === stage.key || (e.stage && e.stage.includes(stage.key)));
    const complete = entries.some(e => e.status === 'complete' || (e.success !== undefined && e.success));
    const failed = entries.some(e => e.status === 'failed' || e.success === false);
    const errorEntry = entries.find(e => e.error || (e.success === false && e.error));
    return { ...stage, complete, failed, error: errorEntry?.error };
  });

  const currentIdx = stageStatuses.findIndex(s => !s.complete && !s.failed);
  const activeIdx = currentIdx === -1 ? STAGES.length : currentIdx;
  const failedStages = stageStatuses.filter(s => s.failed);
  const isFailed = status === 'failed' || failedStages.length > 0;

  return (
    <div className="cp-glass p-3">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 text-left"
      >
        <ActivityIcon status={status} isFailed={isFailed} />
        <h4 className="text-xs font-heading font-semibold text-white flex-1">
          Build Tracker
        </h4>
        <span className="text-[10px] font-mono text-gray-500">
          {activeIdx}/{STAGES.length}
          {isFailed && <span className="text-red-400 ml-1.5">• {failedStages.length} failed</span>}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Progress bar */}
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          animate={{ width: `${(activeIdx / STAGES.length) * 100}%` }}
          transition={{ duration: 0.4 }}
          className="h-full rounded-full"
          style={{
            background: isFailed
              ? 'linear-gradient(90deg, #EF4444, #F87171)'
              : 'linear-gradient(90deg, #A78BFA, #FF00FF, #00FF88)',
          }}
        />
      </div>

      {/* Expanded stage list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5">
              {stageStatuses.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.key}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg border transition-all"
                    style={{
                      borderColor: s.complete
                        ? `${s.color}30`
                        : s.failed
                        ? 'rgba(239,68,68,0.25)'
                        : idx === currentIdx
                        ? `${s.color}50`
                        : 'rgba(255,255,255,0.04)',
                      background: s.complete
                        ? `${s.color}08`
                        : s.failed
                        ? 'rgba(239,68,68,0.04)'
                        : idx === currentIdx
                        ? `${s.color}0A`
                        : 'transparent',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: s.complete ? `${s.color}15` : 'rgba(255,255,255,0.03)' }}
                    >
                      {s.complete ? (
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: s.color }} />
                      ) : s.failed ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : idx === currentIdx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: s.color }} />
                      ) : (
                        <Icon className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </div>
                    <span
                      className="text-[11px] font-medium flex-1"
                      style={{
                        color: s.complete ? s.color : s.failed ? '#F87171' : idx === currentIdx ? '#fff' : '#666',
                      }}
                    >
                      {s.label}
                    </span>
                    <span className="text-[9px] text-gray-600 font-mono">
                      {s.complete ? 'OK' : s.failed ? 'FAIL' : idx === currentIdx ? '...' : 'queued'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Crash details */}
            {failedStages.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 space-y-2">
                {failedStages.map((s) => (
                  <div key={s.key}>
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      {s.label} crashed
                    </div>
                    {s.error && (
                      <p className="text-[10px] text-red-300/70 mt-0.5 ml-4 font-mono break-all">
                        {s.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityIcon({ status, isFailed }) {
  if (isFailed || status === 'failed') {
    return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  }
  if (status === 'ready') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  }
  return <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />;
}