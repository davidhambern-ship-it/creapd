import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { useProductionDepartments } from '@/hooks/useProductionDepartments';
import { Button } from '@/components/ui/button';
import { formatRuntime, formatMinutes, ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';
import DepartmentWorkflowBar from '@/components/production/DepartmentWorkflowBar';
import DepartmentDetailPanel from '@/components/production/DepartmentDetailPanel';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';
import MusicShowArchive from '@/components/music/MusicShowArchive';
import RegenerateDropdown from '@/components/music/RegenerateDropdown';
import DiscoveryBreakRoom from '@/components/music/DiscoveryBreakRoom';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import RadioDashboardOverview from '@/components/music/RadioDashboardOverview';
import {
  Music, RefreshCw, ListMusic, Mic, ClipboardList, Sparkles, Download,
  Settings, Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2,
  Calendar, Radio, ArrowRight, Building2, Disc3, Headphones
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
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
  const navigate = useNavigate();
  const { config, playlist, topics, research, rundown, assets, loading, refresh } = useMusicProduction();
  const [refreshing, setRefreshing] = useState(false);
  const [detailDept, setDetailDept] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [regeneratingRejected, setRegeneratingRejected] = useState(false);

  const {
    pipeline, loading: pipelineLoading, actionLoading: deptActionLoading,
    initPipeline, setDepartmentStatus, refresh: refreshPipeline,
  } = useProductionDepartments('music', config?.id);

  // Auto-init pipeline when config loads
  useEffect(() => {
    if (config?.id && !pipeline && !pipelineLoading) {
      initPipeline(config.production_name || 'Radio Production');
    }
  }, [config?.id, pipeline, pipelineLoading, initPipeline]);

  // Realtime config updates are handled by the Break Room's subscription;
  // no polling needed here.

  const handleRefresh = async () => {
    if (!config?.id) return;
    if (config.status === 'building' || refreshing) return;
    setRefreshing(true);
    try {
      await base44.entities.MusicProductionConfiguration.update(config.id, { status: 'building' });
      base44.functions.invoke('buildMusicProduction', { configuration_id: config.id })
        .catch(err => console.error('Build HTTP error (pipeline may still be running):', err.message));
    } catch (err) {
      console.error(err);
      setRefreshing(false);
    }
  };

  const handleRegenerateSection = async (section) => {
    if (!config?.id) return;
    setRefreshing(true);
    try {
      await base44.functions.invoke('regenerateMusicSection', {
        configuration_id: config.id,
        section
      });
      await refresh();
    } catch (err) {
      console.error('Section regeneration failed:', err.message);
      // Still refresh to show current state
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleReviewTrack = async (track, status) => {
    if (!track?.id || reviewingId) return;
    setReviewingId(track.id);
    try {
      await base44.entities.PlaylistItem.update(track.id, { status });
      await refresh();
    } catch (err) {
      console.error('Track review update failed:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const handleReviewSegment = async (segment, status) => {
    if (!segment?.id || reviewingId || segment.segment_type === 'song') return;
    setReviewingId(segment.id);
    try {
      await base44.entities.ShowRundownItem.update(segment.id, { status });
      await refresh();
    } catch (err) {
      console.error('Segment review update failed:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const handleRegenerateRejected = async (kind = 'all') => {
    if (!config?.id || regeneratingRejected) return;
    setRegeneratingRejected(true);
    try {
      await base44.functions.invoke('regenerateRejectedMusic', {
        configuration_id: config.id,
        kind,
      });
      await refresh();
    } catch (err) {
      console.error('Rejected Radio material regeneration failed:', err);
    } finally {
      setRegeneratingRejected(false);
    }
  };

  if (loading) {
    return (
      <div className="relative flex items-center justify-center h-screen overflow-hidden bg-black">
        <CyberpunkMusicBg variant="eq" />
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
        <CyberpunkMusicBg variant="eq" />
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
          <h2 className="text-2xl font-bold mb-3 text-white cp-glitch">No Radio Production Found</h2>
          <p className="text-gray-400 mb-6">Configure your radio production to get started. Producer will build everything automatically.</p>
          <Button asChild size="lg" className="cp-btn-gradient border-0 text-white hover:opacity-90">
            <Link to="/music/configure">Configure Production</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  if (config.status === 'building' || refreshing) {
    return (
      <DiscoveryBreakRoom
        mode="production"
        buildError=""
        configId={config.id}
        onComplete={() => { setRefreshing(false); refresh(); }}
      />
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
    { label: 'Radio Studio', icon: Radio, path: `/music/live?config_id=${config.id}`, accent: 'pink' },
    { label: 'Playlist', icon: ListMusic, path: '/music/playlist', accent: 'pink' },
    { label: 'Topics', icon: Mic, path: '/music/topics', accent: 'cyan' },
    { label: 'Rundown', icon: ClipboardList, path: '/music/rundown', accent: 'pink' },
    { label: 'AI Assets', icon: Sparkles, path: '/music/assets', accent: 'cyan' },
    { label: 'Export', icon: Download, path: '/music/export', accent: 'pink' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="eq" />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        <MusicDiscoveryNav />

        <RadioDashboardOverview
          config={config}
          playlist={playlist}
          rundown={rundown}
          topics={topics}
          assets={assets}
          pipeline={pipeline}
          readinessPercent={readinessPercent}
          reviewingId={reviewingId}
          regeneratingRejected={regeneratingRejected}
          onReviewTrack={handleReviewTrack}
          onReviewSegment={handleReviewSegment}
          onRegenerateRejected={handleRegenerateRejected}
        />

        {/* Show controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <RegenerateDropdown onRegenerate={handleRegenerateSection} disabled={refreshing} />
          <Button size="sm" variant="outline" onClick={handleRefresh}
            className="border-[#00FFFF]/40 hover:border-[#00FFFF]/70 hover:bg-[#00FFFF]/10 text-white">
            <RefreshCw className="w-4 h-4 mr-1.5" style={{ color: '#00FFFF' }} /> Full Rebuild
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

        {/* Production status / departments */}
        <DepartmentWorkflowBar
          profileKey="music"
          pipeline={pipeline}
          loading={pipelineLoading}
          actionLoading={deptActionLoading}
          onAdvance={(dept) => setDetailDept(dept)}
        />

        {/* Secondary production material */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <WidgetCard icon={Clock} title="Runtime Breakdown" accent="cyan" delay={0.1}>
            <div className="space-y-4">
              <RuntimeBar config={config} />
              <div className="space-y-1.5 text-sm pt-2 border-t border-white/5">
                <RuntimeRow label="Total Show" minutes={config.total_show_runtime} />
                <RuntimeRow label="Music" minutes={config.required_music_runtime} highlight />
                <RuntimeRow label="Talk / Segments" minutes={config.talk_segment_runtime} />
                <RuntimeRow label="Commercial / Sponsor" minutes={config.commercial_sponsor_runtime} />
                <RuntimeRow label="Intro" minutes={config.intro_runtime} />
                <RuntimeRow label="Outro" minutes={config.outro_runtime} />
              </div>
            </div>
          </WidgetCard>

          <WidgetCard icon={Mic} title="Selected Topics" accent="cyan" delay={0.15}>
            {topics.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {topics.map((topic, i) => (
                  <div key={topic.id || i} className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
                    <p className="text-sm font-medium text-white">{topic.topic_name}</p>
                    {topic.sources && <p className="text-[10px] text-cyan-300/70 mt-1">Source: {topic.sources}</p>}
                    {topic.generated_summary && <p className="text-xs text-white/40 mt-1 line-clamp-2">{topic.generated_summary}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No music topics were selected." />
            )}
          </WidgetCard>

          <WidgetCard icon={TrendingUp} title="Research Used" accent="pink" delay={0.2}>
            {research.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {research.map((item, i) => (
                  <div key={item.id || i} className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
                    <p className="text-sm font-medium text-white line-clamp-1">{item.title}</p>
                    <p className="text-[10px] text-white/35 mt-1">{item.source || 'Research source'} · {item.relevance || 'medium'}</p>
                    {item.summary && <p className="text-xs text-white/40 mt-1 line-clamp-2">{item.summary}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No research was used for this production." />
            )}
          </WidgetCard>

          <WidgetCard icon={Sparkles} title="Generated Production Assets" accent="cyan" delay={0.25}>
            {assets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {assets.map((asset, i) => (
                  <div key={asset.id || i}
                    className="text-xs py-2 px-2.5 rounded-lg"
                    style={{ background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.12)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: '#00FFFF' }} />
                      <span className="truncate text-white">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
                    </div>
                    {asset.associated_song_title && <p className="text-[9px] text-white/35 mt-1 truncate">{asset.associated_song_title}</p>}
                    {asset.associated_topic && <p className="text-[9px] text-white/35 mt-1 truncate">{asset.associated_topic}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No production assets have been generated yet." />
            )}
          </WidgetCard>
        </div>

        <MusicShowArchive currentConfigId={config.id} />

        {/* Production Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative overflow-hidden cp-glass"
          style={{ borderColor: 'rgba(0,255,255,0.15)' }}
        >
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #00FFFF, #FF00FF)' }} />
          <div className="p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#00FFFF' }} />
              Production Checklist
              <span className="ml-auto text-sm text-gray-400">{checklistDone}/{checklist.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {checklist.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-sm py-2 px-3 rounded-lg"
                  style={item.done
                    ? { background: 'rgba(0,255,255,0.05)' }
                    : { background: 'rgba(255,255,255,0.02)' }
                  }
                >
                  {item.done
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#00FFFF' }} />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-600 shrink-0" />
                  }
                  <span className={item.done ? 'text-white' : 'text-gray-500'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

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