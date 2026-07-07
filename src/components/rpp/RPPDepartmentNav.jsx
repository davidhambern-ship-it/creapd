import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import { getDepartmentThemeFromPath } from '@/lib/rppDepartmentThemes';
import { ChevronLeft, CheckCircle2, Menu, X } from 'lucide-react';

export default function RPPDepartmentNav({ config, progressStages = {}, researchingCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeDept = RPP_DEPARTMENTS.find(d =>
    d.path === '/research' ? location.pathname === '/research' : location.pathname.startsWith(d.path)
  ) || RPP_DEPARTMENTS[0];

  const activeTheme = getDepartmentThemeFromPath(location.pathname);

  const completedCount = Object.values(progressStages).filter(Boolean).length;
  const totalCount = Object.keys(progressStages).length;
  const readinessPercent = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Header — institute branding */}
      <div className="rpp-sidebar-header">
        <Link to="/home" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">CREAPD</span>
        </Link>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: `linear-gradient(135deg, hsl(${activeTheme.accentHsl} / 0.2), hsl(${activeTheme.accentHsl} / 0.08))`,
              border: `1px solid hsl(${activeTheme.accentHsl} / 0.3)`,
            }}
          >
            <span className="text-xs font-bold font-mono" style={{ color: `hsl(${activeTheme.accentHsl})` }}>Cr</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-heading font-semibold tracking-wide">Research Library</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
              {config?.production_name || 'No production set'}
            </p>
          </div>
        </div>
      </div>

      {/* Department Navigation — "rooms" in the institute */}
      <nav className="rpp-sidebar-nav">
        {RPP_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept.id === dept.id;
          const isResearching = dept.id === 'research' && researchingCount > 0;
          const stageDone = progressStages[dept.id === 'topics' ? 'assignment' : dept.id === 'develop' ? 'assets' : dept.id];
          return (
            <button
              key={dept.id}
              onClick={() => handleNavigate(dept.path)}
              className={`rpp-sidebar-tab ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{dept.name}</span>
              {isResearching && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              )}
              {stageDone && !isResearching && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer — readiness progress */}
      <div className="rpp-sidebar-footer">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Readiness</span>
          <span className="text-xs font-bold" style={{ color: `hsl(${activeTheme.accentHsl})` }}>{readinessPercent}%</span>
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 12% / 0.5)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${readinessPercent}%`, background: `linear-gradient(90deg, hsl(${activeTheme.accentHsl} / 0.6), hsl(${activeTheme.accentHsl}))` }}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop — fixed left sidebar */}
      <aside
        className="rpp-sidebar hidden md:flex"
        style={{ '--dept-accent': activeTheme.accentHsl }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile — compact top bar */}
      <header className="rpp-mobile-topbar md:hidden">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2">
          <Menu className="w-5 h-5" style={{ color: `hsl(${activeTheme.accentHsl})` }} />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: `hsl(${activeTheme.accentHsl} / 0.2)`, border: `1px solid hsl(${activeTheme.accentHsl} / 0.3)` }}
          >
            <span className="text-[10px] font-bold font-mono" style={{ color: `hsl(${activeTheme.accentHsl})` }}>Cr</span>
          </div>
          <span className="text-xs font-heading font-semibold">{activeDept.name}</span>
        </div>
        <div className="w-8" />
      </header>

      {/* Mobile — slide-in sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="rpp-sidebar rpp-sidebar-mobile"
            style={{ '--dept-accent': activeTheme.accentHsl }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 z-10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}