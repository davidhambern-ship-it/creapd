import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import TalkProducerGuide from '@/components/talk/TalkProducerGuide';
import TalkConfigure from '@/pages/TalkConfigure';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { formatMinutes, ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/talkConstants';
import {
  Mic2, RefreshCw, Lightbulb, Users, ClipboardList, Sparkles, Download,
  Settings, Clock, AlertCircle, CheckCircle2, Loader2,
  Calendar, Radio, ArrowRight, Building2, Search
} from 'lucide-react';

function buildFailureMessage(config) {
  if (config?.status !== 'failed') return '';
  const metadata = config?.build_metadata && typeof config.build_metadata === 'object'
    ? config.build_metadata
    : {};
  return metadata.message || 'The last Talk production build did not complete. You can retry it safely.';
}

function StudioPanel({ className = '', icon: Icon, title, children, actionLabel = 'Open', onOpen }) {
  const classes = [
    'overflow-hidden rounded-xl border border-white/10 bg-black/38 backdrop-blur-sm shadow-xl',
    'transition hover:bg-black/50 hover:border-white/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70',
    className,
  ].join(' ');

  return (
    <section
      className={classes}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/15 px-2.5 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-orange-300 shrink-0" />}
          <h3 className="font-heading font-semibold text-sm text-white truncate">{title}</h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-white/55">
          {actionLabel}
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
      <div className="px-2.5 py-2">{children}</div>
    </section>
  );
}

function ModalEmpty({ children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/45">
      {children}
    </div>
  );
}

export default function TalkDashboard() {
  const ownedPreview = shouldUseNeonAuth();
  const { config, topics, research, guests, segments, assets, loading, refresh } = useTalkProduction();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [activePanel, setActivePanel] = useState(null);

  useEffect(() => {
    if (config?.status !== 'building' || !config?.id) return undefined;

    let active = true;
    const check = async () => {
      try {
        if (ownedPreview) {
          const data = await creapdApi.get('/talk/production?configuration_id=' + encodeURIComponent(config.id));
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return <TalkConfigure embedded onBuilt={refresh} />;
  }

  if (config.status === 'building' || refreshing) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="talk-build-card max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Building2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Talk Production</h2>
          <p className="text-white/55 mb-8">CREAPD is researching, verifying, and assembling the production.</p>
          <div className="space-y-3 text-left">
            {['Researching live sources', 'Verifying claims & counter-perspectives', 'Building show rundown', 'Generating production assets'].map((label, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
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
  const approvedTopics = topics.filter((topic) => topic.status === 'approved').length;
  const confirmedGuests = guests.filter((guest) => guest.status === 'confirmed').length;
  const approvedAssets = assets.filter((asset) => asset.status === 'approved').length;
  const livePath = '/talk/live?config_id=' + encodeURIComponent(config.id);

  const checklist = [
    !!config.production_name,
    research.length > 0,
    topics.length > 0,
    assets.some((asset) => asset.asset_type === 'talking_points'),
    assets.some((asset) => asset.asset_type === 'discussion_questions'),
    assets.some((asset) => asset.asset_type === 'host_intro'),
    segments.length > 0,
    assets.some((asset) => asset.asset_type === 'social_caption'),
    assets.some((asset) => asset.asset_type === 'thumbnail_prompt'),
    assets.some((asset) => asset.asset_type === 'production_notes'),
  ];
  const readinessPercent = Math.round((checklist.filter(Boolean).length / checklist.length) * 100);

  const modalTitles = {
    research: 'Research',
    topics: 'Discussion Topics',
    guests: 'Guests',
    rundown: 'Show Rundown',
    assets: 'AI Assets',
    export: 'Finish & Launch',
  };

  const fullWorkspacePaths = {
    research: '/talk/research',
    topics: '/talk/topics',
    guests: '/talk/guests',
    rundown: '/talk/rundown',
    assets: '/talk/assets',
    export: '/talk/export',
  };

  const renderModalBody = () => {
    if (activePanel === 'research') {
      if (!research.length) return <ModalEmpty>No research has been generated yet.</ModalEmpty>;
      return (
        <div className="space-y-3">
          {research.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-white">{item.title}</h3>
                {item.relevance && <span className="shrink-0 text-xs text-orange-300">{item.relevance}</span>}
              </div>
              {item.source && <p className="mt-1 text-xs text-white/40">{item.source}</p>}
              {(item.summary || item.content || item.description) && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">
                  {item.summary || item.content || item.description}
                </p>
              )}
            </article>
          ))}
        </div>
      );
    }

    if (activePanel === 'topics') {
      if (!topics.length) return <ModalEmpty>No discussion topics have been generated yet.</ModalEmpty>;
      return (
        <div className="space-y-3">
          {topics.map((topic) => (
            <article key={topic.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-white">{topic.topic_name}</h3>
                <span className={topic.status === 'approved' ? 'text-xs text-emerald-300' : 'text-xs text-white/40'}>
                  {topic.status}
                </span>
              </div>
              {topic.suggested_placement && <p className="mt-1 text-xs text-orange-300/70">{topic.suggested_placement}</p>}
              {(topic.summary || topic.description || topic.talking_points) && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">
                  {topic.summary || topic.description || topic.talking_points}
                </p>
              )}
            </article>
          ))}
        </div>
      );
    }

    if (activePanel === 'guests') {
      if (!guests.length) return <ModalEmpty>No guests have been added yet.</ModalEmpty>;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {guests.map((guest) => (
            <article key={guest.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{guest.guest_name}</h3>
                  {guest.title_role && <p className="text-xs text-white/45">{guest.title_role}</p>}
                </div>
                <span className={guest.status === 'confirmed' ? 'text-xs text-emerald-300' : 'text-xs text-white/40'}>
                  {guest.status}
                </span>
              </div>
              {guest.bio && <p className="mt-3 text-sm leading-6 text-white/65">{guest.bio}</p>}
              {guest.talking_points && (
                <div className="mt-3 rounded-lg bg-black/20 p-3 text-sm whitespace-pre-wrap text-white/65">
                  {guest.talking_points}
                </div>
              )}
            </article>
          ))}
        </div>
      );
    }

    if (activePanel === 'rundown') {
      if (!segments.length) return <ModalEmpty>No rundown has been generated yet.</ModalEmpty>;
      return (
        <div className="space-y-2">
          {segments.map((segment) => (
            <article key={segment.id} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <span className="w-14 shrink-0 text-xs text-orange-300">{segment.start_time || ''}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">{segment.title}</h3>
                  <span className="text-[10px] uppercase tracking-wide text-white/35">
                    {SEGMENT_TYPE_LABELS[segment.segment_type] || segment.segment_type}
                  </span>
                </div>
                {(segment.notes || segment.description || segment.script) && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
                    {segment.notes || segment.description || segment.script}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (activePanel === 'assets') {
      if (!assets.length) return <ModalEmpty>No AI assets have been generated yet.</ModalEmpty>;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {assets.map((asset) => (
            <article key={asset.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-white">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</h3>
                <span className={asset.status === 'approved' ? 'text-xs text-emerald-300' : 'text-xs text-white/40'}>
                  {asset.status}
                </span>
              </div>
              {(asset.content || asset.text || asset.prompt || asset.notes) && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">
                  {asset.content || asset.text || asset.prompt || asset.notes}
                </p>
              )}
            </article>
          ))}
        </div>
      );
    }

    if (activePanel === 'export') {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Topics Approved</p>
              <p className="mt-1 text-2xl font-bold text-white">{approvedTopics}/{topics.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Guests Confirmed</p>
              <p className="mt-1 text-2xl font-bold text-white">{confirmedGuests}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Assets Approved</p>
              <p className="mt-1 text-2xl font-bold text-white">{approvedAssets}/{assets.length}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm leading-6 text-white/65">
              Finish the production package, export the show materials, or enter CREAPD Live when the rundown is ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/talk/export">Open Export Center</Link>
            </Button>
            {config.status === 'ready' && segments.length > 0 && (
              <Button asChild variant="outline">
                <Link to={livePath}><Radio className="mr-2 h-4 w-4" /> Enter Studio</Link>
              </Button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="relative h-full min-h-0 overflow-hidden p-3">
        <div className="absolute z-20 top-2 left-1/2 w-[34%] -translate-x-1/2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md shadow-xl">
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
              <Link to={'/talk/configure?config_id=' + config.id}><Settings className="w-3.5 h-3.5" /></Link>
            </Button>
          </div>
        </div>

        {buildFailure && (
          <div className="absolute z-30 top-[58px] left-1/2 w-[34%] -translate-x-1/2 flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-950/55 px-2.5 py-2 text-[10px] text-red-100 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {buildFailure.includes('Free tier users do not have access to this model')
                ? 'AI build unavailable on the current free model tier. Dashboard access is unaffected.'
                : buildFailure}
            </span>
          </div>
        )}

        <div className="absolute top-[5%] left-[1.1%] w-[23%]">
          <TalkProducerGuide
            variant="screen"
            currentStep="research"
            title="Review the show."
            instructions={[
              'Research first.',
              'Approve topics and confirm guests.',
              'Check Rundown and AI Assets, then Export.',
            ]}
            readyText={research.length + ' research · ' + approvedTopics + '/' + topics.length + ' topics · ' + confirmedGuests + ' guests · ' + approvedAssets + '/' + assets.length + ' assets'}
            nextLabel="Open Research"
            onNext={() => setActivePanel('research')}
          />
        </div>

        <StudioPanel className="absolute top-[56%] right-[18%] w-[18%]" icon={Lightbulb} title="Discussion Topics" actionLabel="Open" onOpen={() => setActivePanel('topics')}>
          {topics.length > 0 ? (
            <div className="space-y-1.5">
              {topics.slice(0, 4).map((topic) => (
                <div key={topic.id} className="flex min-h-5 items-center gap-2 text-[10px] text-white/75">
                  <span className="truncate">{topic.topic_name}</span>
                  <span className={topic.status === 'approved' ? 'text-emerald-300' : 'text-white/35'}>{topic.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/45">No topics generated yet.</p>
          )}
        </StudioPanel>

        <StudioPanel className="absolute top-[56%] left-[19%] w-[18%]" icon={Users} title="Guest Chair" actionLabel="Open" onOpen={() => setActivePanel('guests')}>
          {guests.length > 0 ? (
            <div className="space-y-1.5">
              {guests.slice(0, 3).map((guest) => (
                <div key={guest.id} className="flex min-h-5 items-center gap-2 text-[10px] text-white/75">
                  <span className="truncate">{guest.guest_name}</span>
                  <span className={guest.status === 'confirmed' ? 'text-emerald-300' : 'text-white/35'}>{guest.status}</span>
                </div>
              ))}
              <p className="pt-1 text-[10px] text-white/35">{confirmedGuests} confirmed · {guests.length} total</p>
            </div>
          ) : (
            <p className="text-xs text-white/45">No guests added yet.</p>
          )}
        </StudioPanel>

        <section className="absolute top-[53%] left-[38.5%] w-[28%] grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-black/32 p-2 backdrop-blur-sm shadow-lg">
          {[
            ['Total Runtime', formatMinutes(config.total_show_runtime)],
            ['Talk Runtime', formatMinutes(config.talk_segment_runtime)],
            ['Format', config.show_format],
            ['Tone', config.show_tone],
            ['Guests', guests.length],
            ['Generated', readinessPercent + '%'],
          ].map(([label, value]) => (
            <div key={label} className="min-h-12 rounded-lg border border-white/10 bg-black/15 p-1.5">
              <span className="block text-[9px] text-white/40">{label}</span>
              <strong className={label === 'Generated' ? 'mt-1 block text-[11px] text-emerald-300' : 'mt-1 block text-[11px] text-white/90'}>
                {value}
              </strong>
            </div>
          ))}
        </section>

        <StudioPanel className="absolute bottom-[3%] left-[1.5%] w-[22%]" icon={ClipboardList} title="Show Rundown" actionLabel="Open" onOpen={() => setActivePanel('rundown')}>
          {segments.length > 0 ? (
            <div className="space-y-1">
              {segments.slice(0, 4).map((item) => (
                <div key={item.id} className="flex min-h-5 items-center gap-2 text-[10px] text-white/75">
                  <span className="w-10 shrink-0 text-white/35">{item.start_time || ''}</span>
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/45">No rundown generated yet.</p>
          )}
        </StudioPanel>

        <StudioPanel className="absolute bottom-[3%] right-[1.5%] w-[22%]" icon={Sparkles} title="AI Assets" actionLabel="Open" onOpen={() => setActivePanel('assets')}>
          {assets.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {assets.slice(0, 6).map((asset) => (
                <div key={asset.id} className="flex min-w-0 items-center gap-1 rounded-lg bg-white/[0.04] p-1.5 text-[9px] text-white/70">
                  <CheckCircle2 className={asset.status === 'approved' ? 'w-3 h-3 text-emerald-300' : 'w-3 h-3 text-white/30'} />
                  <span className="truncate">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/45">No AI assets generated yet.</p>
          )}
        </StudioPanel>

        <section
          className="absolute bottom-[2.5%] left-1/2 w-[18%] -translate-x-1/2 flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm shadow-lg transition hover:bg-black/50"
          role="button"
          tabIndex={0}
          onClick={() => setActivePanel('export')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActivePanel('export');
            }
          }}
        >
          <Download className="w-5 h-5 text-orange-300" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Final Desk</p>
            <h3 className="text-sm font-semibold text-white">Finish & Launch</h3>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-white/45" />
        </section>
      </div>

      <Dialog open={!!activePanel} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-h-[86vh] max-w-4xl overflow-hidden border-white/10 bg-[#0d0911]/95 p-0 text-white backdrop-blur-2xl">
          <DialogHeader className="border-b border-white/10 px-5 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {activePanel === 'research' && <Search className="h-5 w-5 text-orange-300" />}
              {activePanel === 'topics' && <Lightbulb className="h-5 w-5 text-orange-300" />}
              {activePanel === 'guests' && <Users className="h-5 w-5 text-orange-300" />}
              {activePanel === 'rundown' && <ClipboardList className="h-5 w-5 text-orange-300" />}
              {activePanel === 'assets' && <Sparkles className="h-5 w-5 text-orange-300" />}
              {activePanel === 'export' && <Download className="h-5 w-5 text-orange-300" />}
              {modalTitles[activePanel] || 'Talk Studio'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Talk Production Profile workspace popup. Content inside this popup can scroll without moving the studio dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[64vh] overflow-y-auto px-5 py-4">
            {renderModalBody()}
          </div>

          {activePanel && activePanel !== 'export' && fullWorkspacePaths[activePanel] && (
            <div className="flex items-center justify-end border-t border-white/10 px-5 py-3">
              <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Link to={fullWorkspacePaths[activePanel]}>
                  Open Full Workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
