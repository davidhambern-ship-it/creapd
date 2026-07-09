import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Disc3, RefreshCw, Dices, Zap, Smile, Mic, ListChecks, Bot, Sparkles } from 'lucide-react';
import {
  GENRE_OPTIONS, MOOD_OPTIONS, TONE_OPTIONS, MUSIC_TOPIC_OPTIONS,
  ENERGY_FLOW_OPTIONS, AI_AUTOMATION_OPTIONS
} from '@/lib/musicConstants';

const PRESET_VIBES = [
  'Rainy Tuesday morning chill',
  'Late night club energy',
  'Feel-good Friday drive home',
  'Dark and experimental',
  'Sunday morning worship vibes',
  'Throwback 90s house party',
  'Motivational workout mix',
  'Smooth jazz coffeehouse',
];

const RESULT_CARDS = [
  { field: 'genres', label: 'Genres', icon: Disc3, color: '#8B00FF' },
  { field: 'moods', label: 'Moods', icon: Smile, color: '#FF00FF' },
  { field: 'show_tone', label: 'Tone', icon: Mic, color: '#00FFFF' },
  { field: 'music_topics', label: 'Topics', icon: ListChecks, color: '#FF6B00' },
  { field: 'playlist_energy_flow', label: 'Energy Flow', icon: Zap, color: '#00FF88' },
  { field: 'ai_automation', label: 'AI Automation', icon: Bot, color: '#FFD700' },
];

const OPTIONS_MAP = {
  genres: GENRE_OPTIONS,
  moods: MOOD_OPTIONS,
  show_tone: TONE_OPTIONS,
  music_topics: MUSIC_TOPIC_OPTIONS,
  playlist_energy_flow: ENERGY_FLOW_OPTIONS,
  ai_automation: AI_AUTOMATION_OPTIONS.map(a => a.key),
};

function buildSpinPrompt(vibe) {
  return `You are an expert radio show producer. Generate a complete music show configuration for this vibe: "${vibe || 'surprise me with something creative'}".

Choose from ONLY these valid options:
Genres (pick 2-4): ${GENRE_OPTIONS.join(', ')}
Moods (pick 2-3): ${MOOD_OPTIONS.join(', ')}
Tone (pick exactly 1): ${TONE_OPTIONS.join(', ')}
Music Topics (pick 4-6): ${MUSIC_TOPIC_OPTIONS.join(', ')}
Energy Flow (pick exactly 1): ${ENERGY_FLOW_OPTIONS.join(', ')}
AI Automation (pick 4-6 from these keys): ${AI_AUTOMATION_OPTIONS.map(a => a.key).join(', ')}

Also generate:
- A catchy, creative production_name
- A 1-2 sentence show_description
- Runtime allocations in minutes: total_show_runtime (30-180), required_music_runtime (60-80% of total), talk_segment_runtime (8-15), commercial_sponsor_runtime (4-8), intro_runtime (1-2), outro_runtime (1-2)

Make everything feel cohesive with the vibe. Be creative!`;
}

function buildRemixPrompt(field, vibe, result) {
  const opts = OPTIONS_MAP[field] || [];
  return `You are an expert radio show producer. The show vibe is: "${vibe || result?.production_name || 'creative'}".
Current config: Genres=${(result?.genres || []).join(', ')}, Moods=${(result?.moods || []).join(', ')}, Tone=${result?.show_tone}.

Re-roll ONLY the "${field}" field. Choose from: ${opts.join(', ')}.
Return the new value for just this field.`;
}

function buildRemixSchema(field) {
  const isString = field === 'show_tone' || field === 'playlist_energy_flow';
  if (isString) {
    return { type: 'object', properties: { [field]: { type: 'string' } }, required: [field] };
  }
  return { type: 'object', properties: { [field]: { type: 'array', items: { type: 'string' } } }, required: [field] };
}

const SPIN_SCHEMA = {
  type: 'object',
  properties: {
    production_name: { type: 'string' },
    show_description: { type: 'string' },
    genres: { type: 'array', items: { type: 'string' } },
    moods: { type: 'array', items: { type: 'string' } },
    show_tone: { type: 'string' },
    music_topics: { type: 'array', items: { type: 'string' } },
    playlist_energy_flow: { type: 'string' },
    ai_automation: { type: 'array', items: { type: 'string' } },
    total_show_runtime: { type: 'number' },
    required_music_runtime: { type: 'number' },
    talk_segment_runtime: { type: 'number' },
    commercial_sponsor_runtime: { type: 'number' },
    intro_runtime: { type: 'number' },
    outro_runtime: { type: 'number' },
  },
  required: ['production_name', 'genres', 'moods', 'show_tone', 'music_topics', 'playlist_energy_flow', 'ai_automation'],
};

export default function ShowRoulette({ open, onClose, onApply }) {
  const [vibe, setVibe] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [remixingField, setRemixingField] = useState(null);

  const spin = async () => {
    setSpinning(true);
    setResult(null);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: buildSpinPrompt(vibe),
        response_json_schema: SPIN_SCHEMA,
      });
      setResult(response);
    } catch (err) {
      console.error('Roulette failed:', err);
    }
    setSpinning(false);
  };

  const remix = async (field) => {
    setRemixingField(field);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: buildRemixPrompt(field, vibe, result),
        response_json_schema: buildRemixSchema(field),
      });
      setResult(prev => ({ ...prev, ...response }));
    } catch (err) {
      console.error('Remix failed:', err);
    }
    setRemixingField(null);
  };

  const handleApply = () => {
    if (!result) return;
    onApply({
      production_name: result.production_name,
      show_description: result.show_description,
      genres: JSON.stringify(result.genres || []),
      moods: JSON.stringify(result.moods || []),
      show_tone: result.show_tone,
      music_topics: JSON.stringify(result.music_topics || []),
      playlist_energy_flow: result.playlist_energy_flow,
      ai_automation: JSON.stringify(result.ai_automation || []),
      total_show_runtime: result.total_show_runtime || 90,
      required_music_runtime: result.required_music_runtime || 70,
      talk_segment_runtime: result.talk_segment_runtime || 12,
      commercial_sponsor_runtime: result.commercial_sponsor_runtime || 6,
      intro_runtime: result.intro_runtime || 1,
      outro_runtime: result.outro_runtime || 1,
    });
    onClose();
    setVibe('');
    setResult(null);
  };

  const renderCardValue = (field) => {
    const val = result?.[field];
    if (!val) return null;
    if (Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-1">
          {val.map((v, i) => (
            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(200,200,220,0.8)' }}>{v}</span>
          ))}
        </div>
      );
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(200,200,220,0.8)' }}>{val}</span>;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="cp-glass w-full max-w-lg mt-8 mb-8 relative"
            style={{ boxShadow: '0 0 40px rgba(255,0,255,0.15)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/5">
              <motion.div
                animate={{ rotate: spinning ? 360 : 0 }}
                transition={{ duration: spinning ? 0.8 : 0.3, repeat: spinning ? Infinity : 0, ease: spinning ? 'linear' : 'easeOut' }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)' }}
              >
                <Dices className="w-5 h-5" style={{ color: '#FF00FF' }} />
              </motion.div>
              <div className="flex-1">
                <h2 className="text-lg font-heading font-bold text-white">Show Roulette</h2>
                <p className="text-[11px] text-gray-400">Give a vibe, spin, remix what you don't like</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {!result && !spinning && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300">What's the vibe?</label>
                    <Input
                      value={vibe}
                      onChange={e => setVibe(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && spin()}
                      placeholder="e.g. dark and experimental..."
                      className="bg-black/40 border-white/10 text-white placeholder-gray-600"
                      autoFocus
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Quick Vibes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_VIBES.map(v => (
                        <motion.button
                          key={v}
                          onClick={() => setVibe(v)}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.92 }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all"
                          style={{
                            background: vibe === v ? 'rgba(0,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                            borderColor: vibe === v ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.08)',
                            color: vibe === v ? '#00FFFF' : 'rgba(200,200,220,0.6)',
                          }}
                        >
                          {v}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {spinning && (
                <div className="flex flex-col items-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  >
                    <Disc3 className="w-16 h-16" style={{ color: '#FF00FF', filter: 'drop-shadow(0 0 20px #FF00FF)' }} />
                  </motion.div>
                  <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-sm text-gray-400 mt-4"
                  >
                    Spinning the wheel...
                  </motion.p>
                </div>
              )}

              {result && !spinning && (
                <div className="space-y-2">
                  {/* Show name + description */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg"
                    style={{ background: 'linear-gradient(135deg, rgba(255,0,255,0.06), rgba(139,0,255,0.06))', border: '1px solid rgba(255,0,255,0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: '#FF00FF' }} />
                      <h3 className="text-sm font-heading font-bold text-white">{result.production_name}</h3>
                    </div>
                    {result.show_description && (
                      <p className="text-[11px] text-gray-400">{result.show_description}</p>
                    )}
                  </motion.div>

                  {/* Config cards with remix */}
                  {RESULT_CARDS.map((card, i) => {
                    const Icon = card.icon;
                    const isRemixing = remixingField === card.field;
                    return (
                      <motion.div
                        key={card.field}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="p-3 rounded-lg bg-black/30 border border-white/5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: `${card.color}15` }}>
                            <Icon className="w-3 h-3" style={{ color: card.color }} />
                          </div>
                          <span className="text-[11px] font-medium text-gray-300">{card.label}</span>
                          <motion.button
                            onClick={() => remix(card.field)}
                            disabled={isRemixing}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="ml-auto p-1 rounded text-gray-500 hover:text-white"
                            title={`Remix ${card.label}`}
                          >
                            <motion.span animate={isRemixing ? { rotate: 360 } : {}} transition={{ duration: 0.6, repeat: isRemixing ? Infinity : 0, ease: 'linear' }}>
                              <RefreshCw className="w-3 h-3" />
                            </motion.span>
                          </motion.button>
                        </div>
                        {renderCardValue(card.field)}
                      </motion.div>
                    );
                  })}

                  {/* Runtime summary */}
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-3 rounded-lg bg-black/30 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: '#FFFFFF10' }}>
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-gray-300">Runtime Mix</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-mono">
                      <span>Total: <span className="text-white">{result.total_show_runtime}m</span></span>
                      <span>Music: <span style={{ color: '#FF00FF' }}>{result.required_music_runtime}m</span></span>
                      <span>Talk: <span style={{ color: '#00FFFF' }}>{result.talk_segment_runtime}m</span></span>
                      <span>Ads: <span style={{ color: '#FF6B00' }}>{result.commercial_sponsor_runtime}m</span></span>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 flex items-center gap-2">
              {result && !spinning && (
                <Button variant="ghost" size="sm" onClick={spin} className="text-gray-400 hover:text-white">
                  <Dices className="w-3.5 h-3.5 mr-1" /> Re-spin
                </Button>
              )}
              <div className="flex-1" />
              {!result && !spinning && (
                <motion.div animate={{ boxShadow: ['0 0 16px rgba(255,0,255,0.3)', '0 0 28px rgba(255,0,255,0.5)', '0 0 16px rgba(255,0,255,0.3)'] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Button onClick={spin} size="sm" style={{ background: 'linear-gradient(135deg, #FF00FF, #8B00FF)' }}>
                    <Dices className="w-3.5 h-3.5 mr-1" /> Spin
                  </Button>
                </motion.div>
              )}
              {result && !spinning && (
                <Button onClick={handleApply} size="sm" style={{ background: 'linear-gradient(135deg, #00FF88, #00FFFF)' }}>
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Apply Configuration
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}