import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { useProductionDepartments } from '@/hooks/useProductionDepartments';
import { Button } from '@/components/ui/button';
import { formatRuntime, formatMinutes, ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';
import DepartmentWorkflowBar from '@/components/production/DepartmentWorkflowBar';
import DepartmentDetailPanel from '@/components/production/DepartmentDetailPanel';
import {
  Music, RefreshCw, ListMusic, Mic, ClipboardList, Sparkles, Download,
  Settings, Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2,
  Calendar, Radio, ArrowRight, Building2, Disc3, Headphones
} from 'lucide-react';

const CP_BG = 'https://media.base44.com/images/public/6a4126962e5804304cc84b12/97fafc255_generated_image.png';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function CyberpunkBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${CP_BG})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 pointer-events-none" />
      <div className="absolute inset-0 cp-grid-floor pointer-events-none" />
      {/* Floating equalizer bars */}
      <div className="absolute bottom-8 right-8 flex items-end gap-1 h-16 pointer-events-none opacity-30">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="cp-eq-bar w-1.5 rounded-t"
            style={{
              animationDelay: `${i * 0.1}s`,
              background: i % 2 === 0 ? '#FF00FF' : '#00FFFF',
              boxShadow: `0 0 8px ${i % 2 === 0 ? '#FF00FF' : '#00FFFF'}`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function MetricCard({ label, value, accent, icon: Icon, delay }) {
  const isPink = accent === 'pink';
  const isCyan = accent === 'cyan';
  const color = isPink ? '#FF00FF' : isCyan ? '#00FFFF' : '#FFFFFF';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden cp-glass p-4"
      style={{ borderColor: isPink ? 'rgba(255,0,255,0.25)' : isCyan ? 'rgba(0,255,255,0.25)' : 'rgba(255,255,255,0.08)' }}
    >
      {Icon && (
        <div
          className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}40` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      )}
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold" style={{ color, textShadow: `0 0 8px ${color}60` }}>{value}</p>
    </motion.div>
  );
}

function WidgetCard({ icon: Icon, title, accent, delay, children, action }) {
  const color = accent === 'pink' ? '#FF00FF' : accent === 'cyan' ? '#00FFFF' : '#FFFFFF';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="cp-glass"
      style={{ borderColor: `${color}20` }}
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${color}12`, border: `1px solid ${color}30` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
          </div>
          {action}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status, matched }) {
  const color = matched ? '#00FFFF' : '#FF00FF';
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full border font-medium"
      style={{ background: `${color}15`, color, borderColor: `${color}40` }}
    >
      {status}
    </span>
  );
}

function RuntimeBar({ config }) {
  const total = config.total_show_runtime || 0;
  if (total === 0) return null;
  const segments = [
    { label: 'Music', mins: config.required_music_runtime || 0, color: '#FF00FF' },
    { label: 'Talk', mins: config.talk_segment_runtime || 0, color: '#00FFFF' },
    { label: 'Commercial', mins: config.commercial_sponsor_runtime || 0, color: '#8B00FF' },
    { label: 'Intro', mins: config.intro_runtime || 0, color: '#00FF88' },
    { label: 'Outro', mins: config.outro_runtime || 0, color: '#FF6B00' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden bg-white/5 gap-0.5">
        {segments.map((seg, i) => {
          const pct = (seg.mins / total) * 100;
          if (pct === 0) return null;
          return (
            <motion.div
              key={i}
              className="relative group"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: 0.1 * i }}
              style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}80` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[8px] font-bold text-white whitespace-nowrap">{seg.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-sm" style={{ background: seg.color }} />
            {seg.label}: <span className="text-white font-medium">{formatMinutes(seg.mins)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadinessRing({ percent, done, total }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <motion.circle
          cx="32" cy="32" r={radius} fill="none"
          stroke="url(#cpReadyGrad)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{ filter: 'drop-shadow(0 0 4px #FF00FF)' }}
        />
        <defs>
          <linearGradient id="cpReadyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFFF" />
            <stop offset="100%" stopColor="#FF00FF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white" style={{ textShadow: '0 0 8px rgba(255,0,255,0.5)' }}>{percent}%</span>
        <span className="text-[9px] text-gray-400">{done}/{total}</span>
      </div>
    </div>
  );
}

export default function MusicDashboard() {
  const { config, playlist, topics, research, rundown, assets, loading, refresh } = useMusicProduction();
  const [refreshing, setRefreshing] = useState(false);
  const [detailDept, setDetailDept] = useState(null);

  const {
    pipeline, loading: pipelineLoading, actionLoading: deptActionLoading,
    initPipeline, setDepartmentStatus, refresh: refreshPipeline,
  } = useProductionDepartments('music', config?.id);

  // Auto-init pipeline when config loads
  useEffect(() => {
    if (config?.id && !pipeline && !pipelineLoading) {
      initPipeline(config.production_name || 'Music Production');
    }
  }, [config?.id, pipeline, pipelineLoading, initPipeline]);

  useEffect(() => {
    if (config?.status === 'building') {
      const interval = setInterval(async () => {
        if (config?.id) {
          const updated = await base44.entities.MusicProductionConfiguration.get(config.id);
          if (updated && (updated.status === 'ready' || updated.status === 'failed')) {
            clearInterval(interval);
            refresh();
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [config?.status, config?.id, refresh]);

  const handleRefresh = async () => {
    if (!config?.id) return;
    setRefreshing(true);
    try {
      await base44.entities.MusicProductionConfiguration.update(config.id, { status: 'building' });
      await base44.functions.invoke('buildMusicProduction', { configuration_id: config.id });
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="relative flex items-center justify-center h-screen overflow-hidden bg-black">
        <CyberpunkBackground />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Disc3 className="w-10 h-10" style={{ color: '#FF00FF', filter: 'drop-shadow(0 0 8px #FF00FF)' }} />
        </motion.div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="relative flex items-center justify-center h-screen p-6 overflow-hidden bg-black">
        <CyberpunkBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center relative z-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
            style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)', boxShadow: '0 0 20px rgba(255,0,255,0.2)' }}
          >
            <Music className="w-10 h-10" style={{ color: '#FF00FF' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white cp-glitch">No Music Production Found</h2>
          <p className="text-gray-400 mb-6">Configure your music production to get started. Producer will build everything automatically.</p>
          <Button asChild size="lg" className="cp-btn-gradient border-0 text-white hover:opacity-90">
            <Link to="/music/configure">Configure Production</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  if (config.status === 'building' || refreshing) {
    return (
      <div className="relative flex items-center justify-center h-screen p-6 overflow-hidden bg-black">
        <CyberpunkBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center relative z-10"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
            style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)', boxShadow: '0 0 20px rgba(255,0,255,0.2)' }}
          >
            <Disc3 className="w-10 h-10" style={{ color: '#FF00FF', filter: 'drop-shadow(0 0 8px #FF00FF)' }} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3 text-white cp-glitch">Building Your Production</h2>
          <p className="text-gray-400 mb-8">Generating playlist, research, topics, rundown, and AI assets...</p>
          <div className="space-y-2.5 text-left">
            {['Generating playlist plan', 'Researching music topics', 'Building show rundown', 'Generating AI assets'].map((label, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-3 text-sm cp-glass px-4 py-3"
              >
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FF00FF' }} />
                <span className="text-gray-400">{label}...</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const genres = safeParse(config.genres, []);
  const moods = safeParse(config.moods, []);

  const playlistRuntime = playlist.reduce((sum, s) => sum + (s.length_seconds || 0), 0);
  const requiredMusicSeconds = (config.required_music_runtime || 0) * 60;
  const remainingSeconds = requiredMusicSeconds - playlistRuntime;
  const overageSeconds = playlistRuntime - requiredMusicSeconds;

  const playlistStatus = playlist.length === 0 ? 'Not Generated' :
    remainingSeconds > 60 ? 'Runtime Short' :
    overageSeconds > 60 ? 'Runtime Over' :
    'Runtime Matched';
  const playlistMatched = playlistStatus === 'Runtime Matched';

  const checklist = [
    { label: 'Configuration Saved', done: !!config.production_name },
    { label: 'Playlist Generated', done: playlist.length > 0 },
    { label: 'Playlist Runtime Checked', done: playlist.length > 0 && Math.abs(remainingSeconds) < 120 },
    { label: 'Music Topics Generated', done: topics.length > 0 },
    { label: 'Song Intros Generated', done: assets.some(a => a.asset_type === 'song_intro') },
    { label: 'Artist Facts Generated', done: assets.some(a => a.asset_type === 'artist_fact') },
    { label: 'Show Rundown Generated', done: rundown.length > 0 },
    { label: 'Social Captions Generated', done: assets.some(a => a.asset_type === 'social_caption') },
    { label: 'Thumbnail Prompt Generated', done: assets.some(a => a.asset_type === 'thumbnail_prompt') },
    { label: 'Production Notes Generated', done: assets.some(a => a.asset_type === 'production_notes') },
  ];

  const checklistDone = checklist.filter(c => c.done).length;
  const readinessPercent = Math.round((checklistDone / checklist.length) * 100);

  const QUICK_ACTIONS = [
    { label: 'Playlist', icon: ListMusic, path: '/music/playlist', accent: 'pink' },
    { label: 'Topics', icon: Mic, path: '/music/topics', accent: 'cyan' },
    { label: 'Rundown', icon: ClipboardList, path: '/music/rundown', accent: 'pink' },
    { label: 'AI Assets', icon: Sparkles, path: '/music/assets', accent: 'cyan' },
    { label: 'Export', icon: Download, path: '/music/export', accent: 'pink' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkBackground />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl cp-glass"
          style={{ borderColor: 'rgba(255,0,255,0.2)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF00FF]/15 via-transparent to-[#00FFFF]/10" />
          <motion.div
            className="absolute -top-20 -right-10 w-64 h-64 rounded-full blur-[80px]"
            style={{ background: 'rgba(255,0,255,0.2)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full blur-[80px]"
            style={{ background: 'rgba(0,255,255,0.15)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,0,255,0.15)', border: '1px solid rgba(255,0,255,0.4)', boxShadow: '0 0 16px rgba(255,0,255,0.2)' }}
              >
                <Disc3 className="w-7 h-7" style={{ color: '#FF00FF' }} />
              </motion.div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border"
                    style={{ background: 'rgba(255,0,255,0.15)', color: '#FF00FF', borderColor: 'rgba(255,0,255,0.3)' }}
                  >
                    Music Production
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white cp-glitch leading-tight">{config.production_name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" style={{ color: '#00FFFF' }} /> {config.show_date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" style={{ color: '#00FFFF' }} /> {config.show_start_time}</span>
                  {config.station_name && <span className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" style={{ color: '#00FFFF' }} /> {config.station_name}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleRefresh}
                className="border-[#FF00FF]/40 hover:border-[#FF00FF]/70 hover:bg-[#FF00FF]/10">
                <RefreshCw className="w-4 h-4 mr-1.5" style={{ color: '#FF00FF' }} /> Refresh
              </Button>
              <Button variant="outline" size="sm" asChild
                className="border-[#00FFFF]/40 hover:border-[#00FFFF]/70 hover:bg-[#00FFFF]/10">
                <Link to={`/music/configure?config_id=${config.id}`}>
                  <Settings className="w-4 h-4 mr-1.5" style={{ color: '#00FFFF' }} /> Edit
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* PP-ARCH-001: Universal Department Pipeline */}
        <DepartmentWorkflowBar
          profileKey="music"
          pipeline={pipeline}
          loading={pipelineLoading}
          actionLoading={deptActionLoading}
          onAdvance={(dept) => setDetailDept(dept)}
        />

        {/* Metrics + Readiness Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard label="Total Runtime" value={formatMinutes(config.total_show_runtime)} icon={Clock} delay={0.05} />
          <MetricCard label="Music Runtime" value={formatMinutes(config.required_music_runtime)} accent="pink" icon={Headphones} delay={0.1} />
          <MetricCard label="Genres" value={`${genres.length} selected`} accent="cyan" icon={Music} delay={0.15} />
          <MetricCard label="Mood" value={`${moods.length} selected`} icon={Sparkles} delay={0.2} />
          {/* Readiness Ring */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="relative overflow-hidden cp-glass p-4 flex items-center gap-3"
            style={{ borderColor: 'rgba(0,255,255,0.2)' }}
          >
            <ReadinessRing percent={readinessPercent} done={checklistDone} total={checklist.length} />
            <div>
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Readiness</p>
              <p className="text-sm font-medium" style={{ color: '#00FFFF' }}>
                {checklistDone === checklist.length ? 'Ready to go!' : 'In progress...'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{checklist.length - checklistDone} tasks left</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleRefresh} className="cp-btn-gradient border-0 text-white hover:opacity-90">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Production
          </Button>
          {QUICK_ACTIONS.map((qa, i) => {
            const color = qa.accent === 'pink' ? '#FF00FF' : '#00FFFF';
            return (
              <Button key={i} size="sm" variant="outline" asChild
                className="border-white/10 hover:bg-white/5 transition-all"
              >
                <Link to={qa.path}>
                  <qa.icon className="w-4 h-4 mr-1.5" style={{ color }} /> {qa.label}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Playlist Plan */}
          <WidgetCard icon={ListMusic} title="Playlist Plan" accent="pink" delay={0.1}
            action={<StatusBadge status={playlistStatus} matched={playlistMatched} />}
          >
            {playlist.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-xs text-gray-400">Songs</p>
                    <p className="text-base font-bold text-white">{playlist.length}</p>
                  </div>
                  <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,0,255,0.1)' }}>
                    <p className="text-xs text-gray-400">Runtime</p>
                    <p className="text-base font-bold" style={{ color: '#FF00FF' }}>{formatRuntime(playlistRuntime)}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-xs text-gray-400">Required</p>
                    <p className="text-base font-bold text-white">{formatRuntime(requiredMusicSeconds)}</p>
                  </div>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {playlist.slice(0, 5).map((song, i) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="flex items-center gap-2.5 text-sm py-2 px-2.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span
                        className="w-6 h-6 rounded-md text-xs flex items-center justify-center font-bold"
                        style={{ background: 'rgba(255,0,255,0.15)', color: '#FF00FF' }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium truncate flex-1 text-white">{song.song_title}</span>
                      <span className="text-gray-400 text-xs truncate hidden sm:inline">{song.artist}</span>
                      <span className="text-gray-400 text-xs">{formatRuntime(song.length_seconds)}</span>
                    </motion.div>
                  ))}
                  {playlist.length > 5 && <p className="text-xs text-gray-400 text-center pt-1">+ {playlist.length - 5} more songs</p>}
                </div>
                <Button size="sm" variant="ghost" asChild className="w-full hover:bg-white/5">
                  <Link to="/music/playlist">Open Playlist Builder <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              <EmptyState message="No playlist has been generated yet." actionLabel="Generate playlist" onAction={handleRefresh} />
            )}
          </WidgetCard>

          {/* Runtime Status */}
          <WidgetCard icon={Clock} title="Runtime Breakdown" accent="cyan" delay={0.15}>
            <div className="space-y-4">
              <RuntimeBar config={config} />
              <div className="space-y-1.5 text-sm pt-2 border-t border-white/5">
                <RuntimeRow label="Total Show" minutes={config.total_show_runtime} />
                <RuntimeRow label="Music" minutes={config.required_music_runtime} highlight />
                <RuntimeRow label="Talk / Segments" minutes={config.talk_segment_runtime} />
                <RuntimeRow label="Commercial / Sponsor" minutes={config.commercial_sponsor_runtime} />
                <RuntimeRow label="Intro" minutes={config.intro_runtime} />
                <RuntimeRow label="Outro" minutes={config.outro_runtime} />
                <div className="border-t border-white/5 pt-1.5 mt-1.5">
                  <RuntimeRow label="Unassigned" minutes={Math.max(0, (config.total_show_runtime || 0) - (config.required_music_runtime || 0) - (config.talk_segment_runtime || 0) - (config.commercial_sponsor_runtime || 0) - (config.intro_runtime || 0) - (config.outro_runtime || 0))} />
                </div>
              </div>
            </div>
          </WidgetCard>

          {/* Selected Topics */}
          <WidgetCard icon={Mic} title="Selected Topics" accent="cyan" delay={0.2}>
            {topics.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {topics.map((topic, i) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    className="flex items-center justify-between text-sm py-2 px-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="font-medium truncate text-white">{topic.topic_name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={topic.status === 'ready'
                        ? { background: 'rgba(0,255,255,0.15)', color: '#00FFFF', borderColor: 'rgba(0,255,255,0.3)' }
                        : { background: 'rgba(255,255,255,0.05)', color: '#999', borderColor: 'rgba(255,255,255,0.1)' }
                      }
                    >
                      {topic.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState message="No music topics were selected. Edit your configuration to add topics." />
            )}
          </WidgetCard>

          {/* Research Updates */}
          <WidgetCard icon={TrendingUp} title="Research Updates" accent="pink" delay={0.25}>
            {research.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {research.slice(0, 6).map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="text-sm py-2 px-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <p className="font-medium truncate text-white">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{item.source}</span>
                      <span
                        className="px-1.5 py-0.5 rounded border"
                        style={item.relevance === 'high'
                          ? { background: 'rgba(0,255,255,0.15)', color: '#00FFFF', borderColor: 'rgba(0,255,255,0.3)' }
                          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
                        }
                      >
                        {item.relevance}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState message="No research has been generated yet." onAction={handleRefresh} actionLabel="Refresh" />
            )}
          </WidgetCard>

          {/* Show Rundown Preview */}
          <WidgetCard icon={ClipboardList} title="Show Rundown" accent="pink" delay={0.3}>
            {rundown.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {rundown.slice(0, 8).map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    className="flex items-center gap-2 text-sm py-2 px-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs text-gray-400 w-12 font-mono">{item.start_time || ''}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded border"
                      style={SEGMENT_TYPE_LABELS[item.segment_type]
                        ? { background: 'rgba(255,0,255,0.15)', color: '#FF00FF', borderColor: 'rgba(255,0,255,0.3)' }
                        : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
                      }
                    >
                      {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                    </span>
                    <span className="truncate text-white">{item.title}</span>
                  </motion.div>
                ))}
                <Button size="sm" variant="ghost" asChild className="w-full mt-2 hover:bg-white/5">
                  <Link to="/music/rundown">Open Rundown <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              <EmptyState message="No show rundown has been generated yet." onAction={handleRefresh} actionLabel="Generate" />
            )}
          </WidgetCard>

          {/* AI Assets */}
          <WidgetCard icon={Sparkles} title="AI Generated Assets" accent="cyan" delay={0.35}>
            {assets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {assets.slice(0, 8).map((asset, i) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                    className="text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5"
                    style={{ background: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.15)' }}
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: '#00FFFF' }} />
                    <span className="truncate text-white">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
                  </motion.div>
                ))}
                <Button size="sm" variant="ghost" asChild className="col-span-2 mt-1 hover:bg-white/5">
                  <Link to="/music/assets">View All Assets <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              <EmptyState message="No AI assets have been generated yet." onAction={handleRefresh} actionLabel="Generate" />
            )}
          </WidgetCard>
        </div>

        {/* Production Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative overflow-hidden cp-glass"
          style={{ borderColor: 'rgba(0,255,255,0.15)' }}
        >
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #00FFFF, #FF00FF)' }} />
          <div className="p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.3)' }}
              >
                <CheckCircle2 className="w-4 h-4" style={{ color: '#00FFFF' }} />
              </div>
              Production Checklist
              <span className="ml-auto text-sm text-gray-400">{checklistDone}/{checklist.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {checklist.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.03 }}
                  className="flex items-center gap-2.5 text-sm py-2 px-3 rounded-lg transition-colors"
                  style={item.done
                    ? { background: 'rgba(0,255,255,0.05)' }
                    : { background: 'rgba(255,255,255,0.02)' }
                  }
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#00FFFF' }} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-600 shrink-0" />
                  )}
                  <span className={item.done ? 'text-white' : 'text-gray-500'}>{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Department Detail Panel */}
      <DepartmentDetailPanel
        department={detailDept}
        profileKey="music"
        pipeline={pipeline}
        onClose={() => setDetailDept(null)}
        onSetStatus={async (dept, status) => {
          await setDepartmentStatus(dept, status);
          refreshPipeline();
        }}
        actionLoading={deptActionLoading}
      />
    </div>
  );
}

function RuntimeRow({ label, minutes, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span
        className="font-medium"
        style={highlight ? { color: '#FF00FF', textShadow: '0 0 6px rgba(255,0,255,0.4)' } : { color: '#FFFFFF' }}
      >
        {formatMinutes(minutes)}
      </span>
    </div>
  );
}

function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
      <p className="text-sm text-gray-400 mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}
          className="border-[#FF00FF]/40 hover:border-[#FF00FF]/70 hover:bg-[#FF00FF]/10"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}