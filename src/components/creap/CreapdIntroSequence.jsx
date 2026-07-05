import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Zap, Users, Moon, ArrowRight, SkipForward, Loader2 } from 'lucide-react';
import CreapdLogo from '@/components/brand/CreapdLogo';
import { CREAP_MODES } from '@/lib/creapdPersonality';
import { generateNarrationSpeech } from '@/lib/clonedVoice';
import {
  BlackLogoReveal, LogoExpand, AvatarIntro,
  StoryQueueDemo, SpotlightFocus, AutomationFlow, FadeTransition,
} from '@/components/creap/cinematic/CinematicVisuals';

const MODE_OPTIONS = [
  {
    key: CREAP_MODES.AUTOPILOT,
    label: 'AUTOPILOT',
    subtitle: 'CREAPD drives. You review.',
    icon: Zap,
    gradient: 'from-berna-orange to-amber-600',
    glow: 'glow-orange',
    ring: 'border-berna-orange/40',
  },
  {
    key: CREAP_MODES.HYBRID,
    label: 'HYBRID',
    subtitle: 'Co-pilot mode. You lead, I follow.',
    icon: Users,
    gradient: 'from-berna-purple to-purple-700',
    glow: 'glow-purple',
    ring: 'border-berna-purple/40',
  },
  {
    key: CREAP_MODES.FREE,
    label: 'FREE',
    subtitle: 'On-demand. I speak only when called.',
    icon: Moon,
    gradient: 'from-berna-emerald to-teal-700',
    glow: 'glow-emerald',
    ring: 'border-berna-emerald/40',
  },
];

const VISUAL_MAP = {
  'black-logo': BlackLogoReveal,
  'logo-expand': LogoExpand,
  avatar: AvatarIntro,
  'story-queue-demo': StoryQueueDemo,
  spotlight: SpotlightFocus,
  'automation-flow': AutomationFlow,
  transition: FadeTransition,
};

function buildCinematicScript(userName) {
  const name = userName || 'there';
  return [
    {
      id: 'hey',
      text: `Hey, ${name}...`,
      speech: `Hey, ${name}...`,
      visual: 'black-logo',
    },
    {
      id: 'welcome',
      text: 'Welcome to CREAPD.',
      speech: 'Welcome to Creeped.',
      visual: 'logo-expand',
    },
    {
      id: 'intro',
      text: "I'm CREAP. Your AI co-producer. I don't sleep, I don't take breaks, and I never miss a deadline.",
      speech: "I'm Creep. Your AI co-producer. I don't sleep, I don't take breaks, and I never miss a deadline.",
      visual: 'avatar',
    },
    {
      id: 'organize',
      text: 'I sift through hundreds of stories and bring you only the ones worth your time.',
      speech: 'I sift through hundreds of stories and bring you only the ones worth your time.',
      visual: 'story-queue-demo',
    },
    {
      id: 'no-buttons',
      text: "I don't make you click a hundred buttons. One spotlight. One decision at a time.",
      speech: "I don't make you click a hundred buttons. One spotlight. One decision at a time.",
      visual: 'spotlight',
    },
    {
      id: 'automation',
      text: 'Automation is King. One click, and the rest happens automatically.',
      speech: 'Automation is King. One click, and the rest happens automatically.',
      visual: 'automation-flow',
    },
    {
      id: 'ready',
      text: 'Ready?',
      speech: 'Ready?',
      visual: 'transition',
    },
    {
      id: 'lets-creap',
      text: "Let's CREAP.",
      speech: "Let's Creep.",
      visual: 'transition',
    },
  ];
}

export default function CreapdIntroSequence() {
  const [phase, setPhase] = useState('mode_selection');
  const [selectedMode, setSelectedMode] = useState(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [revealedWords, setRevealedWords] = useState(0);
  const [audioUrls, setAudioUrls] = useState({});
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [userName, setUserName] = useState('');

  const audioRef = useRef(null);
  const wordTimerRef = useRef(null);
  const sceneTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setUserName(user?.full_name || user?.email?.split('@')[0] || '');
      } catch {
        // fallback used
      }
    })();
  }, []);

  const script = buildCinematicScript(userName);

  // Generate all TTS clips when intro phase starts
  useEffect(() => {
    if (phase !== 'intro') return;

    let cancelled = false;
    setIsGeneratingAudio(true);

    (async () => {
      const clips = {};
      await Promise.all(
        script.map(async (scene) => {
          try {
            const result = await generateNarrationSpeech(scene.speech || scene.text);
            if (!cancelled) clips[scene.id] = result.url;
          } catch (err) {
            console.error(`TTS failed for ${scene.id}:`, err);
          }
        })
      );
      if (!cancelled) {
        setAudioUrls(clips);
        setAudioReady(true);
        setIsGeneratingAudio(false);
      }
    })();

    return () => { cancelled = true; };
  }, [phase]);

  const handleSceneComplete = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }

    if (currentScene >= script.length - 1) {
      setPhase('navigating');
      setTimeout(() => {
        window.location.href = '/home';
      }, 800);
      return;
    }

    sceneTimerRef.current = setTimeout(() => {
      setCurrentScene(prev => prev + 1);
      setRevealedWords(0);
    }, 600);
  }, [currentScene, script.length]);

  // Play audio + reveal words for current scene
  useEffect(() => {
    if (phase !== 'intro' || !audioReady) return;

    const scene = script[currentScene];
    if (!scene) return;

    const audioUrl = audioUrls[scene.id];
    const words = scene.text.split(' ');

    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.onloadedmetadata = () => {
        const duration = audio.duration * 1000;
        const perWord = duration / words.length;

        audio.play().catch(() => {
          startTimedReveal(words, duration);
        });

        wordTimerRef.current = setInterval(() => {
          setRevealedWords(prev => {
            if (prev >= words.length) {
              clearInterval(wordTimerRef.current);
              return prev;
            }
            return prev + 1;
          });
        }, perWord);
      };

      audio.onended = () => {
        setRevealedWords(words.length);
        setTimeout(handleSceneComplete, 400);
      };

      audio.onerror = () => {
        startTimedReveal(words, 4000);
      };
    } else {
      startTimedReveal(words, 4000);
    }

    function startTimedReveal(words, duration) {
      const perWord = duration / words.length;
      let count = 0;
      wordTimerRef.current = setInterval(() => {
        count++;
        setRevealedWords(count);
        if (count >= words.length) {
          clearInterval(wordTimerRef.current);
          setTimeout(handleSceneComplete, 800);
        }
      }, perWord);
    }

    return () => {
      if (wordTimerRef.current) {
        clearInterval(wordTimerRef.current);
        wordTimerRef.current = null;
      }
      if (sceneTimerRef.current) {
        clearTimeout(sceneTimerRef.current);
        sceneTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [phase, audioReady, currentScene]);

  const handleSelectMode = async (modeKey) => {
    setSelectedMode(modeKey);

    try {
      const existing = await base44.entities.ProducerPreferences.filter({}, '-created_date', 1);
      if (existing && existing.length > 0) {
        await base44.entities.ProducerPreferences.update(existing[0].id, { creap_mode: modeKey });
      } else {
        await base44.entities.ProducerPreferences.create({ creap_mode: modeKey });
      }
    } catch {
      // non-blocking
    }

    setPhase('intro');
    setCurrentScene(0);
    setRevealedWords(0);
  };

  const handleSkip = () => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (audioRef.current) audioRef.current.pause();
    window.location.href = '/home';
  };

  // ─── Mode Selection Phase ───
  if (phase === 'mode_selection') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 overflow-hidden relative">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-berna-purple/10 blur-[120px]"
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-berna-orange/10 blur-[100px]"
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />

        <div className="relative max-w-2xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="flex justify-center mb-6">
              <CreapdLogo height="h-12" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Choose Your CREAP Mode</h1>
            <p className="text-sm text-muted-foreground">How do you want CREAPD to work with you?</p>
          </motion.div>

          <div className="space-y-3">
            {MODE_OPTIONS.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <motion.button
                  key={opt.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.1 }}
                  onClick={() => handleSelectMode(opt.key)}
                  className={`w-full group relative overflow-hidden rounded-xl border ${opt.ring} bg-white/[0.02] hover:bg-white/[0.05] p-4 flex items-center gap-4 transition-all hover:scale-[1.01]`}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center shrink-0 ${opt.glow} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-heading font-bold text-white text-base">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.subtitle}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all" />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Cinematic Intro Phase ───
  const scene = script[currentScene];
  const words = scene?.text.split(' ') || [];
  const Visual = scene ? VISUAL_MAP[scene.visual] : null;

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient gradient background */}
      <motion.div
        className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-berna-purple/8 blur-[150px]"
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-berna-orange/8 blur-[130px]"
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Skip & Take Control button */}
      <button
        onClick={handleSkip}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-white hover:bg-white/[0.08] transition-all"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Skip & Take Control
      </button>

      {/* Progress dots */}
      <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5">
        {script.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentScene ? 'w-6 bg-primary' : i < currentScene ? 'w-3 bg-primary/40' : 'w-3 bg-white/10'
            }`}
          />
        ))}
      </div>

      <audio ref={audioRef} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl px-6 text-center min-h-[300px]">
        {isGeneratingAudio && !audioReady ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-mono">Initializing CREAPD…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={scene?.id}
              className="flex flex-col items-center gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Scene visual */}
              {Visual && <Visual />}

              {/* Animated text — words appear as CREAP speaks */}
              <p className="text-lg lg:text-xl font-heading font-medium text-white leading-relaxed min-h-[3em] flex flex-wrap justify-center gap-x-1.5 gap-y-1">
                {words.map((word, i) => (
                  <span
                    key={i}
                    className={`transition-all duration-200 ${
                      i < revealedWords ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ filter: i < revealedWords ? 'blur(0px)' : 'blur(4px)' }}
                  >
                    {word}
                  </span>
                ))}
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Branding at bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-[0.3em]">
          {phase === 'navigating' ? 'Entering Studio…' : 'CREAPD · AI Production System'}
        </p>
      </div>
    </div>
  );
}