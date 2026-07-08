import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import CursorGlow from '@/components/creap/CursorGlow';
import { Button } from '@/components/ui/button';
import { formatRuntime, formatMinutes, ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';
import {
  Music, RefreshCw, ListMusic, Mic, ClipboardList, Sparkles, Download,
  Settings, Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2,
  Calendar, Radio, ArrowRight, Building2, Disc3, Headphones
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function AmbientBackground() {
  return (
    <>
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-berna-purple/15 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-berna-orange/15 blur-[100px]"
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-berna-emerald/10 blur-[90px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 creap-grid-bg opacity-40 pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </>
  );
}

const ACCENT_STYLES = {
  purple: { text: 'text-berna-purple', bg: 'bg-berna-purple/10', border: 'border-berna-purple/30', glow: 'hover:shadow-berna-purple/20', grad: 'from-berna-purple/20 to-transparent' },
  orange: { text: 'text-berna-orange', bg: 'bg-berna-orange/10', border: 'border-berna-orange/30', glow: 'hover:shadow-berna-orange/20', grad: 'from-berna-orange/20 to-transparent' },
  emerald: { text: 'text-berna-emerald', bg: 'bg-berna-emerald/10', border: 'border-berna-emerald/30', glow: 'hover:shadow-berna-emerald/20', grad: 'from-berna-emerald/20 to-transparent' },
  white: { text: 'text-white', bg: 'bg-white/5', border: 'border-white/10', glow: 'hover:shadow-white/10', grad: 'from-white/10 to-transparent' },
};

function MetricCard({ label, value, accent = 'white', icon: Icon, delay }) {
  const s = ACCENT_STYLES[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4 }}
      className={`relative overflow-hidden rounded-xl border ${s.border} bg-gradient-to-br ${s.grad} backdrop-blur-xl p-4 transition-shadow ${s.glow} hover:shadow-lg`}
    >
      {Icon && (
        <div className={`absolute top-3 right-3 w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${s.text}`} />
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-heading font-bold ${s.text}`}>{value}</p>
    </motion.div>
  );
}

function WidgetCard({ icon: Icon, title, accent = 'purple', delay, children, action }) {
  const s = ACCENT_STYLES[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.01] backdrop-blur-xl"
    >
      <div className={`h-0.5 w-full bg-gradient-to-r ${s.grad.replace('from-', 'from-').replace('to-transparent', 'to-transparent')} ${s.text.replace('text-', 'bg-')}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${s.text}`} />
            </div>
            <h3 className="font-heading font-semibold text-white text-sm">{title}</h3>
          </div>
          {action}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status, matched }) {
  const cls = matched
    ? 'bg-berna-emerald/15 text-berna-emerald border-berna-emerald/30'
    : 'bg-berna-orange/15 text-berna-orange border-berna-orange/30';
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${cls} font-medium`}>{status}</span>
  );
}

function RuntimeBar({ config }) {
  const total = config.total_show_runtime || 0;
  if (total === 0) return null;
  const segments = [
    { label: 'Music', mins: config.required_music_runtime || 0, color: 'bg-berna-purple' },
    { label: 'Talk', mins: config.talk_segment_runtime || 0, color: 'bg-berna-orange' },
    { label: 'Commercial', mins: config.commercial_sponsor_runtime || 0, color: 'bg-berna-emerald' },
    { label: 'Intro', mins: config.intro_runtime || 0, color: 'bg-blue-400' },
    { label: 'Outro', mins: config.outro_runtime || 0, color: 'bg-pink-400' },
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
              className={`${seg.color} relative group`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: 0.1 * i }}
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
          <span key={i} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`w-2 h-2 rounded-sm ${seg.color}`} />
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
          stroke="url(#readinessGrad)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.3 }}
        />
        <defs>
          <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(152 60% 45%)" />
            <stop offset="100%" stopColor="hsl(270 80% 60%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-heading font-bold text-white">{percent}%</span>
        <span className="text-[9px] text-muted-foreground">{done}/{total}</span>
      </div>
    </div>
  );
}

export default function MusicDashboard() {
  const { config, playlist, topics, research, rundown, assets, loading, refresh } = useMusicProduction();
  const [refreshing, setRefreshing] = useState(false);

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
      <div className="relative flex items-center justify-center h-screen overflow-hidden creapd-bg-gradient">
        <AmbientBackground />
        <CursorGlow />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Disc3 className="w-10 h-10 text-berna-purple" />
        </motion.div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="relative flex items-center justify-center h-screen p-6 overflow-hidden creapd-bg-gradient">
        <AmbientBackground />
        <CursorGlow />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center relative z-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-berna-purple/30 to-berna-purple/5 border border-berna-purple/30 mb-6">
            <Music className="w-10 h-10 text-berna-purple" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-3 text-white">No Music Production Found</h2>
          <p className="text-muted-foreground mb-6">Configure your music production to get started. Producer will build everything automatically.</p>
          <Button asChild size="lg" className="bg-gradient-to-r from-berna-emerald to-berna-purple hover:opacity-90 text-white border-0">
            <Link to="/music/configure">Configure Production</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  if (config.status === 'building' || refreshing) {
    return (
      <div className="relative flex items-center justify-center h-screen p-6 overflow-hidden creapd-bg-gradient">
        <AmbientBackground />
        <CursorGlow />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center relative z-10"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-berna-purple/30 to-berna-purple/5 border border-berna-purple/30 mb-6"
          >
            <Disc3 className="w-10 h-10 text-berna-purple" />
          </motion.div>
          <h2 className="text-2xl font-heading font-bold mb-3 text-white">Building Your Production</h2>
          <p className="text-muted-foreground mb-8">Generating playlist, research, topics, rundown, and AI assets...</p>
          <div className="space-y-2.5 text-left">
            {['Generating playlist plan', 'Researching music topics', 'Building show rundown', 'Generating AI assets'].map((label, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-3 text-sm rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl px-4 py-3"
              >
                <Loader2 className="w-4 h-4 animate-spin text-berna-purple" />
                <span className="text-muted-foreground">{label}...</span>
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
    { label: 'Playlist', icon: ListMusic, path: '/music/playlist', accent: 'purple' },
    { label: 'Topics', icon: Mic, path: '/music/topics', accent: 'emerald' },
    { label: 'Rundown', icon: ClipboardList, path: '/music/rundown', accent: 'orange' },
    { label: 'AI Assets', icon: Sparkles, path: '/music/assets', accent: 'emerald' },
    { label: 'Export', icon: Download, path: '/music/export', accent: 'orange' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden creapd-bg-gradient">
      <AmbientBackground />
      <CursorGlow />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-berna-purple/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-berna-purple/25 via-berna-navy/40 to-berna-orange/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <motion.div
            className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-berna-purple/20 blur-[80px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-berna-purple/40 to-berna-purple/10 border border-berna-purple/40 flex items-center justify-center"
              >
                <Disc3 className="w-7 h-7 text-berna-purple" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-berna-purple font-semibold bg-berna-purple/15 px-2 py-0.5 rounded-full border border-berna-purple/20">Music Production</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-white leading-tight">{config.production_name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-berna-orange" /> {config.show_date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-berna-orange" /> {config.show_start_time}</span>
                  {config.station_name && <span className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-berna-orange" /> {config.station_name}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleRefresh} className="border-berna-purple/30 hover:border-berna-purple/60 hover:bg-berna-purple/10">
                <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" asChild className="border-berna-orange/30 hover:border-berna-orange/60 hover:bg-berna-orange/10">
                <Link to={`/music/configure?config_id=${config.id}`}>
                  <Settings className="w-4 h-4 mr-1.5" /> Edit
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Metrics + Readiness Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard label="Total Runtime" value={formatMinutes(config.total_show_runtime)} icon={Clock} delay={0.05} />
          <MetricCard label="Music Runtime" value={formatMinutes(config.required_music_runtime)} accent="purple" icon={Headphones} delay={0.1} />
          <MetricCard label="Genres" value={`${genres.length} selected`} accent="orange" icon={Music} delay={0.15} />
          <MetricCard label="Mood" value={`${moods.length} selected`} accent="emerald" icon={Sparkles} delay={0.2} />
          {/* Readiness Ring */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="relative overflow-hidden rounded-xl border border-berna-emerald/20 bg-gradient-to-br from-berna-emerald/15 to-transparent backdrop-blur-xl p-4 flex items-center gap-3"
          >
            <ReadinessRing percent={readinessPercent} done={checklistDone} total={checklist.length} />
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Readiness</p>
              <p className="text-sm text-berna-emerald font-medium">
                {checklistDone === checklist.length ? 'Ready to go!' : 'In progress...'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{checklist.length - checklistDone} tasks left</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleRefresh} className="bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:opacity-90 text-white border-0">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Production
          </Button>
          {QUICK_ACTIONS.map((qa, i) => {
            const s = ACCENT_STYLES[qa.accent];
            return (
              <Button key={i} size="sm" variant="outline" asChild className={`border-white/10 hover:${s.border} hover:${s.bg} transition-all`}>
                <Link to={qa.path}>
                  <qa.icon className={`w-4 h-4 mr-1.5 ${s.text}`} /> {qa.label}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Playlist Plan */}
          <WidgetCard icon={ListMusic} title="Playlist Plan" accent="purple" delay={0.1}
            action={<StatusBadge status={playlistStatus} matched={playlistMatched} />}
          >
            {playlist.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Songs</p>
                    <p className="text-base font-heading font-bold text-white">{playlist.length}</p>
                  </div>
                  <div className="rounded-lg bg-berna-purple/10 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Runtime</p>
                    <p className="text-base font-heading font-bold text-berna-purple">{formatRuntime(playlistRuntime)}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Required</p>
                    <p className="text-base font-heading font-bold text-white">{formatRuntime(requiredMusicSeconds)}</p>
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
                      <span className="w-6 h-6 rounded-md bg-berna-purple/15 text-berna-purple text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="font-medium truncate flex-1 text-white">{song.song_title}</span>
                      <span className="text-muted-foreground text-xs truncate hidden sm:inline">{song.artist}</span>
                      <span className="text-muted-foreground text-xs">{formatRuntime(song.length_seconds)}</span>
                    </motion.div>
                  ))}
                  {playlist.length > 5 && <p className="text-xs text-muted-foreground text-center pt-1">+ {playlist.length - 5} more songs</p>}
                </div>
                <Button size="sm" variant="ghost" asChild className="w-full hover:bg-berna-purple/10">
                  <Link to="/music/playlist">Open Playlist Builder <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              <EmptyState message="No playlist has been generated yet." actionLabel="Generate playlist" onAction={handleRefresh} />
            )}
          </WidgetCard>

          {/* Runtime Status */}
          <WidgetCard icon={Clock} title="Runtime Breakdown" accent="orange" delay={0.15}>
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
          <WidgetCard icon={Mic} title="Selected Topics" accent="emerald" delay={0.2}>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${topic.status === 'ready' ? 'bg-berna-emerald/15 text-berna-emerald border-berna-emerald/30' : 'bg-white/5 text-muted-foreground border-white/10'}`}>
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
          <WidgetCard icon={TrendingUp} title="Research Updates" accent="purple" delay={0.25}>
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{item.source}</span>
                      <span className={`px-1.5 py-0.5 rounded border ${item.relevance === 'high' ? 'bg-berna-emerald/15 text-berna-emerald border-berna-emerald/30' : 'bg-white/5 border-white/10'}`}>{item.relevance}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState message="No research has been generated yet." onAction={handleRefresh} actionLabel="Refresh" />
            )}
          </WidgetCard>

          {/* Show Rundown Preview */}
          <WidgetCard icon={ClipboardList} title="Show Rundown" accent="orange" delay={0.3}>
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
                    <span className="text-xs text-muted-foreground w-12 font-mono">{item.start_time || ''}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${SEGMENT_TYPE_LABELS[item.segment_type] ? 'bg-berna-purple/15 text-berna-purple border-berna-purple/30' : 'bg-white/5 border-white/10'}`}>
                      {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                    </span>
                    <span className="truncate text-white">{item.title}</span>
                  </motion.div>
                ))}
                <Button size="sm" variant="ghost" asChild className="w-full mt-2 hover:bg-berna-orange/10">
                  <Link to="/music/rundown">Open Rundown <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              <EmptyState message="No show rundown has been generated yet." onAction={handleRefresh} actionLabel="Generate" />
            )}
          </WidgetCard>

          {/* AI Assets */}
          <WidgetCard icon={Sparkles} title="AI Generated Assets" accent="emerald" delay={0.35}>
            {assets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {assets.slice(0, 8).map((asset, i) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                    className="text-xs py-2 px-2.5 rounded-lg bg-berna-emerald/8 border border-berna-emerald/15 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-berna-emerald shrink-0" />
                    <span className="truncate text-white">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
                  </motion.div>
                ))}
                <Button size="sm" variant="ghost" asChild className="col-span-2 mt-1 hover:bg-berna-emerald/10">
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
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.01] backdrop-blur-xl p-5"
        >
          <div className="h-0.5 w-full bg-gradient-to-r from-berna-emerald via-berna-purple to-berna-orange opacity-50" />
          <h3 className="font-heading font-semibold text-white mb-4 flex items-center gap-2.5 mt-3">
            <div className="w-9 h-9 rounded-xl bg-berna-emerald/10 border border-berna-emerald/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-berna-emerald" />
            </div>
            Production Checklist
            <span className="ml-auto text-sm text-muted-foreground">{checklistDone}/{checklist.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checklist.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.03 }}
                className={`flex items-center gap-2.5 text-sm py-2 px-3 rounded-lg transition-colors ${item.done ? 'bg-berna-emerald/5' : 'bg-white/[0.02]'}`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-berna-emerald shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span className={item.done ? 'text-white' : 'text-muted-foreground'}>{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function RuntimeRow({ label, minutes, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? 'text-berna-purple' : 'text-white'}`}>{formatMinutes(minutes)}</span>
    </div>
  );
}

function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}