import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc3, Dices, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import WordSearch from '@/components/games/WordSearch';

const STATUS_MESSAGES = {
  planning: 'Planning production requirements...',
  building: 'Generating playlist & content...',
  refreshing: 'Refreshing assets...',
  configuring: 'Preparing configuration...',
  ready: 'Production ready!',
  failed: 'Build failed.',
};

export default function DiscoveryBreakRoom({ buildError, configId, onComplete }) {
  const [activeGame, setActiveGame] = useState(null);
  const [buildStatus, setBuildStatus] = useState('building');

  useEffect(() => {
    if (!configId) return;
    const unsubscribe = base44.entities.MusicProductionConfiguration.subscribe((event) => {
      if (event.type === 'update' && event.data?.id === configId) {
        const updated = event.data;
        if (updated.status) setBuildStatus(updated.status);
        if (updated.status === 'ready' && onComplete) {
          setTimeout(onComplete, 1500);
        }
      }
    });
    return () => unsubscribe();
  }, [configId, onComplete]);

  const statusText = STATUS_MESSAGES[buildStatus] || STATUS_MESSAGES.building;
  const isReady = buildStatus === 'ready';
  const isFailed = buildStatus === 'failed' || buildError;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center">
      <CyberpunkMusicBg variant="eq" />
      <div className="relative z-10 max-w-2xl w-full px-6 py-8 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-4"
          >
            {isReady ? (
              <CheckCircle2 className="w-16 h-16" style={{ color: '#00FF88', filter: 'drop-shadow(0 0 24px #00FF88)' }} />
            ) : isFailed ? (
              <AlertCircle className="w-16 h-16" style={{ color: '#FF4444', filter: 'drop-shadow(0 0 24px #FF4444)' }} />
            ) : (
              <Disc3 className="w-16 h-16" style={{ color: '#00FF88', filter: 'drop-shadow(0 0 24px #00FF88)' }} />
            )}
          </motion.div>
          <motion.h2
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="text-2xl font-heading font-bold mb-2"
            style={{ color: isFailed ? '#FF4444' : '#00FF88', textShadow: `0 0 20px ${isFailed ? 'rgba(255,68,68,0.6)' : 'rgba(0,255,136,0.6)'}` }}
          >
            {isReady ? 'Production Ready!' : isFailed ? 'Build Failed' : 'Discovery Complete'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-400 mb-4 text-sm"
          >
            {isReady ? 'Taking you to your dashboard...' : statusText}
          </motion.p>
          {/* Indeterminate progress bar */}
          {!isReady && !isFailed && (
            <div className="h-1 rounded-full mx-auto max-w-xs bg-white/10 overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/2 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, #00FF88, #FF00FF, transparent)' }}
              />
            </div>
          )}
        </div>

        {(buildError || isFailed) && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {buildError || 'Build encountered an error. You can return to configure and retry.'}
          </div>
        )}

        {/* Break Room */}
        <AnimatePresence mode="wait">
          {!activeGame ? (
            <motion.div
              key="launcher"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="cp-glass p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Dices className="w-4 h-4" style={{ color: '#FF00FF' }} />
                <h3 className="text-sm font-heading font-semibold text-white">Break Room</h3>
                <span className="text-[11px] text-gray-500">— Play while CREAPD works</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setActiveGame('wordsearch')}
                  className="rounded-xl p-4 border border-white/10 bg-gradient-to-br from-berna-emerald/10 to-transparent hover:border-berna-emerald/40 hover:bg-berna-emerald/5 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🧩</div>
                  <div className="text-sm font-semibold text-white">Word Search</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Find the hidden words</div>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="cp-glass p-3"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Dices className="w-3.5 h-3.5" style={{ color: '#FF00FF' }} />
                  <span className="text-xs text-gray-400">Break Room</span>
                </div>
                <button
                  onClick={() => setActiveGame(null)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Back to games
                </button>
              </div>
              <div className="flex justify-center">
                {activeGame === 'wordsearch' && <WordSearch onClose={() => setActiveGame(null)} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}