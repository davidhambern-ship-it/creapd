import React, { useState, useEffect } from 'react';
import { User, Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import GlobalSearch from '@/components/shared/GlobalSearch';
import CreapdLogo from '@/components/brand/CreapdLogo';
import ModeToggle from '@/components/creap/ModeToggle';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { PRODUCTION_MODES, getActiveProductionMode } from '@/lib/producerNav';

export default function ProducerHeader({ onGenerateBrief, onOpenNav, variant = 'default' }) {
  const isPodcastHeader = variant === 'news' || variant === 'podcast';
  const [time, setTime] = useState(new Date());
  const [briefingStatus, setBriefingStatus] = useState(null);
  const location = useLocation();
  const activeMode = getActiveProductionMode(location.pathname);
  const activeModeConfig = PRODUCTION_MODES.find(mode => mode.key === activeMode);
  const { activeDepartment } = useCREAPMode();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // News Briefing is a News-only entity. Do not query or display it inside
  // unrelated Production Profiles.
  useEffect(() => {
    if (activeMode !== 'podcast') {
      setBriefingStatus(null);
      return;
    }

    let cancelled = false;
    base44.entities.Briefing.filter({ date: new Date().toISOString().split('T')[0] }, '-created_date', 1)
      .then(briefs => {
        if (!cancelled) setBriefingStatus(briefs?.[0]?.status || null);
      })
      .catch(() => {
        if (!cancelled) setBriefingStatus(null);
      });

    return () => { cancelled = true; };
  }, [activeMode]);

  const statusColors = {
    ready: 'text-berna-emerald',
    generating: 'text-berna-orange',
    needs_review: 'text-yellow-400',
    failed: 'text-red-500',
  };

  const statusLabels = {
    ready: 'Brief Ready',
    generating: 'Generating...',
    needs_review: 'Needs Review',
    failed: 'Failed',
  };

  const nextRun = new Date();
  nextRun.setHours(6, 0, 0, 0);
  if (nextRun <= new Date()) nextRun.setDate(nextRun.getDate() + 1);
  const hoursUntil = Math.max(0, Math.floor((nextRun - time) / 3600000));
  const minsUntil = Math.max(0, Math.floor(((nextRun - time) % 3600000) / 60000));

  return (
    <header className={`relative z-50 ${isPodcastHeader ? 'news-broadcast-header' : ''}`}>
      {/* Main Header Bar */}
      <div className={`h-14 lg:h-16 border-b border-white/[0.06] flex items-center px-3 lg:px-6 ${isPodcastHeader ? 'news-broadcast-header-bar' : 'glass-panel-navy'}`}>
        {/* Purple bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-berna-purple/40 to-transparent" />

        {/* Emerald pulse when the News brief is actually ready */}
        {activeMode === 'podcast' && briefingStatus === 'ready' && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-berna-emerald/60 to-transparent pulse-glow" />
        )}

        {/* Left: Menu Button (mobile) + Logo */}
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

        {/* Center: Search & Status */}
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

            {activeMode === 'podcast' ? (
              <>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Prep</p>
                  <p className="text-xs font-mono text-berna-purple">{hoursUntil}h {minsUntil}m</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Episode Brief</p>
                  <p className={`text-xs font-semibold ${statusColors[briefingStatus] || 'text-muted-foreground'}`}>
                    {statusLabels[briefingStatus] || 'No Brief'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-8 w-px bg-white/10" />
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

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 lg:gap-2">
          <ModeToggle />
          <NotificationDropdown />
          <Link to="/news/profile">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white h-8 w-8">
              <User className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Format switching now lives inside the Production Map so the room stays visually clean. */}
    </header>
  );
}
