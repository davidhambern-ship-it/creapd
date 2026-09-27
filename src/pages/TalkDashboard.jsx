import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import TalkProducerGuide from '@/components/talk/TalkProducerGuide';
import TalkConfigure from '@/pages/TalkConfigure';
import { Button } from '@/components/ui/button';
import { formatMinutes, ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/talkConstants';
import {
  Mic2, RefreshCw, Lightbulb, Users, ClipboardList, Sparkles, Download,
  Settings, Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2,
  Calendar, Radio, ArrowRight, Building2, Search
} from 'lucide-react';

function buildFailureMessage(config) {
  if (config?.status !== 'failed') return '';
  const metadata = config?.build_metadata && typeof config.build_metadata === 'object'
    ? config.build_metadata
    : {};
  return metadata.message || 'The last Talk production build did not complete. You can retry it safely.';
}

function StudioPanel({ className = '', icon: Icon, title, path, children, actionLabel = 'Open' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl shadow-2xl ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-transparent px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-orange-300 shrink-0" />}
          <h3 className="font-heading font-semibold text-sm text-white truncate">{title}</h3>
        </div>
        {path && (
          <Link to={path} className="inline-flex shrink-0 items-center gap-1 text-[10px] text-white/55 transition-colors hover:text-orange-300">
            {actionLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

export default function TalkDashboard() {
  const ownedPreview = shouldUseNeonAuth();
  const { config, topics, research, guests, segments, assets, loading, refresh } = useTalkProduction();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  useEffect(() => {
    if (config?.status !== 'building' || !config?.id) return undefined;

    let active = true;
    const check = async () => {
      try {
        if (ownedPreview) {
          const data = await creapdApi.get(`/talk/production?configuration_id=${encodeURIComponent(config.id)}`);
          const updated = data?.configuration;
          if (active && updated && ['ready', 'failed'].includes(updated.status)) {
            await refresh();
          }
          return;
        }

        const updated = await base44.entities.TalkProductionConfiguration.get(config.id);
        if (active && updated && ['ready', 'failed'].includes(updated.status)) {
          await refresh();
        }
      } catch (err) {
        console.error('Talk build status poll failed:', err);
      }
    };

    const interval = setInterval(check, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [config?.status, config?.id, ownedPreview, refresh]);

  const handleRefresh = async () => {
    if (!config?.id) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      if (ownedPreview) {
        await creapdApi.post('/talk/production', {
          action: 'refresh',
          configuration_id: config.id,
        });
      } else {
        await base44.entities.TalkProductionConfiguration.update(config.id, { status: 'building' });
        await base44.functions.invoke('buildTalkProduction', { configuration_id: config.id });
      }
      await refresh();
    } catch (err) {
      console.error(err);
      setRefreshError(
        err?.data?.diagnostic?.message ||
        err?.data?.error ||
        err?.message ||
        'Talk production refresh failed.'
      );
      await refresh().catch(() => {});
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
    return <TalkConfigure embedded onBuilt={refresh} />;
  }

  if (config.status === 'building' || refreshing) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="talk-build-card max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Building2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Talk Production</h2>
          <p className="text-white/55 mb-8">CREAPD is researching, verifying, and assembling the production.</p>
          <div className="space-y-3 text-left">
            {['Researching live sources', 'Verifying claims & counter-perspectives', 'Building show rundown', 'Generating production assets'].map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-white/55">{label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const buildFailure = refreshError || buildFailureMessage(config);
  const approvedTopics = topics.filter(topic => topic.status === 'approved').length;
  const confirmedGuests = guests.filter(guest => guest.status === 'confirmed').length;
  const approvedAssets = assets.filter(asset => asset.status === 'approved').length;
  const livePath = `/talk/live?config_id=${encodeURIComponent(config.id)}`;

  const checklist = [
    !!config.production_name,
    research.length > 0,
    topics.length > 0,
    assets.some(a => a.asset_type === 'talking_points'),
    assets.some(a => a.asset_type === 'discussion_questions'),
    assets.some(a => a.asset_type === 'host_intro'),
    segments.length > 0,
    assets.some(a => a.asset_type === 'social_caption'),
    assets.some(a => a.asset_type === 'thumbnail_prompt'),
    assets.some(a => a.asset_type === 'production_notes'),
  ];
  const readinessPercent = Math.round((checklist.filter(Boolean).length / checklist.length) * 100);

  return (
    <div className="relative min-h-[820px] p-4 max-xl:grid max-xl:min-h-0 max-xl:grid-cols-2 max-xl:gap-4 max-md:grid-cols-1">
      <div className="xl:absolute xl:z-20 xl:top-4 xl:left-1/2 xl:w-[44%] xl:-translate-x-1/2 max-xl:col-span-2 max-md:col-span-1 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/70 px-3 py-2.5 backdrop-blur-xl shadow-2xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-orange-300" />
            <h1 className="font-heading font-bold text-base text-white truncate">{config.production_name}</h1>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-white/45">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{config.show_date}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{config.show_start_time}</span>
            <span className="flex items-center gap-1"><Mic2 className="w-3 h-3" />{config.show_format}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config.status === 'ready' && segments.length > 0 && (
            <Button size="sm" asChild className="border border-white/10 bg-gradient-to-r from-orange-500 via-purple-500 to-pink-500 text-white hover:brightness-110">
              <Link to={livePath}><Radio className="w-3.5 h-3.5 mr-1" /> Enter Studio</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 w-9 border-white/15 bg-white/5 p-0 text-white hover:bg-white/10">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" asChild className="h-9 w-9 border-white/15 bg-white/5 p-0 text-white hover:bg-white/10">
            <Link to={`/talk/configure?config_id=${config.id}`}><Settings className="w-3.5 h-3.5" /></Link>
          </Button>
        </div>
      </div>

      {buildFailure && (
        <div className="xl:absolute xl:z-30 xl:top-[86px] xl:left-1/2 xl:w-[56%] xl:-translate-x-1/2 max-xl:col-span-2 max-md:col-span-1 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-950/80 px-3 py-2.5 text-xs text-red-200 backdrop-blur-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{buildFailure}</span>
        </div>
      )}

      <div className="xl:absolute xl:top-[8%] xl:left-[1.5%] xl:w-[29%] max-xl:col-span-2 max-md:col-span-1">
        <TalkProducerGuide
          variant="screen"
          currentStep="research"
          title="CREAPD built the production. Now review it in order."
          instructions={[
            'Start with Research so you know what CREAPD found and verified.',
            'Choose the Discussion Topics you actually want, then confirm your guests.',
            'Review the Rundown and AI Assets before Export and CREAPD Live.',
          ]}
          readyText={`${research.length} research · ${approvedTopics}/${topics.length} topics · ${confirmedGuests} guests · ${approvedAssets}/${assets.length} assets`}
          nextPath="/talk/research"
          nextLabel="Start Guided Review"
        />
      </div>

      <StudioPanel className="xl:absolute xl:top-[30%] xl:left-[24.5%] xl:w-[22%]" icon={Lightbulb} title="Discussion Topics" path="/talk/topics" actionLabel="Review">
        {topics.length > 0 ? (
          <div className="space-y-1.5">
            {topics.slice(0, 4).map(topic => (
              <div key={topic.id} className="flex min-h-6 items-center gap-2 text-[10px] text-white/75">
                <span className="truncate">{topic.topic_name}</span>
                <span className={topic.status === 'approved' ? 'text-emerald-300' : 'text-white/35'}>{topic.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/45">No topics generated yet.</p>
        )}
      </StudioPanel>

      <StudioPanel className="xl:absolute xl:top-[14%] xl:right-[2%] xl:w-[24%]" icon={TrendingUp} title="Research Feed" path="/talk/research" actionLabel="Open">
        {research.length > 0 ? (
          <div className="space-y-1.5">
            {research.slice(0, 4).map(item => (
              <div key={item.id} className="flex min-h-6 items-center gap-2 text-[10px] text-white/75">
                <span className="truncate">{item.title}</span>
                <span className="text-white/30">{item.relevance || ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/45">No research generated yet.</p>
        )}
      </StudioPanel>

      <StudioPanel className="xl:absolute xl:top-[52%] xl:left-[17%] xl:w-[21%]" icon={Users} title="Guest Chair" path="/talk/guests" actionLabel="Manage">
        {guests.length > 0 ? (
          <div className="space-y-1.5">
            {guests.slice(0, 3).map(guest => (
              <div key={guest.id} className="flex min-h-6 items-center gap-2 text-[10px] text-white/75">
                <span className="truncate">{guest.guest_name}</span>
                <span className={guest.status === 'confirmed' ? 'text-emerald-300' : 'text-white/35'}>{guest.status}</span>
              </div>
            ))}
            <p className="text-[10px] text-white/35 pt-1">{confirmedGuests} confirmed · {guests.length} total</p>
          </div>
        ) : (
          <p className="text-xs text-white/45">No guests added yet.</p>
        )}
      </StudioPanel>

      <section className="xl:absolute xl:top-[43%] xl:left-[39%] xl:w-[28%] max-xl:col-span-2 max-md:col-span-1 grid grid-cols-3 max-md:grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/55 p-2.5 backdrop-blur-xl shadow-2xl">
        <div className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <span className="block text-[9px] text-white/40">Total Runtime</span>
          <strong className="mt-1 block text-[11px] text-white/90">{formatMinutes(config.total_show_runtime)}</strong>
        </div>
        <div className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <span className="block text-[9px] text-white/40">Talk Runtime</span>
          <strong className="mt-1 block text-[11px] text-white/90">{formatMinutes(config.talk_segment_runtime)}</strong>
        </div>
        <div className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <span className="block text-[9px] text-white/40">Format</span>
          <strong className="mt-1 block text-[11px] text-white/90">{config.show_format}</strong>
        </div>
        <div className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <span className="block text-[9px] text-white/40">Tone</span>
          <strong className="mt-1 block text-[11px] text-white/90">{config.show_tone}</strong>
        </div>
        <div className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <span className="block text-[9px] text-white/40">Guests</span>
          <strong className="mt-1 block text-[11px] text-white/90">{guests.length}</strong>
        </div>
        <div className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <span className="block text-[9px] text-white/40">Generated</span>
          <strong className="text-emerald-300">{readinessPercent}%</strong>
        </div>
      </section>

      <StudioPanel className="xl:absolute xl:bottom-[5%] xl:left-[1.5%] xl:w-[29%]" icon={ClipboardList} title="Show Rundown" path="/talk/rundown" actionLabel="Review">
        {segments.length > 0 ? (
          <div className="space-y-1">
            {segments.slice(0, 5).map(item => (
              <div key={item.id} className="flex min-h-6 items-center gap-2 text-[10px] text-white/75">
                <span className="text-white/35 w-10 shrink-0">{item.start_time || ''}</span>
                <span className="truncate">{item.title}</span>
                <span className="text-white/30">{SEGMENT_TYPE_LABELS[item.segment_type] || ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/45">No rundown generated yet.</p>
        )}
      </StudioPanel>

      <StudioPanel className="xl:absolute xl:bottom-[5%] xl:right-[1.5%] xl:w-[29%]" icon={Sparkles} title="AI Assets" path="/talk/assets" actionLabel="Review">
        {assets.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {assets.slice(0, 6).map(asset => (
              <div key={asset.id} className="flex min-w-0 items-center gap-1 rounded-lg bg-white/[0.04] p-1.5 text-[9px] text-white/70">
                <CheckCircle2 className={`w-3 h-3 ${asset.status === 'approved' ? 'text-emerald-300' : 'text-white/30'}`} />
                <span className="truncate">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/45">No AI assets generated yet.</p>
        )}
      </StudioPanel>

      <section className="xl:absolute xl:bottom-[4.5%] xl:left-[39%] xl:w-[22%] max-xl:col-span-2 max-md:col-span-1 flex min-h-16 items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-pink-500/10 px-3 py-2.5 backdrop-blur-xl shadow-2xl">
        <Download className="w-5 h-5 text-orange-300" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Final Desk</p>
          <h3 className="text-sm font-semibold text-white">Finish & Launch</h3>
        </div>
        <Button size="sm" asChild className="ml-auto talk-dashboard-live-button">
          <Link to="/talk/export">Export <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
        </Button>
      </section>
    </div>
  );
}
