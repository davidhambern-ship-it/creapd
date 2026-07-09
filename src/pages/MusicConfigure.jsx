import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RUNTIME_DEFAULTS, DEFAULT_AI_AUTOMATION, RESEARCH_SOURCE_OPTIONS,
} from '@/lib/musicConstants';
import {
  Loader2, Disc3, Dices,
  LayoutDashboard, Search, ListMusic, ListChecks,
  Package, Sparkles, Download,
} from 'lucide-react';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import StageLights from '@/components/music/StageLights';
import ShowRoulette from '@/components/music/ShowRoulette';
import DiscoveryNavBar from '@/components/music/DiscoveryNavBar';
import CinematicIntro from '@/components/music/CinematicIntro';
import ConfigSceneShell from '@/components/music/ConfigSceneShell';
import IdentityScene from '@/components/music/scenes/IdentityScene';
import RuntimeScene from '@/components/music/scenes/RuntimeScene';
import SoundProfileScene from '@/components/music/scenes/SoundProfileScene';
import ContentScene from '@/components/music/scenes/ContentScene';
import RulesScene from '@/components/music/scenes/RulesScene';
import AutomationScene from '@/components/music/scenes/AutomationScene';

const INTRO_VIDEO_URL = 'https://media.base44.com/videos/public/6a4126962e5804304cc84b12/5a40e9789_Discovery_Room_Intro.mp4';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

const SCENES = [
  {
    key: 'identity', title: 'Studio Identity', accent: '#FF00FF',
    narration: "Let's start with the basics. What's your show called? When does it air? Who's behind the mic?",
    canProceed: (c) => !!c.production_name && !!c.show_date,
    Component: IdentityScene,
  },
  {
    key: 'runtime', title: 'Runtime Mix', accent: '#00FFFF',
    narration: "Every great show has a rhythm. Let's map your minutes — music, talk, breaks, intro, outro.",
    canProceed: () => true,
    Component: RuntimeScene,
  },
  {
    key: 'sound', title: 'Sound Profile', accent: '#8B00FF',
    narration: "Now for the fun part. What genres are we spinning? What's the mood? Choose your sonic identity.",
    canProceed: () => true,
    Component: SoundProfileScene,
  },
  {
    key: 'content', title: 'Content Scope', accent: '#FF6B00',
    narration: "Beyond the music, what stories will you tell? Pick topics to research and sources to mine.",
    canProceed: () => true,
    Component: ContentScene,
  },
  {
    key: 'rules', title: 'Playlist Rules', accent: '#00FF88',
    narration: "Time to set some ground rules. Must-plays, blocks, variety — the guardrails for your playlist.",
    canProceed: () => true,
    Component: RulesScene,
  },
  {
    key: 'ai', title: 'AI Automation', accent: '#FFD700',
    narration: "Final step. What should I auto-generate for you? Scripts, images, voiceovers? You command, I create.",
    canProceed: () => true,
    Component: AutomationScene,
  },
];

const NAV_ROOMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/music/dashboard', color: '#00FFFF' },
  { icon: Search, label: 'Knowledge', path: '/music/research', color: '#00FF88' },
  { icon: ListMusic, label: 'Playlist', path: '/music/playlist', color: '#8B5CF6' },
  { icon: ListChecks, label: 'Topics', path: '/music/topics', color: '#FF6B00' },
  { icon: Package, label: 'Rundown', path: '/music/rundown', color: '#FFD700' },
  { icon: Sparkles, label: 'Assets', path: '/music/assets', color: '#FF00FF' },
  { icon: Download, label: 'Export', path: '/music/export', color: '#FF3366' },
];

export default function MusicConfigure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editConfigId = searchParams.get('config_id');

  const [introDone, setIntroDone] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [rouletteOpen, setRouletteOpen] = useState(false);

  const [config, setConfig] = useState({
    production_name: '',
    host_name: '',
    co_host_name: '',
    show_date: new Date().toISOString().split('T')[0],
    show_start_time: '06:00',
    live_or_recorded: 'live',
    station_name: '',
    show_description: '',
    ...RUNTIME_DEFAULTS,
    genres: JSON.stringify([]),
    moods: JSON.stringify([]),
    show_tone: 'Professional',
    music_topics: JSON.stringify([]),
    research_sources: JSON.stringify(RESEARCH_SOURCE_OPTIONS),
    must_play_songs: '',
    blocked_songs: '',
    blocked_artists: '',
    recently_played_songs: '',
    max_songs_per_artist: 2,
    min_artist_variety: true,
    include_indie: true,
    include_local: false,
    include_new_releases: true,
    include_throwbacks: true,
    clean_only: false,
    preferred_eras: '',
    playlist_energy_flow: 'Build Energy Gradually',
    ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
    status: 'configuring',
    is_default: false,
  });

  useEffect(() => {
    if (editConfigId) {
      base44.entities.MusicProductionConfiguration.get(editConfigId).then(c => {
        if (c) setConfig({ ...c, status: 'configuring' });
      }).catch(() => {});
    }
  }, [editConfigId]);

  const updateConfig = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field, item) => {
    const arr = safeParse(config[field], []);
    const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    updateConfig(field, JSON.stringify(newArr));
  };

  const handleRouletteApply = (generated) => {
    setConfig(prev => ({ ...prev, ...generated }));
    setRouletteOpen(false);
  };

  const handleBuild = async () => {
    setBuilding(true);
    setBuildError('');
    try {
      let savedConfig;
      if (editConfigId) {
        savedConfig = await base44.entities.MusicProductionConfiguration.update(editConfigId, config);
      } else {
        savedConfig = await base44.entities.MusicProductionConfiguration.create(config);
      }
      await base44.auth.updateMe({
        default_production_type: 'music',
        default_production_config_id: savedConfig.id,
      });
      await base44.entities.MusicProductionConfiguration.update(savedConfig.id, { is_default: true });
      await base44.functions.invoke('buildMusicProduction', { configuration_id: savedConfig.id });
      navigate('/music/dashboard');
    } catch (err) {
      setBuildError(err.message || 'Failed to build production. Please try again.');
      setBuilding(false);
    }
  };

  if (building) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center">
        <CyberpunkMusicBg variant="eq" />
        <div className="relative z-10 max-w-md w-full text-center px-6">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="inline-block mb-6">
            <Disc3 className="w-16 h-16" style={{ color: '#FF00FF', filter: 'drop-shadow(0 0 16px #FF00FF)' }} />
          </motion.div>
          <h2 className="text-xl font-heading font-bold text-white mb-3">Building Your Music Production</h2>
          <p className="text-gray-400 mb-8 text-sm">CREAPD is generating your playlist, research, topics, rundown, and AI assets.</p>
          <div className="space-y-3 text-left">
            {['Generating playlist plan', 'Researching music topics', 'Building show rundown', 'Generating AI assets'].map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FF00FF' }} />
                <span className="text-gray-400">{label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Phase 1: Cinematic Intro Video
  if (!introDone) {
    return <CinematicIntro videoUrl={INTRO_VIDEO_URL} onEnter={() => setIntroDone(true)} />;
  }

  // Phase 2: Animated Config Scenes
  const scene = SCENES[currentScene];
  const isLast = currentScene === SCENES.length - 1;
  const SceneComponent = scene.Component;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black" style={{ scrollbarWidth: 'none' }}>
      <style>{`.config-scroll::-webkit-scrollbar, .overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
      <CyberpunkMusicBg variant="left" />

      <div className="relative z-10 config-scroll min-h-screen overflow-y-auto pb-32">
        {/* Hero header */}
        <div className="px-4 pt-8 pb-2 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
            <div className="relative inline-block">
              <StageLights />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-20 inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2"
                style={{ background: 'rgba(255,0,255,0.1)', border: '1px solid rgba(255,0,255,0.3)', boxShadow: '0 0 24px rgba(255,0,255,0.15)' }}
              >
                <Disc3 className="w-7 h-7" style={{ color: '#FF00FF' }} />
              </motion.div>
              <h1 className="relative z-10 text-3xl sm:text-4xl md:text-6xl font-bold mb-1 futuristic-title tracking-[0.15em] whitespace-nowrap" style={{ fontFamily: "'Boxpot', sans-serif" }}>Discovery Room</h1>
            </div>
            <div className="flex justify-center mt-3 overflow-x-auto">
              <DiscoveryNavBar rooms={NAV_ROOMS} onRoulette={() => setRouletteOpen(true)} rouletteColor="#FF00FF" />
            </div>
          </motion.div>
        </div>

        {/* Cinematic scene flow */}
        <AnimatePresence mode="wait">
          <ConfigSceneShell
            key={scene.key}
            step={currentScene}
            totalSteps={SCENES.length}
            title={scene.title}
            narration={scene.narration}
            accentColor={scene.accent}
            canProceed={scene.canProceed(config)}
            onBack={() => setCurrentScene(s => Math.max(0, s - 1))}
            onNext={() => isLast ? handleBuild() : setCurrentScene(s => s + 1)}
            isLast={isLast}
          >
            <SceneComponent config={config} updateConfig={updateConfig} toggleArrayItem={toggleArrayItem} />
          </ConfigSceneShell>
        </AnimatePresence>

        {buildError && (
          <div className="max-w-2xl mx-auto px-4 mt-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{buildError}</div>
          </div>
        )}

        {/* Floating Roulette button */}
        <button
          onClick={() => setRouletteOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full cp-btn-gradient text-white font-heading font-bold text-xs shadow-lg"
        >
          <Dices className="w-4 h-4" /> Roulette
        </button>
      </div>

      <ShowRoulette open={rouletteOpen} onClose={() => setRouletteOpen(false)} onApply={handleRouletteApply} />
    </div>
  );
}