import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Disc3, RefreshCw, Dices, Zap, Smile, Mic, ListChecks, Bot, Sparkles, Check, Music2 } from 'lucide-react';
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
  { field: 'genres', label: 'Genres', icon: Disc3, color: '#8B00FF', anim: 'vinyl' },
  { field: 'moods', label: 'Moods', icon: Smile, color: '#FF00FF', anim: 'eq' },
  { field: 'show_tone', label: 'Tone', icon: Mic, color: '#00FFFF', anim: 'mic' },
  { field: 'music_topics', label: 'Topics', icon: ListChecks, color: '#FF6B00', anim: 'staff' },
  { field: 'playlist_energy_flow', label: 'Energy Flow', icon: Zap, color: '#00FF88', anim: 'waveform' },
  { field: 'ai_automation', label: 'AI Automation', icon: Bot, color: '#FFD700', anim: 'oscilloscope' },
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

/* ═══ Music-Themed Animations ═══ */

function VinylAnim({ color, spinning }) {
  return (
    <div className="relative w-24 h-24 mx-auto mb-4">
      {/* Turntable base */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(0,0,0,0.5)', border: `2px solid ${color}40` }} />
      {/* Vinyl record */}
      <motion.div
        animate={{ rotate: spinning ? 360 : 0 }}
        transition={{ duration: 1.2, repeat: spinning ? Infinity : 0, ease: 'linear' }}
        className="absolute inset-2 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, #1a1a1a 30%, #0a0a0a 60%, #1a1a1a 100%)`,
          boxShadow: `0 0 20px ${color}30, inset 0 0 30px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Grooves */}
        {[0.4, 0.55, 0.7, 0.85].map((scale, i) => (
          <div key={i} className="absolute rounded-full border border-white/5" style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }} />
        ))}
        {/* Center label */}
        <div className="w-1/3 h-1/3 rounded-full flex items-center justify-center" style={{ background: color }}>
          <div className="w-2 h-2 rounded-full bg-black" />
        </div>
      </motion.div>
      {/* Tonearm */}
      <div className="absolute -top-1 -right-1 w-12 h-1.5 rounded-full origin-right" style={{ background: `${color}80`, transform: 'rotate(-25deg) translateY(-4px)' }} />
    </div>
  );
}

function EqBarsAnim({ color }) {
  return (
    <div className="flex items-end justify-center gap-1 h-20 mx-auto mb-4 w-full max-w-xs">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t"
          style={{ background: `linear-gradient(180deg, ${color}, ${color}40)`, boxShadow: `0 0 8px ${color}40` }}
          animate={{ height: [`${20 + Math.random() * 20}%`, `${60 + Math.random() * 40}%`, `${20 + Math.random() * 20}%`] }}
          transition={{ duration: 0.6 + (i % 3) * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}

function MicRingsAnim({ color }) {
  return (
    <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ width: 20, height: 20, opacity: 0.8 }}
          animate={{ width: [20, 80], height: [20, 80], opacity: [0.8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
        />
      ))}
      <div className="w-8 h-8 rounded-full flex items-center justify-center relative z-10" style={{ background: color }}>
        <Mic className="w-4 h-4 text-black" />
      </div>
    </div>
  );
}

function StaffLinesAnim({ color }) {
  return (
    <div className="relative w-full max-w-xs h-20 mx-auto mb-4 overflow-hidden">
      {/* 5 staff lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="absolute left-0 right-0 h-px"
          style={{ top: `${20 + i * 15}%`, background: `${color}60` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
        />
      ))}
      {/* Music notes popping in */}
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={`note-${i}`}
          className="absolute"
          style={{ left: `${15 + i * 18}%`, top: `${15 + (i % 3) * 15}%` }}
          initial={{ scale: 0, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 300, damping: 15 }}
        >
          <Music2 className="w-4 h-4" style={{ color, filter: `drop-shadow(0 0 4px ${color})` }} />
        </motion.div>
      ))}
    </div>
  );
}

function WaveformAnim({ color }) {
  return (
    <div className="flex items-center justify-center gap-0.5 h-20 mx-auto mb-4 w-full max-w-xs">
      {Array.from({ length: 40 }).map((_, i) => {
        const h = Math.sin(i * 0.5) * 30 + 40 + Math.cos(i * 0.3) * 20;
        return (
          <motion.div
            key={i}
            className="w-1 rounded-full"
            style={{ background: color, boxShadow: `0 0 4px ${color}60` }}
            animate={{ height: [`${h * 0.5}%`, `${h}%`, `${h * 0.5}%`] }}
            transition={{ duration: 0.8 + (i % 4) * 0.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.03 }}
          />
        );
      })}
    </div>
  );
}

function OscilloscopeAnim({ color }) {
  return (
    <div className="relative w-full max-w-xs h-20 mx-auto mb-4 overflow-hidden rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${color}30` }}>
      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(${color}10 1px, transparent 1px), linear-gradient(90deg, ${color}10 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
      }} />
      {/* Oscilloscope trace */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
        <motion.path
          d="M0,40 Q15,10 30,40 T60,40 T90,40 T120,40 T150,40 T180,40 T210,40 T240,40 T270,40 T300,40"
          fill="none"
          stroke={color}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          animate={{
            d: [
              "M0,40 Q15,10 30,40 T60,40 T90,40 T120,40 T150,40 T180,40 T210,40 T240,40 T270,40 T300,40",
              "M0,40 Q15,70 30,40 T60,40 T90,40 T120,40 T150,40 T180,40 T210,40 T240,40 T270,40 T300,40",
              "M0,40 Q15,10 30,40 T60,40 T90,40 T120,40 T150,40 T180,40 T210,40 T240,40 T270,40 T300,40",
            ]
          }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

function MusicAnim({ type, color, spinning }) {
  switch (type) {
    case 'vinyl': return <VinylAnim color={color} spinning={spinning} />;
    case 'eq': return <EqBarsAnim color={color} />;
    case 'mic': return <MicRingsAnim color={color} />;
    case 'staff': return <StaffLinesAnim color={color} />;
    case 'waveform': return <WaveformAnim color={color} />;
    case 'oscilloscope': return <OscilloscopeAnim color={color} />;
    default: return null;
  }
}

/* ═══ Exit animations per card type ═══ */

const EXIT_ANIMS = {
  vinyl: { exit: { scale: 0, rotate: 720, opacity: 0 }, transition: { duration: 0.5, ease: 'easeIn' } },
  eq: { exit: { height: 0, opacity: 0 }, transition: { duration: 0.4, ease: 'easeIn' } },
  mic: { exit: { scale: 0.3, opacity: 0, filter: 'blur(8px)' }, transition: { duration: 0.4, ease: 'easeIn' } },
  staff: { exit: { x: '-100%', opacity: 0 }, transition: { duration: 0.4, ease: 'easeIn' } },
  waveform: { exit: { scaleX: 0, opacity: 0 }, transition: { duration: 0.4, ease: 'easeIn' } },
  oscilloscope: { exit: { scaleY: 0, opacity: 0 }, transition: { duration: 0.4, ease: 'easeIn' } },
};

/* ═══ Ambient background — floating music notes ═══ */

function AmbientNotes() {
  const notes = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 15 + Math.random() * 10,
    size: 12 + Math.random() * 16,
    opacity: 0.05 + Math.random() * 0.1,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {notes.map(n => (
        <motion.div
          key={n.id}
          className="absolute"
          style={{ left: `${n.left}%`, bottom: '-30px', opacity: n.opacity }}
          animate={{ y: [0, -window.innerHeight - 50], x: [0, (Math.random() - 0.5) * 100], rotate: [0, 360] }}
          transition={{ duration: n.duration, repeat: Infinity, delay: n.delay, ease: 'linear' }}
        >
          <Music2 style={{ width: n.size, height: n.size, color: '#FF00FF' }} />
        </motion.div>
      ))}
    </div>
  );
}

/* ═══ Progress dots ═══ */

function ProgressDots({ total, current, colors }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          animate={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor: i < current ? colors[i] : i === current ? colors[i] : 'rgba(255,255,255,0.15)',
            boxShadow: i <= current ? `0 0 8px ${colors[i]}` : 'none',
          }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

export default function ShowRoulette({ open, onClose, onApply }) {
  const [vibe, setVibe] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [remixingField, setRemixingField] = useState(null);
  const [phase, setPhase] = useState('input'); // input | spinning | revealing | done
  const [revealIndex, setRevealIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase('input');
      setVibe('');
      setResult(null);
      setRevealIndex(0);
      setSpinning(false);
      setExiting(false);
    }
  }, [open]);

  const spin = async () => {
    setPhase('spinning');
    setSpinning(true);
    setResult(null);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: buildSpinPrompt(vibe),
        response_json_schema: SPIN_SCHEMA,
      });
      setResult(response);
      setRevealIndex(0);
      setSpinning(false);
      setPhase('revealing');
    } catch (err) {
      console.error('Roulette failed:', err);
      setSpinning(false);
      setPhase('input');
    }
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

  const approveCard = () => {
    const exitAnim = EXIT_ANIMS[RESULT_CARDS[revealIndex].anim];
    setExiting(true);
    setTimeout(() => {
      if (revealIndex < RESULT_CARDS.length - 1) {
        setRevealIndex(revealIndex + 1);
        setExiting(false);
      } else {
        setPhase('done');
        setExiting(false);
      }
    }, exitAnim.transition.duration * 1000);
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
  };

  const renderCardValue = (field) => {
    const val = result?.[field];
    if (!val) return null;
    if (Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {val.map((v, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
              className="px-3 py-1 rounded-lg text-xs font-mono font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(220,220,240,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {v}
            </motion.span>
          ))}
        </div>
      );
    }
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        className="px-4 py-1.5 rounded-lg text-sm font-mono font-medium inline-block"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(220,220,240,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {val}
      </motion.span>
    );
  };

  const currentCard = RESULT_CARDS[revealIndex];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(20,5,30,0.95), rgba(5,5,10,0.98))',
            backdropFilter: 'blur(8px)',
          }}
        >
          <AmbientNotes />

          {/* X button — always visible */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>

          {/* ═══ INPUT PHASE ═══ */}
          {phase === 'input' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-full max-w-md text-center"
            >
              <VinylAnim color="#FF00FF" spinning={false} />
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-heading font-bold text-white mb-1"
              >
                Show Roulette
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-gray-400 mb-6"
              >
                Give a vibe, spin the wheel, approve each part
              </motion.p>

              <div className="space-y-1.5 mb-4 text-left">
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

              <div className="mb-6">
                <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Quick Vibes</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
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

              <motion.div
                animate={{ boxShadow: ['0 0 16px rgba(255,0,255,0.3)', '0 0 32px rgba(255,0,255,0.6)', '0 0 16px rgba(255,0,255,0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block rounded-lg"
              >
                <Button onClick={spin} size="lg" style={{ background: 'linear-gradient(135deg, #FF00FF, #8B00FF)' }}>
                  <Dices className="w-4 h-4 mr-2" /> Spin the Wheel
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ SPINNING PHASE ═══ */}
          {phase === 'spinning' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 flex flex-col items-center"
            >
              <VinylAnim color="#FF00FF" spinning={true} />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <p className="text-lg font-heading text-white">Spinning the wheel...</p>
                <p className="text-xs text-gray-500 text-center mt-1">Cueing up your show</p>
              </motion.div>
              {/* Pulsing sound waves around */}
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-purple-500/20"
                  animate={{ width: [100, 400], height: [100, 400], opacity: [0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
                />
              ))}
            </motion.div>
          )}

          {/* ═══ REVEALING PHASE — one card at a time ═══ */}
          {phase === 'revealing' && currentCard && result && (
            <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
              {/* Progress dots */}
              <div className="mb-6">
                <ProgressDots
                  total={RESULT_CARDS.length}
                  current={revealIndex}
                  colors={RESULT_CARDS.map(c => c.color)}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={revealIndex}
                  initial={{ opacity: 0, scale: 0.8, y: 30 }}
                  animate={exiting ? EXIT_ANIMS[currentCard.anim].exit : { opacity: 1, scale: 1, y: 0 }}
                  transition={exiting ? EXIT_ANIMS[currentCard.anim].transition : { type: 'spring', stiffness: 300, damping: 25 }}
                  className="w-full"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${currentCard.color}20`, border: `1px solid ${currentCard.color}40` }}>
                      <currentCard.icon className="w-4 h-4" style={{ color: currentCard.color }} />
                    </div>
                    <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">{currentCard.label}</h3>
                  </div>

                  {/* Music animation */}
                  <MusicAnim type={currentCard.anim} color={currentCard.color} spinning={remixingField === currentCard.field} />

                  {/* Values */}
                  <div className="min-h-[40px] flex items-center justify-center mb-6">
                    {remixingField === currentCard.field ? (
                      <motion.p
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-xs text-gray-500"
                      >
                        Remixing...
                      </motion.p>
                    ) : (
                      renderCardValue(currentCard.field)
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remix(currentCard.field)}
                      disabled={remixingField === currentCard.field}
                      className="text-gray-400 hover:text-white border border-white/10"
                    >
                      <motion.span animate={remixingField === currentCard.field ? { rotate: 360 } : {}} transition={{ duration: 0.6, repeat: remixingField === currentCard.field ? Infinity : 0, ease: 'linear' }}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </motion.span>
                      <span className="ml-1.5">Regenerate</span>
                    </Button>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={approveCard}
                        size="sm"
                        style={{ background: `linear-gradient(135deg, ${currentCard.color}, ${currentCard.color}99)` }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="ml-1.5">Approve</span>
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Step counter */}
              <p className="text-[10px] text-gray-600 mt-6 font-mono">
                Step {revealIndex + 1} of {RESULT_CARDS.length}
              </p>
            </div>
          )}

          {/* ═══ DONE PHASE — summary ═══ */}
          {phase === 'done' && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-full max-w-md text-center"
            >
              {/* Final vinyl with all colors */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${RESULT_CARDS.map(c => c.color).join(', ')})`,
                  boxShadow: '0 0 30px rgba(255,0,255,0.3)',
                }}
              >
                <div className="w-6 h-6 rounded-full bg-black" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: '#FF00FF' }} />
                <h2 className="text-xl font-heading font-bold text-white mb-1">{result.production_name}</h2>
                {result.show_description && (
                  <p className="text-xs text-gray-400 mb-4">{result.show_description}</p>
                )}
              </motion.div>

              {/* Compact summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="p-4 rounded-lg bg-black/30 border border-white/5 mb-6 text-left space-y-1.5"
              >
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <Disc3 className="w-3 h-3" style={{ color: '#8B00FF' }} />
                  <span>{(result.genres || []).join(', ')}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <Smile className="w-3 h-3" style={{ color: '#FF00FF' }} />
                  <span>{(result.moods || []).join(', ')}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <Mic className="w-3 h-3" style={{ color: '#00FFFF' }} />
                  <span>{result.show_tone}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <Zap className="w-3 h-3" style={{ color: '#00FF88' }} />
                  <span>{result.playlist_energy_flow}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono pt-1 border-t border-white/5">
                  <span>Total: <span className="text-white">{result.total_show_runtime}m</span></span>
                  <span>·</span>
                  <span>Music: <span style={{ color: '#FF00FF' }}>{result.required_music_runtime}m</span></span>
                  <span>·</span>
                  <span>Talk: <span style={{ color: '#00FFFF' }}>{result.talk_segment_runtime}m</span></span>
                </div>
              </motion.div>

              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setPhase('input'); setResult(null); }} className="text-gray-400 hover:text-white border border-white/10">
                  <Dices className="w-3.5 h-3.5 mr-1.5" /> Start Over
                </Button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={handleApply} size="sm" style={{ background: 'linear-gradient(135deg, #00FF88, #00FFFF)' }}>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Apply Configuration
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}