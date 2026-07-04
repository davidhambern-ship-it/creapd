import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { Button } from '@/components/ui/button';
import { formatRuntime, formatMinutes, ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/talkConstants';
import {
  Mic2, RefreshCw, Lightbulb, Users, ClipboardList, Sparkles, Download,
  Settings, Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2,
  Calendar, Radio, ArrowRight, Building2, Search
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function TalkDashboard() {
  const { config, topics, research, guests, segments, assets, loading, refresh } = useTalkProduction();
  const [refreshing, setRefreshing] = useState(false);

  // Poll if building
  useEffect(() => {
    if (config?.status === 'building') {
      const interval = setInterval(async () => {
        if (config?.id) {
          const updated = await base44.entities.TalkProductionConfiguration.get(config.id);
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
      await base44.entities.TalkProductionConfiguration.update(config.id, { status: 'building' });
      await base44.functions.invoke('buildTalkProduction', { configuration_id: config.id });
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
            <Mic2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">No Talk Production Found</h2>
          <p className="text-muted-foreground mb-6">Configure your talk production to get started. Producer will build everything automatically.</p>
          <Button asChild size="lg">
            <Link to="/talk/configure">Configure Production</Link>
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
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Talk Production</h2>
          <p className="text-muted-foreground mb-8">Generating research, topics, talking points, rundown, and AI assets...</p>
          <div className="space-y-3 text-left">
            {['Researching topics', 'Generating talking points', 'Building show rundown', 'Generating AI assets'].map((label, i) => (
              <div key={i} className="!flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">{label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const aiAutomation = safeParse(config.ai_automation, []);
  const topicsList = safeParse(config.topics, []);

  const checklist = [
    { label: 'Configuration Saved', done: !!config.production_name },
    { label: 'Research Generated', done: research.length > 0 },
    { label: 'Topics Generated', done: topics.length > 0 },
    { label: 'Talking Points Generated', done: assets.some(a => a.asset_type === 'talking_points') },
    { label: 'Discussion Questions Generated', done: assets.some(a => a.asset_type === 'discussion_questions') },
    { label: 'Host Intros Generated', done: assets.some(a => a.asset_type === 'host_intro') },
    { label: 'Show Rundown Generated', done: segments.length > 0 },
    { label: 'Social Captions Generated', done: assets.some(a => a.asset_type === 'social_caption') },
    { label: 'Thumbnail Prompt Generated', done: assets.some(a => a.asset_type === 'thumbnail_prompt') },
    { label: 'Production Notes Generated', done: assets.some(a => a.asset_type === 'production_notes') },
  ];

  const checklistDone = checklist.filter(c => c.done).length;
  const readinessPercent = Math.round((checklistDone / checklist.length) * 100);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="!flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="!flex items-center gap-2 mb-1">
            <Mic2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-heading font-bold">{config.production_name}</h1>
          </div>
          <div className="!flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="!flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {config.show_date}</span>
            <span className="!flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {config.show_start_time}</span>
            <span className="!flex items-center gap-1"><Radio className="w-3.5 h-3.5" /> {config.station_name || 'No station'}</span>
            <span className="!flex items-center gap-1"><Mic2 className="w-3.5 h-3.5" /> {config.show_format}</span>
          </div>
        </div>
        <div className="!flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/talk/configure?config_id=${config.id}`}>
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
          <p className="text-xs text-muted-foreground mb-1">Talk Runtime</p>
          <p className="text-lg font-heading font-bold text-primary">{formatMinutes(config.talk_segment_runtime)}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Format</p>
          <p className="text-sm font-medium">{config.show_format}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Tone</p>
          <p className="text-sm font-medium">{config.show_tone}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Guests</p>
          <p className="text-sm font-medium">{guests.length} listed</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Readiness</p>
          <p className="text-lg font-heading font-bold text-emerald-400">{readinessPercent}%</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="!flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleRefresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh Production</Button>
        <Button size="sm" variant="outline" asChild><Link to="/talk/research"><Search className="w-4 h-4 mr-1" /> Research</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/talk/topics"><Lightbulb className="w-4 h-4 mr-1" /> Topics</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/talk/guests"><Users className="w-4 h-4 mr-1" /> Guests</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/talk/rundown"><ClipboardList className="w-4 h-4 mr-1" /> Show Rundown</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/talk/assets"><Sparkles className="w-4 h-4 mr-1" /> AI Assets</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/talk/export"><Download className="w-4 h-4 mr-1" /> Export</Link></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topics Widget */}
        <div className="glass-panel p-5">
          <div className="!flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold !flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> Discussion Topics</h3>
            <Link to="/talk/topics" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {topics.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {topics.slice(0, 6).map(topic => (
                <div key={topic.id} className="!flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{topic.topic_name}</p>
                    {topic.suggested_placement && <p className="text-xs text-muted-foreground truncate">{topic.suggested_placement}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${topic.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {topic.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No topics generated yet." actionLabel="Generate" onAction={handleRefresh} />
          )}
        </div>

        {/* Research Widget */}
        <div className="glass-panel p-5">
          <div className="!flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold !flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Research Updates</h3>
            <Link to="/talk/research" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {research.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {research.slice(0, 6).map(item => (
                <div key={item.id} className="text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <p className="font-medium truncate">{item.title}</p>
                  <div className="!flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    <span className={`px-1.5 py-0.5 rounded ${item.relevance === 'high' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted'}`}>{item.relevance}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No research has been generated yet." onAction={handleRefresh} actionLabel="Refresh" />
          )}
        </div>

        {/* Show Rundown Preview */}
        <div className="glass-panel p-5">
          <div className="!flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold !flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Show Rundown Preview</h3>
            <Link to="/talk/rundown" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {segments.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {segments.slice(0, 8).map((item) => (
                <div key={item.id} className="!flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <span className="text-xs text-muted-foreground w-12">{item.start_time || ''}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${SEGMENT_TYPE_LABELS[item.segment_type] ? 'bg-primary/15 text-primary' : 'bg-muted'}`}>
                    {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
              <Button size="sm" variant="ghost" asChild className="w-full mt-2">
                <Link to="/talk/rundown">Open Rundown <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          ) : (
            <EmptyState message="No show rundown has been generated yet." onAction={handleRefresh} actionLabel="Generate" />
          )}
        </div>

        {/* AI Assets Widget */}
        <div className="glass-panel p-5">
          <div className="!flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold !flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Generated Assets</h3>
            <Link to="/talk/assets" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {assets.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {assets.slice(0, 8).map(asset => (
                <div key={asset.id} className="text-xs py-1.5 px-2 rounded bg-white/5 !flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="truncate">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
                </div>
              ))}
              <Button size="sm" variant="ghost" asChild className="col-span-2 mt-1">
                <Link to="/talk/assets">View All Assets <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          ) : (
            <EmptyState message="No AI assets have been generated yet." onAction={handleRefresh} actionLabel="Generate" />
          )}
        </div>
      </div>

      {/* Production Checklist */}
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-4">Production Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {checklist.map((item, i) => (
            <div key={i} className="!flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="w-!4 h-4 text-emerald-400 shrink-0" />
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