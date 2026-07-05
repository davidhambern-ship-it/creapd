import React, { useState, useCallback } from 'react';
import { useDirectable } from '@/hooks/useDirectable';
import { Newspaper, Star } from 'lucide-react';

/**
 * DemoAtomCard — a self-contained atom that registers with the CREAPr Engine.
 *
 * Accepts Engine commands:
 *   - 'highlight' → gold glow border
 *   - 'dim' → reduced opacity
 *   - 'reset' → normal state
 *
 * Exposes data via getData() so logic modules can read its current state.
 */
export default function DemoAtomCard({ id, title, score }) {
  const [state, setState] = useState('normal'); // 'normal' | 'highlighted' | 'dimmed'

  const handleCommand = useCallback((command, payload) => {
    if (command === 'highlight') setState('highlighted');
    else if (command === 'dim') setState('dimmed');
    else if (command === 'reset') setState('normal');
  }, []);

  const getData = useCallback(() => ({ id, title, score, visualState: state }), [id, title, score, state]);

  useDirectable(id, {
    onCommand: handleCommand,
    getData,
    isAvailable: () => true,
  });

  const styles = {
    highlighted: 'border-berna-orange/60 bg-berna-orange/[0.08] glow-orange scale-[1.02]',
    dimmed: 'border-white/[0.04] bg-white/[0.01] opacity-40',
    normal: 'border-white/[0.08] bg-white/[0.02]',
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-500 ${styles[state]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Newspaper className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-heading font-semibold text-white truncate">{title}</span>
        </div>
        {state === 'highlighted' && (
          <Star className="w-4 h-4 text-berna-orange fill-berna-orange shrink-0 animate-zoom-in" />
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground">score</span>
        <span className="text-xs font-mono font-bold text-white">{score.toFixed(1)}</span>
        <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">atom: {id}</span>
      </div>
    </div>
  );
}