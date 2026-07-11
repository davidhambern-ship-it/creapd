import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronDown, ListMusic, Search, Mic, Sparkles, ClipboardList, Trophy, Loader2 } from 'lucide-react';

const SECTIONS = [
  { key: 'playlist', label: 'Playlist', icon: ListMusic, color: '#FF00FF', desc: 'Songs + YouTube embeds' },
  { key: 'research', label: 'Research', icon: Search, color: '#00FFFF', desc: 'Music news articles' },
  { key: 'topics', label: 'Topics', icon: Mic, color: '#00FF88', desc: 'Talking points' },
  { key: 'assets', label: 'AI Assets', icon: Sparkles, color: '#FF6B00', desc: 'Intros, banter, notes' },
  { key: 'rundown', label: 'Rundown', icon: ClipboardList, color: '#FFD700', desc: 'Show segments + scripts' },
  { key: 'top10', label: 'Top 10', icon: Trophy, color: '#8B5CF6', desc: 'Ranked YouTube embeds' },
];

export default function RegenerateDropdown({ onRegenerate, disabled }) {
  const [open, setOpen] = useState(false);
  const [loadingSection, setLoadingSection] = useState(null);

  const handleSelect = async (section) => {
    setOpen(false);
    setLoadingSection(section);
    try {
      await onRegenerate(section);
    } finally {
      setLoadingSection(null);
    }
  };

  return (
    <div className="relative">
      <div className="flex">
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled || loadingSection}
          className="cp-btn-gradient border-0 text-white hover:opacity-90 text-sm font-medium px-4 py-2 rounded-l-md flex items-center gap-2 disabled:opacity-50"
        >
          {loadingSection ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Regenerating {loadingSection}...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </>
          )}
        </button>
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled || loadingSection}
          className="cp-btn-gradient border-0 border-l border-white/20 text-white hover:opacity-90 px-2 py-2 rounded-r-md disabled:opacity-50"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-72 z-50 cp-glass overflow-hidden"
              style={{ borderColor: 'rgba(255,0,255,0.2)' }}
            >
              <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #FF00FF, #00FFFF)' }} />
              <div className="p-2">
                <p className="text-xs text-gray-400 px-3 py-2 uppercase tracking-wider">Regenerate Section</p>
                {SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleSelect(s.key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}
                    >
                      <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{s.label}</p>
                      <p className="text-xs text-gray-500 truncate">{s.desc}</p>
                    </div>
                    <RefreshCw className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}