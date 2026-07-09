import React, { useState, useEffect, useRef } from 'react';
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
  Loader2, Music, Calendar, Clock, Tag, Smile, Mic, ListChecks,
  Search, ListFilter, Bot, CheckCircle2, Building2, ChevronDown,
  ChevronUp, Plus, X, Radio, Disc3, Zap, Sliders
} from 'lucide-react';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── Neon tag chip ──
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
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
        active ? 'scale-105' : 'opacity-60 hover:opacity-100'
      }`}
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
    </button>
  );
}

// ── Collapsible section ──
function Section({ id, icon: Icon, title, subtitle, color, children, defaultOpen, sectionRef }) {
  const [open, setOpen] = useState(defaultOpen);
  const colorMap = {
    pink: '#FF00FF', cyan: '#00FFFF', purple: '#8B00FF',
    orange: '#FF6B00', green: '#00FF88', gold: '#FFD700',
  };
  const c = colorMap[color] || '#FF00FF';
  return (
    <motion.div
      ref={sectionRef}
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
      className="cp-glass overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${c}15`, border: `1px solid ${c}40`, boxShadow: `0 0 12px ${c}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: c }} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-heading font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Runtime slider ──
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
  const [customField, setCustomField] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [activeSection, setActiveSection] = useState('identity');
  const sectionRefs = { identity: useRef(), runtime: useRef(), sound: useRef(), content: useRef(), rules: useRef(), ai: useRef() };

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

  const selectedGenres = safeParse(config.genres, []);
  const selectedMoods = safeParse(config.moods, []);
  const selectedTopics = safeParse(config.music_topics, []);
  const selectedSources = safeParse(config.research_sources, []);
  const selectedAutomation = safeParse(config.ai_automation, []);

  // Quick nav pills
  const NAV_SECTIONS = [
    { id: 'identity', label: 'Identity', icon: Radio, color: '#FF00FF' },
    { id: 'runtime', label: 'Runtime', icon: Clock, color: '#00FFFF' },
    { id: 'sound', label: 'Sound', icon: Disc3, color: '#8B00FF' },
    { id: 'content', label: 'Content', icon: ListChecks, color: '#FF6B00' },
    { id: 'rules', label: 'Rules', icon: ListFilter, color: '#00FF88' },
    { id: 'ai', label: 'AI', icon: Bot, color: '#FFD700' },
  ];

  const scrollToSection = (id) => {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      for (const s of NAV_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(s.id);
            break;
          }
        }
      }
    };
    const container = document.querySelector('.config-scroll');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const canBuild = config.production_name && config.show_date;

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 backdrop-blur-xl bg-black/60 border-b border-white/5 px-5 py-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)', boxShadow: '0 0 16px rgba(255,0,255,0.2)' }}
            >
              <Radio className="w-5 h-5" style={{ color: '#FF00FF' }} />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">Discovery Room</h1>
              <p className="text-xs text-gray-400">Configure your music production — all settings on one page</p>
            </div>
          </div>

          {/* Quick section nav */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {NAV_SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap border transition-all ${
                    isActive ? 'scale-105' : 'opacity-50 hover:opacity-80'
                  }`}
                  style={isActive ? {
                    background: `${s.color}15`,
                    borderColor: `${s.color}50`,
                    color: s.color,
                    boxShadow: `0 0 8px ${s.color}30`,
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'gray',
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

          {/* ── 1. Identity ── */}
          <Section
            id="identity"
            ref={sectionRefs.identity}
            icon={Radio}
            title="Show Identity"
            subtitle="Name your show, set the date, who's hosting"
            color="pink"
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Production Name *</Label>
                <Input
                  value={config.production_name}
                  onChange={e => updateConfig('production_name', e.target.value)}
                  placeholder="Morning Beats"
                  className="bg-black/40 border-white/10 text-white placeholder-gray-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Host Name</Label>
                <Input
                  value={config.host_name}
                  onChange={e => updateConfig('host_name', e.target.value)}
                  placeholder="DJ Berna"
                  className="bg-black/40 border-white/10 text-white placeholder-gray-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Co-Host</Label>
                <Input
                  value={config.co_host_name}
                  onChange={e => updateConfig('co_host_name', e.target.value)}
                  placeholder="Optional"
                  className="bg-black/40 border-white/10 text-white placeholder-gray-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Station / Channel</Label>
                <Input
                  value={config.station_name}
                  onChange={e => updateConfig('station_name', e.target.value)}
                  placeholder="Beat Radio"
                  className="bg-black/40 border-white/10 text-white placeholder-gray-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Show Date *</Label>
                <Input
                  type="date"
                  value={config.show_date}
                  onChange={e => updateConfig('show_date', e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Start Time</Label>
                <Input
                  type="time"
                  value={config.show_start_time}
                  onChange={e => updateConfig('show_start_time', e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                />
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
              <Textarea
                value={config.show_description}
                onChange={e => updateConfig('show_description', e.target.value)}
                placeholder="Describe your show..."
                rows={2}
                className="bg-black/40 border-white/10 text-white placeholder-gray-600 resize-none"
              />
            </div>
          </Section>

          {/* ── 2. Runtime ── */}
          <Section
            id="runtime"
            ref={sectionRefs.runtime}
            icon={Clock}
            title="Runtime Mix"
            subtitle="Distribute minutes across music, talk, sponsors"
            color="cyan"
            defaultOpen={false}
          >
            {/* Visual time bar */}
            <div className="flex h-3 rounded-full overflow-hidden mb-1">
              <div style={{ width: `${(config.intro_runtime/config.total_show_runtime)*100}%`, background: '#FFD700' }} title="Intro" />
              <div style={{ width: `${(config.required_music_runtime/config.total_show_runtime)*100}%`, background: '#FF00FF' }} title="Music" />
              <div style={{ width: `${(config.talk_segment_runtime/config.total_show_runtime)*100}%`, background: '#00FFFF' }} title="Talk" />
              <div style={{ width: `${(config.commercial_sponsor_runtime/config.total_show_runtime)*100}%`, background: '#FF6B00' }} title="Sponsors" />
              <div style={{ width: `${(config.outro_runtime/config.total_show_runtime)*100}%`, background: '#FFD700' }} title="Outro" />
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
          </Section>

          {/* ── 3. Sound Profile ── */}
          <Section
            id="sound"
            ref={sectionRefs.sound}
            icon={Disc3}
            title="Sound Profile"
            subtitle="Genres, moods, and tone"
            color="purple"
            defaultOpen={false}
          >
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
          </Section>

          {/* ── 4. Content Scope ── */}
          <Section
            id="content"
            ref={sectionRefs.content}
            icon={ListChecks}
            title="Content Scope"
            subtitle="What topics and sources to research"
            color="orange"
            defaultOpen={false}
          >
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
          </Section>

          {/* ── 5. Playlist Rules ── */}
          <Section
            id="rules"
            ref={sectionRefs.rules}
            icon={ListFilter}
            title="Playlist Rules"
            subtitle="Must-play, blocked, variety, energy flow"
            color="green"
            defaultOpen={false}
          >
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
          </Section>

          {/* ── 6. AI Automation ── */}
          <Section
            id="ai"
            ref={sectionRefs.ai}
            icon={Bot}
            title="AI Automation"
            subtitle={`What CREAPD should auto-generate (${selectedAutomation.length} selected)`}
            color="gold"
            defaultOpen={false}
          >
            <div className="flex flex-wrap gap-1.5">
              {AI_AUTOMATION_OPTIONS.map(opt => (
                <NeonChip key={opt.key} label={opt.label} active={selectedAutomation.includes(opt.key)} onClick={() => toggleArrayItem('ai_automation', opt.key)} color="green" />
              ))}
            </div>
          </Section>

          {buildError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{buildError}</div>
          )}
        </div>
      </div>

      {/* Sticky build bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:left-60">
        <div className="backdrop-blur-xl bg-black/80 border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="w-4 h-4" style={{ color: canBuild ? '#00FF88' : '#555' }} />
              <span className="truncate max-w-[150px]">{config.production_name || 'Untitled Show'}</span>
              <span className="text-gray-600">·</span>
              <span>{selectedGenres.length} genres</span>
              <span className="text-gray-600">·</span>
              <span>{config.required_music_runtime} min music</span>
            </div>
          </div>
          <Button
            onClick={handleBuild}
            disabled={!canBuild}
            size="lg"
            className="shrink-0"
            style={canBuild ? {
              background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
              boxShadow: '0 0 20px rgba(255,0,255,0.4)',
            } : {}}
          >
            <Zap className="w-4 h-4 mr-1.5" />
            Build Production
          </Button>
        </div>
      </div>
    </div>
  );
}