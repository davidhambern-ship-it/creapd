import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import RPPDepartmentNav from './RPPDepartmentNav';
import RPPProgressIndicator from './RPPProgressIndicator';
import RPPCreaprMessage from './RPPCreaprMessage';
import { Search, Bell, Volume2, VolumeX, ChevronLeft } from 'lucide-react';

export default function RPPShell() {
  const location = useLocation();
  const researchData = useResearchProduction();
  const { config, topics, points, packages, dossiers } = researchData;

  const [user, setUser] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [creaprMessage, setCreaprMessage] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Greeting on first entry
  useEffect(() => {
    if (location.pathname === '/research' && !creaprMessage) {
      const firstName = user?.full_name?.split(' ')[0] || 'there';
      setCreaprMessage(config
        ? `Welcome back, ${firstName}. Your production "${config.production_name}" is ${researchData.topics.length > 0 ? 'in progress' : 'ready to begin'}. Where would you like to work?`
        : `Welcome to the Research Production Profile, ${firstName}. Visit the Configuration department to set up your production, or explore the building.`
      );
    }
  }, [location.pathname, user, config]);

  const handleSpeak = useCallback((text) => {
    if (!voiceEnabled) return;
    base44.functions.invoke('generateCreapSpeech', {
      text: text.substring(0, 5000),
      voice: 'daniel',
    }).then(res => {
      const url = res?.data?.url;
      if (url) {
        const audio = new Audio(url);
        audio.play().catch(() => {});
      }
    }).catch(() => {});
  }, [voiceEnabled]);

  const toggleVoice = useCallback(() => setVoiceEnabled(v => !v), []);

  // Progress stages based on data
  const progressStages = {
    assignment: topics.length > 0,
    research: points.length > 0 || (dossiers?.length > 0),
    dossier: dossiers?.some(d => d.status === 'ready') || false,
    assets: packages.length > 0,
    packet: packages.some(p => p.status === 'approved' || p.status === 'finalized'),
  };

  return (
    <div className="rpp-shell">
      {/* Ambient living environment background */}
      <div className="rpp-ambient-bg" />

      {/* Top Bar — persistent shell */}
      <header className="rpp-topbar">
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/home" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs hidden md:inline">CREAPD</span>
          </Link>
          <div className="w-px h-6 bg-border/50" />
          <div>
            <h1 className="text-sm font-heading font-semibold tracking-wide">
              Research Production Profile
            </h1>
            {config && (
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {config.production_name}
              </p>
            )}
          </div>
        </div>

        {/* Department Navigator */}
        <div className="flex-1 flex justify-center overflow-x-auto">
          <RPPDepartmentNav />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setSearchOpen(s => !s)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
            title={voiceEnabled ? 'Voice on' : 'Voice off'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {researchData.topics.filter(t => t.status === 'researching').length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
          {user && (
            <div className="hidden md:flex items-center gap-2 ml-1 pl-2 border-l border-border/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {user.full_name?.charAt(0) || '?'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground max-w-[100px] truncate">
                {user.full_name || 'Producer'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Progress Indicator Bar */}
      <div className="rpp-progress-bar">
        <RPPProgressIndicator stages={progressStages} />
      </div>

      {/* Main Workspace — departments replace only this area */}
      <main className="rpp-workspace">
        <Outlet context={{ setCreaprMessage, voiceEnabled }} />
      </main>

      {/* CREAPr Message Area — floating, text typing, no auto-voice */}
      <RPPCreaprMessage
        message={creaprMessage}
        onSpeak={handleSpeak}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
      />
    </div>
  );
}