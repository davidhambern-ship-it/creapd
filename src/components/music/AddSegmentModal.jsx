import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';

const SEGMENT_TYPES = [
  { value: 'talk_break', label: 'Talk Break', color: '#00FFFF', desc: 'Host banter or conversation' },
  { value: 'topic_segment', label: 'Topic Segment', color: '#FF6B00', desc: 'Discuss a music topic' },
  { value: 'artist_bio', label: 'Artist Bio', color: '#A855F7', desc: 'Biography of an artist' },
  { value: 'music_trivia', label: 'Music Trivia', color: '#F59E0B', desc: 'Trivia question and answer' },
  { value: 'tour_dates', label: 'Tour Dates', color: '#3B82F6', desc: 'Upcoming tour and concert dates' },
  { value: 'concert_news', label: 'Concert News', color: '#EF4444', desc: 'Recent concert/festival news' },
  { value: 'sponsor_break', label: 'Sponsor Break', color: '#FFD700', desc: 'Ad read or sponsor message' },
  { value: 'station_id', label: 'Station ID', color: '#8B00FF', desc: 'Station identification' },
  { value: 'intro', label: 'Show Intro', color: '#00FF88', desc: 'Show opening' },
  { value: 'outro', label: 'Show Outro', color: '#00FF88', desc: 'Show closing' },
];

export default function AddSegmentModal({ configurationId, onClose, onAdded }) {
  const [segmentType, setSegmentType] = useState('talk_break');
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selected = SEGMENT_TYPES.find(s => s.value === segmentType);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const prompt = `You are a professional music show producer. Write a script for a "${selected.label}" segment.
${title ? `Title/Topic: ${title}` : 'Come up with an engaging title.'}

Write a compelling, ready-to-read script for this segment. The script should be conversational and match a professional music show tone. Keep it appropriate for the segment type:
- Talk Break: 2-3 sentences of natural host banter
- Topic Segment: 3-5 sentences expanding on the topic
- Artist Bio: A brief but informative artist biography (30-60 seconds spoken)
- Music Trivia: A trivia question with the answer revealed after a pause
- Tour Dates: Upcoming tour dates for popular artists (use real current data)
- Concert News: Recent concert or festival news
- Sponsor Break: Generic ad-read copy (30-60 seconds)
- Station ID: Brief station identification (under 15 seconds)
- Intro: Show opening welcoming listeners
- Outro: Show closing thanking listeners

Return a JSON object with "title" and "script_content" fields.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            script_content: { type: 'string' },
          },
        },
        add_context_from_internet: ['tour_dates', 'concert_news', 'artist_bio'].includes(segmentType),
      });

      if (res.title) setTitle(res.title);
      if (res.script_content) setScript(res.script_content);
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      await base44.entities.ShowRundownItem.create({
        configuration_id: configurationId,
        segment_type: segmentType,
        title: title || selected.label,
        script_content: script,
        order: 9999,
        duration_seconds: script ? Math.ceil(script.length / 15) : 60,
        status: 'ready',
      });
      onAdded();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to add segment');
    } finally {
      setSaving(false);
    }
  };

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
          style={{ borderColor: `${selected.color}40` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: selected.color }} />
              <h3 className="text-sm font-bold text-white">Add Segment to Rundown</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Segment type picker */}
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">Segment Type</label>
              <div className="grid grid-cols-2 gap-2">
                {SEGMENT_TYPES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setSegmentType(s.value); setTitle(''); setScript(''); }}
                    className="flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all"
                    style={{
                      background: segmentType === s.value ? `${s.color}15` : 'rgba(255,255,255,0.03)',
                      borderColor: segmentType === s.value ? `${s.color}50` : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: s.color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white">{s.label}</p>
                      <p className="text-[10px] text-gray-500 truncate">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/40 text-sm text-gray-200 outline-none border border-white/10 focus:border-white/30"
                placeholder="Segment title or topic..."
              />
            </div>

            {/* Script */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider text-gray-500">Script</label>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  style={{ background: `${selected.color}20`, color: selected.color, border: `1px solid ${selected.color}40` }}
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  {generating ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full h-40 p-3 rounded-lg bg-black/40 text-sm text-gray-200 outline-none resize-none border border-white/10 focus:border-white/30 font-mono leading-relaxed"
                placeholder="Write or generate the script for this segment..."
              />
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
              onClick={handleAdd}
              disabled={saving || (!title && !script)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
                color: '#fff',
                boxShadow: '0 0 12px rgba(255,0,255,0.2)',
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to Rundown
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}