import React, { useState, useEffect } from 'react';
import { User, Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import GlobalSearch from '@/components/shared/GlobalSearch';
import CreapdLogo from '@/components/brand/CreapdLogo';
import ModeToggle from '@/components/creap/ModeToggle';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { PRODUCTION_MODES, getActiveProductionMode } from '@/lib/producerNav';
import PodcastEpisodeFlow from './PodcastEpisodeFlow';

function currentPodcastStage(pathname) {
  if (pathname.startsWith('/podcast/setup') || pathname.startsWith('/talk/configure')) return 'Setup';
  if (
    pathname.startsWith('/podcast/research') ||
    pathname.startsWith('/podcast/sources') ||
    pathname.startsWith('/podcast/queue') ||
    pathname.startsWith('/podcast/review') ||
    pathname.startsWith('/podcast/library') ||
    pathname.startsWith('/news/research') ||
    pathname.startsWith('/news/sources') ||
    pathname.startsWith('/news/queue') ||
    pathname.startsWith('/news/review')
  ) return 'Research';
  if (
    pathname.startsWith('/podcast/assembly') ||
    pathname.startsWith('/podcast/brief') ||
    pathname.startsWith('/news/brief')
  ) return 'Assembly';
  if (
    pathname.startsWith('/podcast/production') ||
    pathname.startsWith('/podcast/workspace') ||
    pathname.startsWith('/podcast/guests') ||
    pathname.startsWith('/podcast/rundown') ||
    pathname.startsWith('/podcast/assets') ||
    pathname.startsWith('/news/production') ||
    pathname.startsWith('/news/workspace') ||
    pathname.startsWith('/talk/guests') ||
    pathname.startsWith('/talk/rundown') ||
    pathname.startsWith('/talk/assets')
  ) return 'Production';
  if (pathname.startsWith('/podcast/export') || pathname.startsWith('/news/export')) return 'Finish & Publish';
  return 'Podcast Home';
}

export default function ProducerHeader({ onOpenNav, variant = 'default' }) {
  const isPodcastHeader = variant === 'news' || variant === 'podcast';
  const [time, setTime] = useState(new Date());
  const location = useLocation();
  const activeMode = getActiveProductionMode(location.pathname);
  const activeModeConfig = PRODUCTION_MODES.find(mode => mode.key === activeMode);
  const { activeDepartment } = useCREAPMode();
  const podcastStage = currentPodcastStage(location.pathname);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={`relative z-50 ${isPodcastHeader ? 'news-broadcast-header' : ''}`}>
      <div className={`h-14 lg:h-16 border-b border-white/[0.06] flex items-center px-3 lg:px-6 ${isPodcastHeader ? 'news-broadcast-header-bar' : 'glass-panel-navy'}`}>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-berna-purple/40 to-transparent" />

        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenNav}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-400/20 via-fuchsia-400/15 to-violet-400/15 border border-fuchsia-300/20 text-white/85 hover:border-fuchsia-300/35 hover:text-white transition-all"
            title="Open Production Map"
          >
            <MenuIcon className="w-4 h-4 text-orange-300" />
            <span className="hidden sm:inline text-xs font-medium">Production Map</span>
            <span className="sm:hidden text-xs font-medium">Map</span>
          </button>
          <Link to="/" className="flex items-center gap-2">
            <CreapdLogo height="h-8 lg:h-10" />
            {isPodcastHeader && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="h-6 w-px bg-white/20" />
                <span className="text-xs lg:text-sm tracking-[0.28em] text-white font-semibold">PODCAST</span>
              </div>
            )}
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center gap-4 px-2 lg:px-4">
          <GlobalSearch />
          <div className="hidden lg:flex items-center gap-4 text-center">
            <div>
              <p className="text-lg font-mono font-semibold text-white tracking-wider">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="h-8 w-px bg-white/10" />
            {activeMode === 'podcast' ? (
              <div className="min-w-28 text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Stage</p>
                <p className="text-xs font-semibold text-fuchsia-200">{podcastStage}</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Production Profile</p>
                  <p className="text-xs font-semibold text-foreground">{activeModeConfig?.label || activeMode}</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Department</p>
                  <p className="text-xs font-semibold text-berna-purple">{activeDepartment?.name || 'Dashboard'}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-2">
          <ModeToggle />
          <NotificationDropdown />
          <Link to="/podcast/profile">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white h-8 w-8">
              <User className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {isPodcastHeader && <PodcastEpisodeFlow />}
    </header>
  );
}
