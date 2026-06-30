import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Button } from '@/components/ui/button';
import { formatRuntime, formatMinutes, ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';
import {
  Music, RefreshCw, ListMusic, Mic, ClipboardList, Sparkles, Download,
  Settings, Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2,
  Calendar, Radio, ArrowRight, Building2
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function MusicDashboard() {
  const { config, playlist, topics, research, rundown, assets, loading, refresh } = useMusicProduction();
  const [refreshing, setRefreshing] = useState(false);

  // Poll if building
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">No Music Production Found</h2>
          <p className="text-muted-foreground mb-6">Configure your music production to get started. Producer will build everything automatically.</p>
          <Button asChild size="lg">
            <Link to="/music/configure">Configure Production</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (config.status === 'building' || refreshing) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Building2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Music Production</h2>
          <p className="text-muted-foreground mb-8">Generating playlist, research, topics, rundown, and AI assets...</p>
          <div className="space-y-3 text-left">
            {['Generating playlist plan', 'Researching music topics', 'Building show rundown', 'Generating AI assets'].map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">{label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const genres = safeParse(config.genres, []);
  const moods = safeParse(config.moods, []);
  const aiAutomation = safeParse(config.ai_automation, []);
  const musicTopics = safeParse(config.music_topics, []);

  const playlistRuntime = playlist.reduce((sum, s) => sum + (s.length_seconds || 0), 0);
  const requiredMusicSeconds = (config.required_music_runtime || 0) * 60;
  const remainingSeconds = requiredMusicSeconds - playlistRuntime;
  const overageSeconds = playlistRuntime - requiredMusicSeconds;

  const playlistStatus = playlist.length === 0 ? 'Not Generated' :
    remainingSeconds > 60 ? 'Runtime Short' :
    overageSeconds > 60 ? 'Runtime Over' :
    'Runtime Matched';

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

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-heading font-bold">{config.production_name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {config.show_date}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {config.show_start_time}</span>
            <span className="flex items-center gap-1"><Radio className="w-3.5 h-3.5" /> {config.station_name || 'No station'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/music/configure?config_id=${config.id}`}>
              <Settings className="w-4 h-4 mr-1" />
              Edit Config
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Runtime</p>
          <p className="text-lg font-heading font-bold">{formatMinutes(config.total_show_runtime)}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Music Runtime</p>
          <p className="text-lg font-heading font-bold text-primary">{formatMinutes(config.required_music_runtime)}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Genres</p>
          <p className="text-sm font-medium">{genres.length} selected</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Mood</p>
          <p className="text-sm font-medium">{moods.length} selected</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Tone</p>
          <p className="text-sm font-medium">{config.show_tone}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Readiness</p>
          <p className="text-lg font-heading font-bold text-emerald-400">{readinessPercent}%</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleRefresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh Production</Button>
        <Button size="sm" variant="outline" asChild><Link to="/music/playlist"><ListMusic className="w-4 h-4 mr-1" /> Playlist Builder</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/music/topics"><Mic className="w-4 h-4 mr-1" /> Music Topics</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/music/rundown"><ClipboardList className="w-4 h-4 mr-1" /> Show Rundown</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/music/assets"><Sparkles className="w-4 h-4 mr-1" /> AI Assets</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/music/export"><Download className="w-4 h-4 mr-1" /> Export</Link></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Playlist Plan Widget */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold flex items-center gap-2"><ListMusic className="w-4 h-4 text-primary" /> Playlist Plan</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${playlistStatus === 'Runtime Matched' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'}`}>
              {playlistStatus}
            </span>
          </div>
          {playlist.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div><span className="text-muted-foreground">Songs:</span> {playlist.length}</div>
                <div><span className="text-muted-foreground">Runtime:</span> {formatRuntime(playlistRuntime)}</div>
                <div><span className="text-muted-foreground">Required:</span> {formatRuntime(requiredMusicSeconds)}</div>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {playlist.slice(0, 5).map((song, i) => (
                  <div key={song.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-white/5">
                    <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                    <span className="font-medium truncate flex-1">{song.song_title}</span>
                    <span className="text-muted-foreground text-xs truncate">{song.artist}</span>
                    <span className="text-muted-foreground text-xs">{formatRuntime(song.length_seconds)}</span>
                  </div>
                ))}
                {playlist.length > 5 && <p className="text-xs text-muted-foreground text-center pt-1">+ {playlist.length - 5} more songs</p>}
              </div>
              <Button size="sm" variant="ghost" asChild className="w-full mt-2">
                <Link to="/music/playlist">Open Playlist Builder <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          ) : (
            <EmptyState message="No playlist has been generated yet." actionLabel="Generate playlist" onAction={handleRefresh} />
          )}
        </div>

        {/* Runtime Status Widget */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-primary" /> Runtime Status</h3>
          <div className="space-y-2 text-sm">
            <RuntimeRow label="Total Show" minutes={config.total_show_runtime} />
            <RuntimeRow label="Music" minutes={config.required_music_runtime} highlight />
            <RuntimeRow label="Talk / Segments" minutes={config.talk_segment_runtime} />
            <RuntimeRow label="Commercial / Sponsor" minutes={config.commercial_sponsor_runtime} />
            <RuntimeRow label="Intro" minutes={config.intro_runtime} />
            <RuntimeRow label="Outro" minutes={config.outro_runtime} />
            <div className="border-t border-border pt-2 mt-2">
              <RuntimeRow label="Unassigned" minutes={Math.max(0, (config.total_show_runtime || 0) - (config.required_music_runtime || 0) - (config.talk_segment_runtime || 0) - (config.commercial_sponsor_runtime || 0) - (config.intro_runtime || 0) - (config.outro_runtime || 0))} />
            </div>
          </div>
        </div>

        {/* Selected Topics Widget */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><Mic className="w-4 h-4 text-primary" /> Selected Topics</h3>
          {topics.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {topics.map(topic => (
                <div key={topic.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <span className="font-medium truncate">{topic.topic_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${topic.status === 'ready' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {topic.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No music topics were selected. Edit your configuration to add topics." />
          )}
        </div>

        {/* Research Updates Widget */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-primary" /> Research Updates</h3>
          {research.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {research.slice(0, 6).map(item => (
                <div key={item.id} className="text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <p className="font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    <span className={`px-1.5 py-0.5 rounded ${item.relevance === 'high' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted'}`}>{item.relevance}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No research has been generated yet. Refresh today's music research." onAction={handleRefresh} actionLabel="Refresh" />
          )}
        </div>

        {/* Show Rundown Preview */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><ClipboardList className="w-4 h-4 text-primary" /> Show Rundown Preview</h3>
          {rundown.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {rundown.slice(0, 8).map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <span className="text-xs text-muted-foreground w-12">{item.start_time || ''}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${SEGMENT_TYPE_LABELS[item.segment_type] ? 'bg-primary/15 text-primary' : 'bg-muted'}`}>
                    {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
              <Button size="sm" variant="ghost" asChild className="w-full mt-2">
                <Link to="/music/rundown">Open Rundown <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          ) : (
            <EmptyState message="No show rundown has been generated yet." onAction={handleRefresh} actionLabel="Generate" />
          )}
        </div>

        {/* AI Assets Widget */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-primary" /> AI Generated Assets</h3>
          {assets.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {assets.slice(0, 8).map(asset => (
                <div key={asset.id} className="text-xs py-1.5 px-2 rounded bg-white/5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="truncate">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
                </div>
              ))}
              <Button size="sm" variant="ghost" asChild className="col-span-2 mt-1">
                <Link to="/music/assets">View All Assets <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          ) : (
            <EmptyState message="No AI assets have been generated yet. Generate selected assets now." onAction={handleRefresh} actionLabel="Generate" />
          )}
        </div>
      </div>

      {/* Production Checklist */}
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-4">Production Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span className={item.done ? '' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RuntimeRow({ label, minutes, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? 'text-primary' : ''}`}>{formatMinutes(minutes)}</span>
    </div>
  );
}

function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="text-center py-6">
      <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}