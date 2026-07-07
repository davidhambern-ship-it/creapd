import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import { ChevronLeft, Volume2, VolumeX, CheckCircle2, Circle } from 'lucide-react';

export default function RPPDepartmentNav({ config, progressStages = {}, researchingCount = 0, voiceEnabled, onToggleVoice }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeDept = RPP_DEPARTMENTS.find(d =>
    d.path === '/research' ? location.pathname === '/research' : location.pathname.startsWith(d.path)
  ) || RPP_DEPARTMENTS[0];

  const completedCount = Object.values(progressStages).filter(Boolean).length;
  const totalCount = Object.keys(progressStages).length;
  const readinessPercent = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

  return (
    <header className="rpp-topbar">
      {/* Left: Logo */}
      <div className="rpp-topbar-logo">
        <Link to="/home" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-medium">CREAPD</span>
        </Link>
        <div className="w-px h-5 bg-border/40" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(190 60% 40% / 0.2), hsl(35 80% 50% / 0.15))', border: '1px solid hsl(190 40% 30% / 0.3)' }}>
            <span className="text-xs font-bold font-mono" style={{ color: 'hsl(190 80% 55%)' }}>Cr</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-heading font-semibold tracking-wide">Research Library</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {config?.production_name || 'No production set'}
            </p>
          </div>
        </div>
      </div>

      {/* Center: Department Tabs */}
      <nav className="rpp-topbar-nav">
        {RPP_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept.id === dept.id;
          const isResearching = dept.id === 'research' && researchingCount > 0;
          const stageDone = progressStages[dept.id === 'topics' ? 'assignment' : dept.id === 'develop' ? 'assets' : dept.id];
          return (
            <button
              key={dept.id}
              onClick={() => navigate(dept.path)}
              className={`rpp-nav-tab ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">{dept.name}</span>
              {isResearching && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              )}
              {stageDone && !isResearching && (
                <CheckCircle2 className="w-3 h-3 text-emerald-400/60 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Progress + Voice */}
      <div className="rpp-topbar-actions">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(190 30% 10% / 0.3)', border: '1px solid hsl(190 25% 18% / 0.3)' }}>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Readiness</span>
          <span className="text-xs font-bold" style={{ color: 'hsl(35 90% 60%)' }}>{readinessPercent}%</span>
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 12% / 0.5)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${readinessPercent}%`, background: 'linear-gradient(90deg, hsl(190 55% 45%), hsl(35 80% 55%))' }}
            />
          </div>
        </div>
        <button
          onClick={onToggleVoice}
          className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          title={voiceEnabled ? 'Voice on' : 'Voice off'}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}