import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Dices, X, OctagonX, Sparkles } from 'lucide-react';
import WordSearch from '@/components/games/WordSearch';
import Asteroids from '@/components/games/Asteroids';

/**
 * GlobalBreakRoom — a reusable loading/entertainment screen for any
 * long-running generation process across the app.
 *
 * Props:
 *  - title:        string shown while loading
 *  - subtitle:     string shown below title
 *  - status:       'loading' | 'ready' | 'failed'
 *  - error:        string error message (shows when status='failed')
 *  - readyTitle:   string shown when status='ready' (default: "All Ready!")
 *  - readyText:    string shown below ready title (default: "Taking you there...")
 *  - onComplete:   callback fired ~1.5s after status becomes 'ready'
 *  - onCancel:     callback fired when user clicks Cancel (omit to hide button)
 *  - progressTracker: optional ReactNode rendered below the break room
 *                      (e.g. a pipeline tracker specific to the calling page)
 */
export default function GlobalBreakRoom({
  title = 'Working on it...',
  subtitle = 'CREAPD is generating your content',
  status = 'loading',
  error,
  readyTitle = 'All Ready!',
  readyText = 'Taking you there...',
  onComplete,
  onCancel,
  onGenerateNext,
  nextPointTitle,
  progressTracker,
}) {
  const [activeGame, setActiveGame] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const isReady = status === 'ready';
  const isFailed = status === 'failed' || !!error;

  const handleCancel = async () => {
    if (!onCancel || cancelling) return;
    setCancelling(true);
    try {
      await onCancel();
    } catch (err) {
      console.error('Cancel failed:', err.message);
    }
    setCancelling(false);
  };

  return (
    <div className="relative h-full min-h-full overflow-hidden bg-background flex items-center justify-center">
      {/* Neutral animated background — works in any production profile */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 creapd-bg-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[100px] animate-orb-1" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-[100px] animate-orb-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-berna-emerald/5 blur-[80px] animate-orb-3" />
      </div>

      <div className="relative z-10 max-w-2xl w-full px-6 py-4 max-h-full overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={isReady ? {} : { rotate: 360 }}
            transition={isReady ? {} : { duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-4"
          >
            {isReady ? (
              <CheckCircle2 className="w-16 h-16 text-berna-emerald" style={{ filter: 'drop-shadow(0 0 24px hsl(152 60% 45% / 0.6))' }} />
            ) : isFailed ? (
              <AlertCircle className="w-16 h-16 text-destructive" style={{ filter: 'drop-shadow(0 0 24px hsl(0 72% 51% / 0.6))' }} />
            ) : (
              <Loader2 className="w-16 h-16 text-primary" style={{ filter: 'drop-shadow(0 0 24px hsl(270 80% 60% / 0.6))' }} />
            )}
          </motion.div>
          <motion.h2
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="text-2xl font-heading font-bold mb-2"
            style={{
              color: isFailed ? 'hsl(var(--destructive))' : isReady ? 'hsl(152 60% 45%)' : 'hsl(var(--primary))',
              textShadow: `0 0 20px ${isFailed ? 'hsl(0 72% 51% / 0.6)' : isReady ? 'hsl(152 60% 45% / 0.6)' : 'hsl(270 80% 60% / 0.6)'}`,
            }}
          >
            {isReady ? readyTitle : isFailed ? 'Generation Failed' : title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mb-4 text-sm"
          >
            {isReady ? readyText : isFailed ? (error || 'Something went wrong. You can retry.') : subtitle}
          </motion.p>
          {/* Indeterminate progress bar */}
          {!isReady && !isFailed && (
            <div className="h-1 rounded-full mx-auto max-w-xs bg-white/10 overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/2 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--accent)), transparent)' }}
              />
            </div>
          )}
          {/* Cancel button */}
          {!isReady && !isFailed && onCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-4 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive/50 transition-all disabled:opacity-50"
            >
              <OctagonX className="w-3.5 h-3.5" />
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>

        {/* Break Room games — only while loading */}
        {isReady && onComplete && !onGenerateNext && (
          <CompleteTrigger onComplete={onComplete} />
        )}

        {/* Ready actions — Generate Next Package (only when onGenerateNext provided) */}
        {isReady && onGenerateNext && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-3 mt-4"
          >
            {nextPointTitle && (
              <p className="text-xs text-muted-foreground">
                Next up: <span className="text-foreground font-medium">{nextPointTitle}</span>
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={onGenerateNext}
                className="inline-flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Sparkles className="w-4 h-4" />
                Generate Next Package
              </button>
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}

        {!isReady && !isFailed && (
          <AnimatePresence mode="wait">
            {!activeGame ? (
              <motion.div
                key="launcher"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Dices className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-heading font-semibold text-foreground">Break Room</h3>
                  <span className="text-[11px] text-muted-foreground">— Play while CREAPD works</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveGame('wordsearch')}
                    className="rounded-xl p-4 border border-white/10 bg-gradient-to-br from-berna-emerald/10 to-transparent hover:border-berna-emerald/40 hover:bg-berna-emerald/5 transition-all text-left"
                  >
                    <div className="text-2xl mb-2">🧩</div>
                    <div className="text-sm font-semibold text-foreground">Word Search</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Find the hidden words</div>
                  </button>
                  <button
                    onClick={() => setActiveGame('asteroids')}
                    className="rounded-xl p-4 border border-white/10 bg-gradient-to-br from-berna-purple/10 to-transparent hover:border-berna-purple/40 hover:bg-berna-purple/5 transition-all text-left"
                  >
                    <div className="text-2xl mb-2">🚀</div>
                    <div className="text-sm font-semibold text-foreground">Asteroids</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Blast space rocks</div>
                  </button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Games Brought To You By:{' '}
                  <a
                    href="https://www.texasnomadgames.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    TexasNomadGames.com
                  </a>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="game"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-3"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Dices className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Break Room</span>
                  </div>
                  <button
                    onClick={() => setActiveGame(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Back to games
                  </button>
                </div>
                <div className="flex justify-center">
                  {activeGame === 'wordsearch' && <WordSearch onClose={() => setActiveGame(null)} />}
                  {activeGame === 'asteroids' && <Asteroids onClose={() => setActiveGame(null)} />}
                </div>
                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Games Brought To You By:{' '}
                  <a
                    href="https://www.texasnomadgames.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    TexasNomadGames.com
                  </a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Optional custom progress tracker (rendered by the calling page) */}
        {progressTracker && (
          <div className="mt-3">
            {progressTracker}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Fires onComplete after a 1.5s delay so the "ready" state is visible.
 */
function CompleteTrigger({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  return null;
}