import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import { Disc3, CheckCircle2, Loader2, ListMusic, Search, Mic2, Package, Trophy, ClipboardList, AlertCircle } from 'lucide-react';

const STAGES = [
  { key: 'planning', label: 'Requirements', icon: ClipboardList, color: '#A78BFA' },
  { key: 'playlist', label: 'Playlist', icon: ListMusic, color: '#FF00FF' },
  { key: 'research', label: 'Research', icon: Search, color: '#00FFFF' },
  { key: 'topics', label: 'Topics', icon: Mic2, color: '#00FF88' },
  { key: 'assets', label: 'Assets', icon: Package, color: '#FFA500' },
  { key: 'top10', label: 'Top 10', icon: Trophy, color: '#FFD700' },
  { key: 'rundown', label: 'Rundown', icon: Disc3, color: '#FF00FF' },
];

export default function RealtimeBuildProgress({ configId, onComplete }) {
  const [buildLog, setBuildLog] = useState([]);
  const [configStatus, setConfigStatus] = useState('building');
  const [counts, setCounts] = useState({ playlist: 0, research: 0, topics: 0, assets: 0, top10: 0, rundown: 0 });
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // Subscribe to config entity changes for real-time build_log updates
  useEffect(() => {
    if (!configId) return;

    const unsubscribe = base44.entities.MusicProductionConfiguration.subscribe((event) => {
      if (event.type === 'update' && event.data?.id === configId) {
        const updated = event.data;
        if (updated.build_log) {
          try { setBuildLog(JSON.parse(updated.build_log)); } catch {}
        }
        if (updated.status) setConfigStatus(updated.status);
        if (updated.status === 'failed') {
          setError('Build failed. Check configuration and try again.');
        }
        if (updated.status === 'ready' && onComplete) {
          setTimeout(onComplete, 1500);
        }
      }
    });

    // Also poll for entity counts every 5 seconds to show what's been produced
    const pollCounts = async () => {
      try {
        const [p, r, t, a, t10, rd] = await Promise.all([
          base44.entities.PlaylistItem.filter({ configuration_id: configId }),
          base44.entities.MusicResearchItem.filter({ configuration_id: configId }),
          base44.entities.MusicTopic.filter({ configuration_id: configId }),
          base44.entities.MusicAsset.filter({ configuration_id: configId }),
          base44.entities.Top10Item.filter({ configuration_id: configId }),
          base44.entities.ShowRundownItem.filter({ configuration_id: configId }),
        ]);
        setCounts({
          playlist: p?.length || 0,
          research: r?.length || 0,
          topics: t?.length || 0,
          assets: a?.length || 0,
          top10: t10?.length || 0,
          rundown: rd?.length || 0,
        });
      } catch {}
    };

    pollCounts();
    pollRef.current = setInterval(pollCounts, 5000);

    return () => {
      unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [configId]);

  // Determine which stages are complete/in-progress
  const stageStatuses = STAGES.map((stage) => {
    const logEntries = buildLog.filter(e => e.stage === stage.key || e.stage?.includes(stage.key));
    const isComplete = logEntries.some(e => e.status === 'complete' || (e.success !== undefined && e.success));
    const isError = logEntries.some(e => e.status === 'failed' || (e.success === false));
    return { ...stage, isComplete, isError };
  });

  // Find the current in-progress stage (first incomplete)
  const currentStageIdx = stageStatuses.findIndex(s => !s.isComplete && !s.isError);
  const activeStageIdx = currentStageIdx === -1 ? STAGES.length : currentStageIdx;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center">
      <CyberpunkMusicBg variant="eq" />
      <div className="relative z-10 max-w-2xl w-full px-6 py-8 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-4"
          >
            <Disc3 className="w-14 h-14" style={{ color: '#FF00FF', filter: 'drop-shadow(0 0 20px #FF00FF)' }} />
          </motion.div>
          <motion.h2
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-heading font-bold mb-1"
            style={{ color: '#FF00FF', textShadow: '0 0 20px rgba(255,0,255,0.5)' }}
          >
            Building Your Music Production
          </motion.h2>
          <p className="text-gray-500 text-xs">
            {configStatus === 'failed' ? 'Build encountered an error' : 'Live pipeline progress — watch each stage produce'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
            <span>Progress</span>
            <span>{activeStageIdx}/{STAGES.length} stages</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              animate={{ width: `${(activeStageIdx / STAGES.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #A78BFA, #FF00FF, #00FF88, #FFD700)' }}
            />
          </div>
        </div>

        {/* Stage list */}
        <div className="space-y-2">
          {STAGES.map((stage, idx) => {
            const status = stageStatuses[idx];
            const StageIcon = stage.icon;
            const countKey = stage.key === 'planning' ? null : stage.key;
            const count = countKey ? counts[countKey] : null;

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                style={{
                  borderColor: status.isComplete ? `${stage.color}40` : status.isError ? '#EF444440' : idx === currentStageIdx ? `${stage.color}60` : 'rgba(255,255,255,0.06)',
                  background: status.isComplete ? `${stage.color}08` : status.isError ? 'rgba(239,68,68,0.05)' : idx === currentStageIdx ? `${stage.color}0A` : 'transparent',
                }}
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: status.isComplete ? `${stage.color}15` : 'rgba(255,255,255,0.03)' }}>
                  {status.isComplete ? (
                    <CheckCircle2 className="w-5 h-5" style={{ color: stage.color }} />
                  ) : status.isError ? (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  ) : idx === currentStageIdx ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: stage.color }} />
                  ) : (
                    <StageIcon className="w-5 h-5 text-gray-600" />
                  )}
                </div>

                {/* Stage info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: status.isComplete ? stage.color : status.isError ? '#F87171' : idx === currentStageIdx ? '#fff' : '#666' }}>
                      {stage.label}
                    </span>
                    {count !== null && count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: `${stage.color}15`, color: stage.color }}>
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    {status.isComplete ? 'Complete' : status.isError ? 'Failed' : idx === currentStageIdx ? 'In progress...' : 'Queued'}
                  </div>
                </div>

                {/* Stage number */}
                <span className="text-[10px] text-gray-700 font-mono">{String(idx + 1).padStart(2, '0')}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Completion indicator */}
        <AnimatePresence>
          {configStatus === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Build complete — loading dashboard...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}