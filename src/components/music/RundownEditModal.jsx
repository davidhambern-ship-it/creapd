import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Save, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';

const SEGMENT_COLORS = {
  intro: '#00FF88',
  song: '#FF00FF',
  talk_break: '#00FFFF',
  topic_segment: '#FF6B00',
  artist_bio: '#A855F7',
  music_trivia: '#F59E0B',
  tour_dates: '#3B82F6',
  concert_news: '#EF4444',
  sponsor_break: '#FFD700',
  station_id: '#8B00FF',
  outro: '#00FF88',
};

export default function RundownEditModal({ item, config, onClose, onSaved }) {
  const [script, setScript] = useState(item.script_content || '');
  const [title, setTitle] = useState(item.title || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [instruction, setInstruction] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState(null);

  const color = SEGMENT_COLORS[item.segment_type] || '#888888';

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const CHARS_PER_SEC = 15;
      const newDuration = item.segment_type === 'song'
        ? item.duration_seconds
        : script ? Math.ceil(script.length / CHARS_PER_SEC) : (item.duration_seconds || 60);

      await base44.entities.ShowRundownItem.update(item.id, {
        script_content: script,
        title,
        notes,
        duration_seconds: newDuration,
        status: 'ready',
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('regenerateMusicSection', {
        configuration_id: item.configuration_id,
        section: 'rundown_item',
        item_id: item.id,
        instruction: instruction || undefined,
      });
      const newScript = res?.data?.script_content;
      if (newScript) {
        setScript(newScript);
      }
      if (res?.data?.title) setTitle(res.data.title);
      if (res?.data?.notes) setNotes(res.data.notes);
      setInstruction('');
      setShowInstructions(false);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estTime = Math.ceil(script.length / 15);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="cp-glass w-full max-w-2xl max-h-[90vh] flex flex-col"
          style={{ borderColor: `${color}40` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-1 rounded-full border"
                style={{ background: `${color}15`, color, borderColor: `${color}40` }}>
                {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent text-sm font-medium text-white outline-none border-b border-transparent focus:border-white/20 flex-1 min-w-0"
                style={{ minWidth: '200px' }}
              />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Script editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider text-gray-500">Script Content</label>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{wordCount} words</span>
                  <span>·</span>
                  <span>~{Math.floor(estTime / 60)}:{String(estTime % 60).padStart(2, '0')}</span>
                </div>
              </div>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full h-64 p-3 rounded-lg bg-black/40 text-sm text-gray-200 outline-none resize-none border border-white/10 focus:border-white/30 font-mono leading-relaxed"
                style={{ borderColor: `${color}20` }}
                placeholder="Enter or edit the script for this segment..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/40 text-sm text-gray-200 outline-none border border-white/10 focus:border-white/30"
                placeholder="Production notes..."
              />
            </div>

            {/* Regenerate with instruction */}
            <div className="cp-glass p-3 rounded-lg" style={{ borderColor: `${color}20` }}>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center gap-2 text-xs font-medium text-gray-300 w-full"
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color }} />
                <span>Regenerate with AI</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ml-auto ${showInstructions ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-2">
                      <input
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-black/40 text-sm text-gray-200 outline-none border border-white/10 focus:border-white/30"
                        placeholder="e.g. 'Make this intro longer and more energetic'"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {['Make it longer', 'Make it shorter', 'More energetic', 'More formal', 'Add humor'].map(hint => (
                          <button
                            key={hint}
                            onClick={() => setInstruction(hint)}
                            className="px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            {hint}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold w-full justify-center transition-all disabled:opacity-50"
                        style={{
                          background: `linear-gradient(135deg, ${color}, ${color}80)`,
                          color: '#000',
                        }}
                      >
                        {regenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {regenerating ? 'Regenerating...' : 'Regenerate Segment'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="text-xs text-red-400 p-2 rounded bg-red-500/10 border border-red-500/20">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
                color: '#fff',
                boxShadow: '0 0 12px rgba(255,0,255,0.2)',
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}