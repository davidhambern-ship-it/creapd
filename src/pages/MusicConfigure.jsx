import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GENRE_OPTIONS, MOOD_OPTIONS, TONE_OPTIONS, MUSIC_TOPIC_OPTIONS,
  RESEARCH_SOURCE_OPTIONS, ENERGY_FLOW_OPTIONS, AI_AUTOMATION_OPTIONS,
  DEFAULT_AI_AUTOMATION, RUNTIME_DEFAULTS
} from '@/lib/musicConstants';
import {
  Loader2, Music, Clock, Smile, Mic, ListChecks,
  Bot, CheckCircle2, ChevronDown, ChevronUp,
  Plus, Radio, Disc3, Zap, Sliders, Dices, ListMusic,
  LayoutDashboard, Search, Package, Sparkles, Download
} from 'lucide-react';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import StageLights from '@/components/music/StageLights';
import ShowRoulette from '@/components/music/ShowRoulette';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function NeonChip({ label, active, onClick, color = 'pink' }) {
  const colorMap = {
    pink: { active: 'rgba(255,0,255,0.15)', border: 'rgba(255,0,255,0.5)', glow: 'rgba(255,0,255,0.3)', text: '#FF00FF' },
    cyan: { active: 'rgba(0,255,255,0.12)', border: 'rgba(0,255,255,0.5)', glow: 'rgba(0,255,255,0.3)', text: '#00FFFF' },
    purple: { active: 'rgba(139,0,255,0.15)', border: 'rgba(139,0,255,0.5)', glow: 'rgba(139,0,255,0.3)', text: '#8B00FF' },
    orange: { active: 'rgba(255,107,0,0.15)', border: 'rgba(255,107,0,0.5)', glow: 'rgba(255,107,0,0.3)', text: '#FF6B00' },
    green: { active: 'rgba(0,255,136,0.12)', border: 'rgba(0,255,136,0.5)', glow: 'rgba(0,255,136,0.3)', text: '#00FF88' },
  };
  const c = colorMap[color] || colorMap.pink;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -1 }}
      whileTap={{ scale: 0.92 }}
      animate={active ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.55 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
      style={active ? {
        background: c.active,
        borderColor: c.border,
        color: c.text,
        boxShadow: `0 0 12px ${c.glow}, inset 0 0 8px ${c.active}`,
      } : {
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.1)',
        color: 'rgba(200,200,220,0.7)',
      }}
    >
      {label}
    </motion.button>
  );
}

function RoomSection({ icon: Icon, title, subtitle, color, children }) {
  const colorMap = {
    pink: '#FF00FF', cyan: '#00FFFF', purple: '#8B00FF',
    orange: '#FF6B00', green: '#00FF88', gold: '#FFD700',
  };
  const c = colorMap[color] || '#FF00FF';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="cp-glass overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <motion.div
          animate={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
          transition={{ duration: 0.4 }}
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${c}15`, border: `1px solid ${c}40`, boxShadow: `0 0 12px ${c}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: c }} />
        </motion.div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-heading font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </motion.div>
  );
}

function RuntimeSlider({ label, value, onChange, max = 180, color = '#FF00FF' }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-300">{label}</Label>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value} min</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${(value/max)*100}%, rgba(255,255,255,0.1) ${(value/max)*100}%)`,
        }}
      />
    </div>
  );
}

export default function MusicConfigure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editConfigId = searchParams.get('config_id');

  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [customField, setCustomField] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [openRoom, setOpenRoom] = useState('identity');

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
    explicit_allowed: false,
    preferred_eras: '',
    playlist_energy_flow: 'Build Energy Gradually',
    ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
    status: 'configuring',
    is_default: false
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

  const handleAddCustom = (field) => {
    if (customInput.trim()) {
      toggleArrayItem(field, customInput.trim());
      setCustomInput('');
    }
  };

  const handleRouletteApply = (generated) => {
    setConfig(prev => ({ ...prev, ...generated }));
    setRouletteOpen(false);
  };

  const selectedGenres = safeParse(config.genres, []);
  const selectedMoods = safeParse(config.moods, []);
  const selectedTopics = safeParse(config.music_topics, []);
  const selectedSources = safeParse(config.research_sources, []);
  const selectedAutomation = safeParse(config.ai_automation, []);

  const NAV_ROOMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/music/dashboard', color: '#00FFFF' },
    { icon: Search, label: 'Knowledge', path: '/music/research', color: '#00FF88' },
    { icon: ListMusic, label: 'Playlist', path: '/music/playlist', color: '#8B5CF6' },
    { icon: ListChecks, label: 'Topics', path: '/music/topics', color: '#FF6B00' },
    { icon: Package, label: 'Rundown', path: '/music/rundown', color: '#FFD700' },
    { icon: Sparkles, label: 'Assets', path: '/music/assets', color: '#FF00FF' },
    { icon: Download, label: 'Export', path: '/music/export', color: '#FF3366' },
  ];

  const canBuild = config.production_name && config.show_date;

  const ROOMS = [
    { id: 'identity', label: 'Studio Identity', icon: Radio, color: '#FF00FF', subtitle: 'Show name, host, schedule',
      summary: () => config.production_name || 'Untitled' },
    { id: 'runtime', label: 'Runtime Mix', icon: Clock, color: '#00FFFF', subtitle: 'Distribute show minutes',
      summary: () => `${config.total_show_runtime} min total` },
    { id: 'sound', label: 'Sound Profile', icon: Disc3, color: '#8B00FF', subtitle: 'Genres, moods, tone',
      summary: () => `${selectedGenres.length} genres / ${selectedMoods.length} moods` },
    { id: 'content', label: 'Content Scope', icon: Music, color: '#FF6B00', subtitle: 'Topics & research sources',
      summary: () => `${selectedTopics.length} topics / ${selectedSources.length} sources` },
    { id: 'rules', label: 'Playlist Rules', icon: Sliders, color: '#00FF88', subtitle: 'Must-play, blocks, energy',
      summary: () => config.playlist_energy_flow },
    { id: 'ai', label: 'AI Automation', icon: Bot, color: '#FFD700', subtitle: 'What CREAPD auto-generates',
      summary: () => `${selectedAutomation.length} tasks enabled` },
  ];

  const handleBuild = async () => {
    if (!canBuild) return;
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
        default_production_config_id: savedConfig.id
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-6"
          >
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="left" />

      <div className="relative z-10 config-scroll h-screen overflow-y-auto pb-32">
        {/* Hero */}
        <div className="px-4 pt-8 pb-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="relative inline-block">
              <StageLights />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-20 inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
                style={{ background: 'rgba(255,0,255,0.1)', border: '1px solid rgba(255,0,255,0.3)', boxShadow: '0 0 24px rgba(255,0,255,0.15)' }}
              >
                <Radio className="w-8 h-8" style={{ color: '#FF00FF' }} />
              </motion.div>
              <h1 className="relative z-10 text-7xl font-bold mb-1 futuristic-title tracking-[0.15em]" style={{ fontFamily: "'Boxpot', sans-serif" }}>Discovery Room</h1>
            </div>
            <p className="text-sm text-gray-400">Tap a room to configure your show</p>
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              <motion.button
                onClick={() => setRouletteOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-base font-medium border"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,0,255,0.12), rgba(0,255,255,0.08))',
                  borderColor: 'rgba(255,0,255,0.4)',
                  color: '#FF00FF',
                  boxShadow: '0 0 12px rgba(255,0,255,0.15)',
                }}
              >
                <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                  <Dices className="w-5 h-5" />
                </motion.span>
                Show Roulette
              </motion.button>
              {NAV_ROOMS.map((room, i) => {
                const Icon = room.icon;
                return (
                  <motion.div
                    key={room.path}
                    className="group relative flex flex-col items-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <motion.button
                      onClick={() => navigate(room.path)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      className="flex items-center justify-center w-14 h-14 rounded-xl border relative overflow-visible"
                      style={{
                        background: `${room.color}18`,
                        borderColor: `${room.color}40`,
                        boxShadow: `0 0 12px ${room.color}25`,
                      }}
                    >
                      <motion.span
                        className="absolute inset-0 rounded-lg border"
                        style={{ borderColor: room.color }}
                        animate={{
                          boxShadow: [
                            `0 0 0px ${room.color}00`,
                            `0 0 16px ${room.color}80, inset 0 0 8px ${room.color}40`,
                            `0 0 0px ${room.color}00`,
                          ],
                          scale: [1, 1.08, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.div
                        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: 'easeInOut',
                        }}
                      >
                        <Icon className="w-7 h-7" style={{ color: room.color }} />
                      </motion.div>
                    </motion.button>
                    <span
                      className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded text-xs font-medium z-50 opacity-0 -translate-y-1 scale-90 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
                      style={{
                        background: `${room.color}22`,
                        border: `1px solid ${room.color}55`,
                        color: room.color,
                        boxShadow: `0 0 8px ${room.color}30`,
                      }}
                    >
                      {room.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Room Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ROOMS.map((room, i) => {
              const Icon = room.icon;
              const isOpen = openRoom === room.id;
              return (
                <motion.button
                  key={room.id}
                  onClick={() => setOpenRoom(isOpen ? null : room.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="text-left p-4 rounded-xl border transition-all relative overflow-hidden"
                  style={isOpen ? {
                    background: `${room.color}12`,
                    borderColor: `${room.color}60`,
                    boxShadow: `0 0 20px ${room.color}25, inset 0 1px 0 ${room.color}15`,
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  {isOpen && (
                    <motion.div
                      layoutId="room-glow"
                      className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl"
                      style={{ background: `${room.color}30` }}
                    />
                  )}
                  <motion.div
                    animate={isOpen ? { rotate: [0, -8, 8, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 relative z-10"
                    style={{ background: `${room.color}18`, border: `1px solid ${room.color}40` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: room.color }} />
                  </motion.div>
                  <h3 className="text-xs font-heading font-bold text-white relative z-10">{room.label}</h3>
                  <p className="text-[10px] text-gray-500 mb-2 relative z-10">{room.subtitle}</p>
                  <p className="text-[10px] font-mono truncate relative z-10" style={{ color: isOpen ? room.color : 'rgba(180,180,200,0.5)' }}>
                    {room.summary()}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Room Content */}
        <AnimatePresence mode="wait">
          {openRoom && (
            <motion.div
              key={openRoom}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-3xl mx-auto px-4 pb-6 space-y-4">

                {/* 1. Identity */}
                {openRoom === 'identity' && (
                  <RoomSection icon={Radio} title="Show Identity" subtitle="Name your show, set the date, who's hosting" color="pink">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Production Name *</Label>
                        <Input value={config.production_name} onChange={e => updateConfig('production_name', e.target.value)} placeholder="Morning Beats" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Host Name</Label>
                        <Input value={config.host_name} onChange={e => updateConfig('host_name', e.target.value)} placeholder="DJ Berna" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Co-Host</Label>
                        <Input value={config.co_host_name} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Station / Channel</Label>
                        <Input value={config.station_name} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Beat Radio" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Show Date *</Label>
                        <Input type="date" value={config.show_date} onChange={e => updateConfig('show_date', e.target.value)} className="bg-black/40 border-white/10 text-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Start Time</Label>
                        <Input type="time" value={config.show_start_time} onChange={e => updateConfig('show_start_time', e.target.value)} className="bg-black/40 border-white/10 text-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Live or Recorded</Label>
                        <Select value={config.live_or_recorded} onValueChange={v => updateConfig('live_or_recorded', v)}>
                          <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="recorded">Recorded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300">Show Description</Label>
                      <Textarea value={config.show_description} onChange={e => updateConfig('show_description', e.target.value)} placeholder="Describe your show..." rows={2} className="bg-black/40 border-white/10 text-white placeholder-gray-600 resize-none" />
                    </div>
                  </RoomSection>
                )}

                {/* 2. Runtime */}
                {openRoom === 'runtime' && (
                  <RoomSection icon={Clock} title="Runtime Mix" subtitle="Distribute minutes across music, talk, sponsors" color="cyan">
                    <div className="flex h-3 rounded-full overflow-hidden mb-1">
                      <motion.div animate={{ width: `${(config.intro_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
                      <motion.div animate={{ width: `${(config.required_music_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF00FF' }} />
                      <motion.div animate={{ width: `${(config.talk_segment_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#00FFFF' }} />
                      <motion.div animate={{ width: `${(config.commercial_sponsor_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF6B00' }} />
                      <motion.div animate={{ width: `${(config.outro_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 mb-4">
                      <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#FFD700'}} />Intro</span>
                      <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#FF00FF'}} />Music</span>
                      <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#00FFFF'}} />Talk</span>
                      <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#FF6B00'}} />Sponsors</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RuntimeSlider label="Total Show" value={config.total_show_runtime} onChange={v => updateConfig('total_show_runtime', v)} max={240} color="#FFFFFF" />
                      <RuntimeSlider label="Music Runtime" value={config.required_music_runtime} onChange={v => updateConfig('required_music_runtime', v)} max={240} color="#FF00FF" />
                      <RuntimeSlider label="Talk Segments" value={config.talk_segment_runtime} onChange={v => updateConfig('talk_segment_runtime', v)} max={60} color="#00FFFF" />
                      <RuntimeSlider label="Commercials" value={config.commercial_sponsor_runtime} onChange={v => updateConfig('commercial_sponsor_runtime', v)} max={30} color="#FF6B00" />
                      <RuntimeSlider label="Intro" value={config.intro_runtime} onChange={v => updateConfig('intro_runtime', v)} max={10} color="#FFD700" />
                      <RuntimeSlider label="Outro" value={config.outro_runtime} onChange={v => updateConfig('outro_runtime', v)} max={10} color="#FFD700" />
                    </div>
                  </RoomSection>
                )}

                {/* 3. Sound Profile */}
                {openRoom === 'sound' && (
                  <RoomSection icon={Disc3} title="Sound Profile" subtitle="Genres, moods, and tone" color="purple">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-gray-300">Genres <span className="text-gray-500">({selectedGenres.length})</span></Label>
                        <button onClick={() => setCustomField(customField === 'genres' ? null : 'genres')} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Custom
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {GENRE_OPTIONS.map(opt => (
                          <NeonChip key={opt} label={opt} active={selectedGenres.includes(opt)} onClick={() => toggleArrayItem('genres', opt)} color="purple" />
                        ))}
                      </div>
                      {customField === 'genres' && (
                        <div className="flex gap-2 mt-2">
                          <Input value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom('genres'))} placeholder="Custom genre..." className="bg-black/40 border-white/10 text-white text-xs h-8 max-w-[200px]" />
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleAddCustom('genres')}>Add</Button>
                        </div>
                      )}
                      {selectedGenres.filter(g => !GENRE_OPTIONS.includes(g)).map(g => (
                        <div key={g} className="inline-flex items-center gap-1 mt-1 ml-1">
                          <NeonChip label={g} active={true} onClick={() => toggleArrayItem('genres', g)} color="purple" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-gray-300">Moods <span className="text-gray-500">({selectedMoods.length})</span></Label>
                        <button onClick={() => setCustomField(customField === 'moods' ? null : 'moods')} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Custom
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {MOOD_OPTIONS.map(opt => (
                          <NeonChip key={opt} label={opt} active={selectedMoods.includes(opt)} onClick={() => toggleArrayItem('moods', opt)} color="pink" />
                        ))}
                      </div>
                      {customField === 'moods' && (
                        <div className="flex gap-2 mt-2">
                          <Input value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom('moods'))} placeholder="Custom mood..." className="bg-black/40 border-white/10 text-white text-xs h-8 max-w-[200px]" />
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleAddCustom('moods')}>Add</Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-gray-300 mb-2 block">Show Tone <span className="text-gray-500">(pick one)</span></Label>
                      <div className="flex flex-wrap gap-1.5">
                        {TONE_OPTIONS.map(opt => (
                          <NeonChip key={opt} label={opt} active={config.show_tone === opt} onClick={() => updateConfig('show_tone', opt)} color="cyan" />
                        ))}
                      </div>
                    </div>
                  </RoomSection>
                )}

                {/* 4. Content Scope */}
                {openRoom === 'content' && (
                  <RoomSection icon={Music} title="Content Scope" subtitle="What topics and sources to research" color="orange">
                    <div>
                      <Label className="text-xs text-gray-300 mb-2 block">Music Topics <span className="text-gray-500">({selectedTopics.length})</span></Label>
                      <div className="flex flex-wrap gap-1.5">
                        {MUSIC_TOPIC_OPTIONS.map(opt => (
                          <NeonChip key={opt} label={opt} active={selectedTopics.includes(opt)} onClick={() => toggleArrayItem('music_topics', opt)} color="orange" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-300 mb-2 block">Research Sources <span className="text-gray-500">({selectedSources.length})</span></Label>
                      <div className="flex flex-wrap gap-1.5">
                        {RESEARCH_SOURCE_OPTIONS.map(opt => (
                          <NeonChip key={opt} label={opt} active={selectedSources.includes(opt)} onClick={() => toggleArrayItem('research_sources', opt)} color="green" />
                        ))}
                      </div>
                    </div>
                  </RoomSection>
                )}

                {/* 5. Playlist Rules */}
                {openRoom === 'rules' && (
                  <RoomSection icon={Sliders} title="Playlist Rules" subtitle="Must-play, blocked, variety, energy flow" color="green">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Must-Play Songs</Label>
                        <Textarea value={config.must_play_songs} onChange={e => updateConfig('must_play_songs', e.target.value)} placeholder="Song - Artist (one per line)" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Blocked Songs</Label>
                        <Textarea value={config.blocked_songs} onChange={e => updateConfig('blocked_songs', e.target.value)} placeholder="One per line" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Blocked Artists</Label>
                        <Textarea value={config.blocked_artists} onChange={e => updateConfig('blocked_artists', e.target.value)} placeholder="One per line" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Recently Played (avoid)</Label>
                        <Textarea value={config.recently_played_songs} onChange={e => updateConfig('recently_played_songs', e.target.value)} placeholder="One per line" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Max Songs Per Artist</Label>
                        <Input type="number" value={config.max_songs_per_artist} onChange={e => updateConfig('max_songs_per_artist', Number(e.target.value))} className="bg-black/40 border-white/10 text-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-300">Preferred Eras</Label>
                        <Input value={config.preferred_eras} onChange={e => updateConfig('preferred_eras', e.target.value)} placeholder="90s, 2000s, 2010s" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300">Energy Flow</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {ENERGY_FLOW_OPTIONS.map(opt => (
                          <NeonChip key={opt} label={opt} active={config.playlist_energy_flow === opt} onClick={() => updateConfig('playlist_energy_flow', opt)} color="pink" />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {[
                        ['min_artist_variety', 'Min Artist Variety'],
                        ['include_indie', 'Include Indie'],
                        ['include_local', 'Include Local'],
                        ['include_new_releases', 'New Releases'],
                        ['include_throwbacks', 'Throwbacks'],
                        ['clean_only', 'Clean Only'],
                      ].map(([field, label]) => (
                        <div key={field} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-[11px] text-gray-300">{label}</span>
                          <Switch checked={config[field]} onCheckedChange={v => updateConfig(field, v)} />
                        </div>
                      ))}
                    </div>
                  </RoomSection>
                )}

                {/* 6. AI Automation */}
                {openRoom === 'ai' && (
                  <RoomSection icon={Bot} title="AI Automation" subtitle={`What CREAPD should auto-generate (${selectedAutomation.length} selected)`} color="gold">
                    <div className="flex flex-wrap gap-1.5">
                      {AI_AUTOMATION_OPTIONS.map(opt => (
                        <NeonChip key={opt.key} label={opt.label} active={selectedAutomation.includes(opt.key)} onClick={() => toggleArrayItem('ai_automation', opt.key)} color="green" />
                      ))}
                    </div>
                  </RoomSection>
                )}

                {buildError && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{buildError}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ShowRoulette
        open={rouletteOpen}
        onClose={() => setRouletteOpen(false)}
        onApply={handleRouletteApply}
      />
    </div>
  );
}