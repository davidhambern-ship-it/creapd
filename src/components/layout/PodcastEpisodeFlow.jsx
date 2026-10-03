import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

const STAGES = [
  {
    key: 'setup',
    label: 'Setup',
    path: '/podcast/setup',
    matches: ['/podcast/setup', '/talk/configure'],
  },
  {
    key: 'research',
    label: 'Research',
    path: '/podcast/research',
    matches: [
      '/podcast/research', '/podcast/sources', '/podcast/queue', '/podcast/review', '/podcast/library',
      '/news/research', '/news/sources', '/news/queue', '/news/review', '/news/library',
      '/talk/research', '/talk/topics',
    ],
  },
  {
    key: 'assembly',
    label: 'Assembly',
    path: '/podcast/assembly',
    matches: ['/podcast/assembly', '/podcast/brief', '/news/brief'],
  },
  {
    key: 'production',
    label: 'Production',
    path: '/podcast/production',
    matches: [
      '/podcast/workspace', '/podcast/production', '/podcast/guests', '/podcast/rundown', '/podcast/assets',
      '/news/workspace', '/news/production', '/talk/guests', '/talk/rundown', '/talk/assets',
    ],
  },
  {
    key: 'studio',
    label: 'Studio',
    path: '/podcast/studio',
    matches: ['/podcast/studio', '/talk/live'],
  },
  {
    key: 'publish',
    label: 'Publish',
    path: '/podcast/export',
    matches: ['/podcast/export', '/news/export', '/talk/export'],
  },
];

function matchesStage(pathname, stage) {
  return stage.matches.some(path => pathname === path || pathname.startsWith(path + '/'));
}

export default function PodcastEpisodeFlow() {
  const location = useLocation();
  const isHome = location.pathname === '/podcast' ||
    location.pathname === '/podcast/dashboard' ||
    location.pathname === '/news/dashboard';

  return (
    <div className="border-b border-white/[0.06] bg-black/35 px-3 backdrop-blur-xl lg:px-6">
      <div className="mx-auto flex h-9 max-w-[1500px] items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="mr-1 hidden shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30 md:inline">
          Episode Flow
        </span>

        <Link
          to="/podcast"
          className={`flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition ${
            isHome
              ? 'border-orange-300/35 bg-orange-400/12 text-orange-100'
              : 'border-transparent text-white/40 hover:bg-white/[0.05] hover:text-white/75'
          }`}
          title="Podcast Home"
        >
          <Home className="h-3 w-3" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <ChevronRight className="h-3 w-3 shrink-0 text-white/15" />

        {STAGES.map((stage, index) => {
          const active = matchesStage(location.pathname, stage);
          return (
            <React.Fragment key={stage.key}>
              <Link
                to={stage.path}
                className={`flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold transition ${
                  active
                    ? 'border-fuchsia-300/35 bg-fuchsia-400/12 text-white shadow-[0_0_16px_rgba(217,70,239,.08)]'
                    : 'border-transparent text-white/40 hover:bg-white/[0.05] hover:text-white/75'
                }`}
              >
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[8px] ${
                  active ? 'bg-fuchsia-300/20 text-fuchsia-100' : 'bg-white/[0.05] text-white/35'
                }`}>
                  {index + 1}
                </span>
                {stage.label}
              </Link>
              {index < STAGES.length - 1 && (
                <ChevronRight className="h-3 w-3 shrink-0 text-white/15" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
