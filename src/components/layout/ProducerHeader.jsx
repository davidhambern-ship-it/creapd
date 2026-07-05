import React, { useState, useEffect } from 'react';
import { Play, User, Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import GlobalSearch from '@/components/shared/GlobalSearch';
import CreapdLogo from '@/components/brand/CreapdLogo';
import ModeToggle from '@/components/creap/ModeToggle';
import { PRODUCTION_MODES, getActiveProductionMode } from '@/lib/producerNav';

export default function ProducerHeader({ onGenerateBrief, onOpenNav }) {
  const [time, setTime] = useState(new Date());
  const [briefingStatus, setBriefingStatus] = useState(null);
  const location = useLocation();
  const activeMode = getActiveProductionMode(location.pathname);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    base44.entities.Briefing.filter({ date: new Date().toISOString().split('T')[0] }, '-created_date', 1)
      .then(briefs => {
        if (briefs.length > 0) setBriefingStatus(briefs[0].status);
      })
      .catch(() => {});
  }, []);

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
    <header className="relative z-50">
      {/* Main Header Bar */}
      <div className="h-14 lg:h-16 glass-panel-navy border-b border-white/[0.06] flex items-center px-3 lg:px-6">
        {/* Purple bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-berna-purple/40 to-transparent" />

        {/* Emerald pulse when ready */}
        {briefingStatus === 'ready' && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-berna-emerald/60 to-transparent pulse-glow" />
        )}

        {/* Left: Menu Button (mobile) + Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenNav}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-berna-purple/30 to-berna-purple/10 border border-berna-purple/30 text-foreground hover:from-berna-purple/40 hover:to-berna-purple/20 transition-all glow-purple"
          >
            <MenuIcon className="w-4 h-4 text-berna-purple" />
            <span className="text-xs font-medium">Sidebar</span>
          </button>
          <Link to="/" className="flex items-center">
            <CreapdLogo height="h-8 lg:h-10" />
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
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Run</p>
              <p className="text-xs font-mono text-berna-purple">{hoursUntil}h {minsUntil}m</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Brief</p>
              <p className={`text-xs font-semibold ${statusColors[briefingStatus] || 'text-muted-foreground'}`}>
                {statusLabels[briefingStatus] || 'No Brief'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 lg:gap-2">
          <ModeToggle />
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-berna-emerald/10 border border-berna-emerald/20">
            <div className="w-1.5 h-1.5 rounded-full bg-berna-emerald pulse-glow" />
            <span className="text-[10px] text-berna-emerald font-medium">Echo Online</span>
          </div>
          <NotificationDropdown />
          <Link to="/news/userprofile">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white h-8 w-8">
              <User className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Production Mode Switcher — sub-bar (mobile only) */}
      <div className="lg:hidden flex items-center gap-1 px-3 py-1.5 glass-panel-navy border-b border-white/[0.06] overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
        {PRODUCTION_MODES.map(mode => {
          const isActive = activeMode === mode.key;
          return (
            <Link
              key={mode.key}
              to={mode.path}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground border border-transparent hover:text-foreground'
              }`}
            >
              <mode.icon className="w-3.5 h-3.5" />
              {mode.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}