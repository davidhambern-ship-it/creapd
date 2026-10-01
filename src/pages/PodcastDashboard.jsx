import React from 'react';
import { Link } from 'react-router-dom';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers,
  Mic2,
  Radio,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react';

const STEPS = [
  {
    number: 1,
    title: 'Set Up Your Podcast',
    description: 'Tell CREAPD what the show is, who hosts it, how long it runs, what it covers, and how it should sound.',
    path: '/talk/configure',
    action: 'Configure Podcast',
    icon: Settings2,
  },
  {
    number: 2,
    title: 'Prepare the Next Episode',
    description: 'CREAPD gathers topics and source material based on your show so you are not starting from a blank page.',
    path: '/news/brief',
    action: 'Open Episode Brief',
    icon: FileText,
  },
  {
    number: 3,
    title: 'Review & Approve',
    description: 'Keep what belongs in the episode, reject what does not, and approve the material CREAPD should build around.',
    path: '/news/review',
    action: 'Review Material',
    icon: ClipboardCheck,
  },
  {
    number: 4,
    title: 'Build the Episode',
    description: 'Approved material becomes the episode workspace, production package, talking points, scripts, and rundown.',
    path: '/news/production',
    action: 'Open Episode Production',
    icon: Layers,
  },
  {
    number: 5,
    title: 'Send It to the Studio',
    description: 'When the episode is ready, send it to the Podcast Studio for teleprompter, OBS, segment control, and recording/live production.',
    path: '/talk/live',
    action: 'Open Podcast Studio',
    icon: Radio,
  },
];

export default function PodcastDashboard() {
  const { config, segments, session, loading } = useTalkProduction();

  const studioReady = Boolean(config?.id && Array.isArray(segments) && segments.length > 0);
  const studioPath = studioReady
    ? `/talk/live?config_id=${encodeURIComponent(config.id)}`
    : '/talk/configure';

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <section className="glass-panel overflow-hidden border border-orange-400/20">
        <div className="p-6 lg:p-8 bg-gradient-to-br from-orange-500/10 via-fuchsia-500/[0.06] to-violet-500/[0.06]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Mic2 className="w-5 h-5 text-orange-300" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">Podcast Format</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-heading font-bold text-white mb-3">
                Start here.
              </h1>
              <p className="text-base text-white/75 leading-relaxed">
                CREAPD prepares the next episode. You review and approve the material. CREAPD builds the episode package. Then you send it to the Podcast Studio and produce the show.
              </p>
            </div>

            <div className="min-w-[260px] rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-2">Your next move</p>
              {loading ? (
                <p className="text-sm text-white/60">Checking your Podcast workspace…</p>
              ) : studioReady ? (
                <>
                  <p className="font-semibold text-white">{config?.production_name || 'Podcast episode'} is studio-ready.</p>
                  <p className="text-xs text-white/50 mt-1">{segments.length} rundown segments prepared.</p>
                  <Button asChild className="w-full mt-4 bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white">
                    <Link to={studioPath}>Open Podcast Studio <ArrowRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                </>
              ) : config?.id ? (
                <>
                  <p className="font-semibold text-white">Continue preparing {config.production_name || 'your podcast'}.</p>
                  <p className="text-xs text-white/50 mt-1">Your show exists. Prepare and approve the next episode before sending it to Studio.</p>
                  <Button asChild className="w-full mt-4">
                    <Link to="/news/brief">Prepare Next Episode <ArrowRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-white">Set up your Podcast first.</p>
                  <p className="text-xs text-white/50 mt-1">This tells CREAPD what it should prepare every time you come back.</p>
                  <Button asChild className="w-full mt-4">
                    <Link to="/talk/configure">Configure Podcast <ArrowRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-heading font-bold text-white">The Podcast pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Follow this from top to bottom. You should never have to guess where to go next.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const path = step.number === 5 ? studioPath : step.path;
            return (
              <article key={step.number} className="glass-panel p-4 flex flex-col border border-white/[0.07]">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-orange-300" />
                  </div>
                  <span className="text-2xl font-mono font-bold text-white/15">{String(step.number).padStart(2, '0')}</span>
                </div>
                <h3 className="font-heading font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{step.description}</p>
                <Link to={path} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300 hover:text-orange-200">
                  {step.action} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-berna-purple" />
            <h2 className="font-heading font-semibold text-white">What CREAPD handles</h2>
          </div>
          <div className="space-y-2 text-sm text-white/65">
            <p>Find and organize material for the next episode.</p>
            <p>Build research, talking points, scripts, assets, and a rundown from approved material.</p>
            <p>Keep the production package ready for the Studio instead of making you rebuild the show every time.</p>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-berna-emerald" />
            <h2 className="font-heading font-semibold text-white">What you handle</h2>
          </div>
          <div className="space-y-2 text-sm text-white/65">
            <p>Tell CREAPD what kind of podcast you are making.</p>
            <p>Approve, reject, or redirect the material it prepares.</p>
            <p>When the episode looks right, send it to Studio and produce the show.</p>
          </div>
        </div>
      </section>

      {config?.id && (
        <section className="glass-panel p-5 border border-emerald-400/15">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-berna-emerald" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-berna-emerald">Current Podcast Workspace</span>
              </div>
              <h2 className="text-lg font-heading font-bold text-white mt-2">{config.production_name}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {session?.status ? `Studio status: ${session.status}` : 'Studio session has not started yet.'}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to={studioReady ? studioPath : `/talk/configure?config_id=${encodeURIComponent(config.id)}`}>
                {studioReady ? 'Open Studio' : 'Edit Podcast Setup'}
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
