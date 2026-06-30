import React, { useState, useEffect } from 'react';
import { Play, User, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import GlobalSearch from '@/components/shared/GlobalSearch';

export default function ProducerHeader({ onGenerateBrief }) {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [briefingStatus, setBriefingStatus] = useState(null);

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
    <header className="h-16 glass-panel-navy border-b border-white/[0.06] flex items-center px-4 lg:px-6 relative z-50">
      {/* Purple bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-berna-purple/40 to-transparent" />
      
      {/* Emerald pulse when ready */}
      {briefingStatus === 'ready' && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-berna-emerald/60 to-transparent pulse-glow" />
      )}

      {/* Left: Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/" className="flex items-center">
          <img
            src="https://media.base44.com/images/public/6a4126962e5804304cc84b12/3a30f6e3d_Producer.png"
            alt="Producer — Plan. Produce. Publish."
            className="h-10 w-auto"
            style={{ mixBlendMode: 'screen' }}
          />
        </Link>
      </div>

      {/* Center: Search & Status */}
      <div className="flex-1 flex items-center justify-center gap-4 px-4">
        <GlobalSearch />
        <div className="hidden md:flex items-center gap-4 text-center">
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
      <div className="flex items-center gap-2">
        {user?.role === 'admin' && (
          <Link to="/checklist" title="Acceptance Checklist">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-berna-purple h-8 w-8">
              <ClipboardCheck className="w-4 h-4" />
            </Button>
          </Link>
        )}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-berna-emerald/10 border border-berna-emerald/20">
          <div className="w-1.5 h-1.5 rounded-full bg-berna-emerald pulse-glow" />
          <span className="text-[10px] text-berna-emerald font-medium">Echo Online</span>
        </div>
        <NotificationDropdown />
        <Link to="/profile">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white h-8 w-8">
            <User className="w-4 h-4" />
          </Button>
        </Link>
        <Button
          onClick={onGenerateBrief}
          size="sm"
          className="hidden sm:flex bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 hover:to-berna-purple/70 text-white text-xs h-8 glow-purple"
        >
          <Play className="w-3 h-3 mr-1" />
          Generate Brief
        </Button>
      </div>
    </header>
  );
}