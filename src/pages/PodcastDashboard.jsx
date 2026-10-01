import React from 'react';
import { Link } from 'react-router-dom';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import TalkProducerGuide from '@/components/talk/TalkProducerGuide';
import { Button } from '@/components/ui/button';
import { ASSET_TYPE_LABELS, formatMinutes } from '@/lib/talkConstants';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
  Loader2,
  Mic2,
  Radio,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

function ScenePanel({ className = '', icon: Icon, title, actionLabel = 'Open', to, children }) {
  const panel = (
    <section
      className={[
        'overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl',
        'transition hover:bg-black/50 hover:border-white/20',
        className,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/20 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-orange-300 shrink-0" />}
          <h3 className="font-heading font-semibold text-sm text-white truncate">{title}</h3>
        </div>
        {to && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-white/55">
            {actionLabel}
            <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );

  return to ? <Link to={to} className="block">{panel}</Link> : panel;
}

function nextMove({ config, research, topics, segments, assets, session }) {
  if (!config?.id) {
    return {
      step: 1,
      eyebrow: 'Podcast setup',
      title: 'Tell CREAPD what this podcast is.',
      description: 'Set the show identity, format, tone, runtime, topics, sources, guests, and automation preferences.',
      label: 'Set Up Podcast',
      path: '/podcast/setup',
    };
  }

  if (!research.length) {
    return {
      step: 2,
      eyebrow: 'Research',
      title: 'Gather the material this episode needs.',
      description: 'Use the podcast setup to guide source collection, background research, and current information.',
      label: 'Open Research',
      path: '/podcast/research',
    };
  }

  const approvedTopics = topics.filter(topic => topic.status === 'approved').length;
  if (!topics.length || approvedTopics === 0) {
    return {
      step: 3,
      eyebrow: 'Episode brief',
      title: 'Shape the research into the episode.',
      description: 'Review the strongest material, approve what belongs, and lock the direction before production.',
      label: topics.length ? 'Review Episode Material' : 'Build Episode Brief',
      path: topics.length ? '/podcast/review' : '/podcast/brief',
    };
  }

  if (!segments.length || !assets.length) {
    return {
      step: 4,
      eyebrow: 'Episode production',
      title: 'Turn approvals into a studio-ready episode.',
      description: 'Build the rundown, host scripts, guest questions, transitions, and production assets.',
      label: 'Open Episode Production',
      path: '/podcast/production',
    };
  }

  if (session?.status === 'complete') {
    return {
      step: 6,
      eyebrow: 'Post-production',
      title: 'The recording is finished. Package the episode.',
      description: 'Prepare show notes, export assets, and the material needed to publish and promote the episode.',
      label: 'Finish & Publish',
      path: '/podcast/export',
    };
  }

  return {
    step: 5,
    eyebrow: 'Studio ready',
    title: `${config.production_name || 'Your podcast'} is ready to produce.`,
    description: `${segments.length} rundown segments and ${assets.length} production assets are prepared.`,
    label: 'Open Podcast Studio',
    path: `/podcast/studio?config_id=${encodeURIComponent(config.id)}`,
  };
}

export default function PodcastDashboard() {
  const {
    config,
    topics = [],
    research = [],
    guests = [],
    segments = [],
    assets = [],
    session,
    loading,
  } = useTalkProduction();

  if (loading) {
    return (
      <div className="relative min-h-[calc(100vh-7rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-300" />
      </div>
    );
  }

  const approvedTopics = topics.filter(topic => topic.status === 'approved').length;
  const confirmedGuests = guests.filter(guest => guest.status === 'confirmed').length;
  const approvedAssets = assets.filter(asset => asset.status === 'approved').length;
  const move = nextMove({ config, research, topics, segments, assets, session });
  const studioPath = config?.id
    ? `/podcast/studio?config_id=${encodeURIComponent(config.id)}`
    : '/podcast/setup';

  const checklist = [
    Boolean(config?.production_name),
    research.length > 0,
    topics.length > 0,
    approvedTopics > 0,
    segments.length > 0,
    assets.length > 0,
  ];
  const readiness = Math.round((checklist.filter(Boolean).length / checklist.length) * 100);

  const guideInstructions = [
    'Set up the podcast once so CREAPD knows the show.',
    'Prepare the next episode and approve the material you want.',
    'Check the rundown and assets, then send the episode to Studio.',
  ];

  return (
    <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25 pointer-events-none" />

      {/* Desktop scene layout */}
      <div className="relative hidden xl:block h-[calc(100vh-7rem)] min-h-[690px] p-3">
        <div className="absolute top-[2%] left-[1.2%] w-[21%] z-20">
          <TalkProducerGuide
            variant="screen"
            currentStep="podcast"
            title="Build the next episode."
            instructions={guideInstructions}
            readyText={`${research.length} research · ${approvedTopics}/${topics.length} topics · ${confirmedGuests} guests · ${approvedAssets}/${assets.length} assets`}
            nextLabel={move.label}
            onNext={() => { window.location.href = move.path; }}
          />
        </div>

        <section className="absolute top-[1.5%] left-1/2 w-[34%] -translate-x-1/2 z-20 rounded-xl border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-md shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Mic2 className="w-4 h-4 text-orange-300" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-orange-200/80">Podcast Production</span>
              </div>
              <h1 className="font-heading font-bold text-lg text-white truncate">
                {config?.production_name || 'New Podcast'}
              </h1>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/45">
                <span>{config?.show_format || 'Podcast'}</span>
                <span>{config?.show_tone || 'Conversational'}</span>
                <span>{formatMinutes(config?.total_show_runtime || 0)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild className="h-9 w-9 p-0 border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Link to={config?.id ? `/podcast/setup?config_id=${encodeURIComponent(config.id)}` : '/podcast/setup'}>
                  <Settings className="w-3.5 h-3.5" />
                </Link>
              </Button>
              {config?.id && segments.length > 0 && (
                <Button size="sm" asChild className="border border-white/10 bg-gradient-to-r from-orange-500 via-purple-500 to-pink-500 text-white hover:brightness-110">
                  <Link to={studioPath}><Radio className="w-3.5 h-3.5 mr-1" /> Enter Studio</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <ScenePanel
          className="absolute top-[4%] right-[1.4%] w-[21%] z-20"
          icon={Sparkles}
          title="Your Next Move"
          actionLabel={move.label}
          to={move.path}
        >
          <p className="text-[9px] uppercase tracking-[0.18em] text-orange-300/70">{move.eyebrow}</p>
          <p className="mt-1.5 text-sm font-semibold text-white leading-snug">{move.title}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/50">{move.description}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-500 to-violet-500" style={{ width: `${readiness}%` }} />
          </div>
        </ScenePanel>

        <ScenePanel
          className="absolute top-[34%] left-[22%] w-[18%] z-20"
          icon={Users}
          title="Guest Chair"
          to="/podcast/guests"
        >
          {guests.length > 0 ? (
            <div className="space-y-1.5">
              {guests.slice(0, 3).map(guest => (
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
        </ScenePanel>

        <ScenePanel
          className="absolute top-[34%] right-[14.5%] w-[19%] z-20"
          icon={Lightbulb}
          title="Discussion Topics"
          to="/podcast/review"
        >
          {topics.length > 0 ? (
            <div className="space-y-1.5">
              {topics.slice(0, 4).map(topic => (
                <div key={topic.id} className="flex min-h-5 items-center gap-2 text-[10px] text-white/75">
                  <span className="truncate">{topic.topic_name}</span>
                  <span className={topic.status === 'approved' ? 'text-emerald-300' : 'text-white/35'}>{topic.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/45">Prepare an episode brief to create discussion topics.</p>
          )}
        </ScenePanel>

        <section className="absolute top-[58%] left-[38%] w-[29%] z-20 grid grid-cols-6 gap-1 rounded-xl border border-white/10 bg-black/35 p-2 backdrop-blur-sm shadow-xl">
          {[
            ['Runtime', formatMinutes(config?.total_show_runtime || 0)],
            ['Topics', topics.length],
            ['Approved', approvedTopics],
            ['Guests', guests.length],
            ['Assets', assets.length],
            ['Ready', readiness + '%'],
          ].map(([label, value]) => (
            <div key={label} className="min-h-12 min-w-0 rounded-lg border border-white/10 bg-black/15 px-1.5 py-1.5">
              <span className="block truncate text-[8px] text-white/40">{label}</span>
              <strong className={label === 'Ready' ? 'mt-1 block truncate text-[10px] text-emerald-300' : 'mt-1 block truncate text-[10px] text-white/90'}>
                {value}
              </strong>
            </div>
          ))}
        </section>

        <ScenePanel
          className="absolute bottom-[3%] left-[1.5%] w-[23%] z-20"
          icon={ClipboardList}
          title="Show Rundown"
          to="/podcast/rundown"
        >
          {segments.length > 0 ? (
            <div className="space-y-1">
              {segments.slice(0, 4).map(segment => (
                <div key={segment.id} className="flex min-h-5 items-center gap-2 text-[10px] text-white/75">
                  <span className="w-10 shrink-0 text-white/35">{segment.start_time || ''}</span>
                  <span className="truncate">{segment.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/45">Build the episode to create the rundown.</p>
          )}
        </ScenePanel>

        <ScenePanel
          className="absolute bottom-[3%] right-[1.5%] w-[23%] z-20"
          icon={Sparkles}
          title="AI Assets"
          to="/podcast/assets"
        >
          {assets.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {assets.slice(0, 6).map(asset => (
                <div key={asset.id} className="flex min-w-0 items-center gap-1 rounded-lg bg-white/[0.04] p-1.5 text-[9px] text-white/70">
                  <CheckCircle2 className={asset.status === 'approved' ? 'w-3 h-3 text-emerald-300' : 'w-3 h-3 text-white/30'} />
                  <span className="truncate">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/45">No production assets yet.</p>
          )}
        </ScenePanel>

        <Link
          to={move.path}
          className="absolute bottom-[2.5%] left-1/2 w-[19%] -translate-x-1/2 z-20 flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-black/45 px-4 py-2 backdrop-blur-md shadow-2xl transition hover:bg-black/55 hover:border-orange-300/30"
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-400/10 border border-orange-300/20">
            {move.step >= 7 ? <Radio className="w-4 h-4 text-orange-300" /> : <FileText className="w-4 h-4 text-orange-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Final Desk · Step {move.step}</p>
            <p className="truncate text-sm font-semibold text-white">{move.label}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/55" />
        </Link>
      </div>

      {/* Mobile/tablet: same logic, stacked instead of scene-positioned */}
      <div className="relative xl:hidden p-3 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.18em] text-orange-300">Podcast Format</p>
          <h1 className="mt-1 text-2xl font-heading font-bold text-white">{config?.production_name || 'New Podcast'}</h1>
          <p className="mt-2 text-sm text-white/60">Setup → research → brief → production → studio → publish.</p>
          <Button asChild className="mt-4 w-full bg-gradient-to-r from-orange-500 to-fuchsia-600">
            <Link to={move.path}>{move.label}<ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>

        <TalkProducerGuide
          variant="screen"
          currentStep="podcast"
          title="Build the next episode."
          instructions={guideInstructions}
          readyText={`${research.length} research · ${approvedTopics}/${topics.length} topics · ${confirmedGuests} guests · ${approvedAssets}/${assets.length} assets`}
          nextLabel={move.label}
          onNext={() => { window.location.href = move.path; }}
        />

        <ScenePanel icon={Lightbulb} title="Discussion Topics" to="/podcast/review">
          <p className="text-xs text-white/60">{approvedTopics}/{topics.length} approved</p>
        </ScenePanel>

        <ScenePanel icon={Users} title="Guest Chair" to="/podcast/guests">
          <p className="text-xs text-white/60">{confirmedGuests} confirmed · {guests.length} total</p>
        </ScenePanel>

        <ScenePanel icon={ClipboardList} title="Show Rundown" to="/podcast/rundown">
          <p className="text-xs text-white/60">{segments.length} segments prepared</p>
        </ScenePanel>

        <ScenePanel icon={Sparkles} title="AI Assets" to="/podcast/assets">
          <p className="text-xs text-white/60">{approvedAssets}/{assets.length} approved</p>
        </ScenePanel>
      </div>
    </div>
  );
}
