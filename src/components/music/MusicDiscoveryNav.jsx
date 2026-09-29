import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Archive,
  ArchiveX,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Dices,
  Download,
  ListChecks,
  ListMusic,
  LockKeyhole,
  Package,
  Radio,
  Search,
  Trophy,
  Sparkles,
  Wrench,
} from 'lucide-react';

const TOOLS = [
  { icon: ListChecks, label: 'Topics', path: '/music/topics', color: '#FF6B00' },
  { icon: Search, label: 'Knowledge', path: '/music/research', color: '#00FF88' },
  { icon: ListMusic, label: 'Playlist', path: '/music/playlist', color: '#8B5CF6' },
  { icon: Sparkles, label: 'Assets', path: '/music/assets', color: '#FF00FF' },
  { icon: Package, label: 'Rundown', path: '/music/rundown', color: '#FFD700' },
  { icon: Trophy, label: 'Top 10 Video', path: '/music/top10', color: '#FF8A4C' },
  { icon: Download, label: 'Export', path: '/music/export', color: '#00FFFF' },
];

function NavButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  disabled = false,
  color = '#00FFFF',
  badge = null,
  title,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className="flex-shrink-0 h-9 inline-flex items-center gap-2 px-3 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all disabled:cursor-not-allowed"
      style={{
        color: disabled ? 'rgba(255,255,255,0.28)' : color,
        background: active
          ? `linear-gradient(135deg, ${color}24, ${color}0d)`
          : disabled
            ? 'rgba(255,255,255,0.025)'
            : `${color}0d`,
        borderColor: active
          ? `${color}70`
          : disabled
            ? 'rgba(255,255,255,0.08)'
            : `${color}30`,
        boxShadow: active ? `0 0 18px ${color}16` : 'none',
      }}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden lg:inline">{label}</span>
      {badge !== null && badge !== undefined && (
        <span
          className="min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold"
          style={{
            background: disabled ? 'rgba(255,255,255,0.05)' : `${color}16`,
            border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : color + '35'}`,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default function MusicDiscoveryNav({
  config = null,
  rejectedCount = null,
  reviewApproved = null,
  reviewTotal = null,
  onRoulette,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);

  const studioApproved = config?.status === 'approved';
  const configId = config?.id || '';
  const reviewBadge =
    Number.isFinite(Number(reviewApproved)) && Number.isFinite(Number(reviewTotal)) && Number(reviewTotal) > 0
      ? `${reviewApproved}/${reviewTotal}`
      : null;
  const rejectedBadge = rejectedCount === null || rejectedCount === undefined ? null : Number(rejectedCount || 0);
  const toolsActive = TOOLS.some(tool => location.pathname === tool.path);

  useEffect(() => {
    const handlePointer = event => {
      if (!toolsRef.current?.contains(event.target)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, []);

  const goToSection = (id) => {
    if (location.pathname === '/music/dashboard') {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(`/music/dashboard#${id}`);
  };

  return (
    <div className="flex justify-center overflow-visible">
      <div
        className="relative flex items-center gap-2 max-w-full overflow-visible px-3 py-2 rounded-xl"
        style={{
          background: 'hsl(220 20% 6% / 0.82)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,0,255,0.14)',
          boxShadow: '0 12px 34px rgba(0,0,0,0.24)',
        }}
      >
        <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2">
          <NavButton
            icon={Compass}
            label="Discovery Room"
            color="#00FFFF"
            active={location.pathname === '/music/configure'}
            onClick={() => navigate(configId ? `/music/configure?config_id=${configId}` : '/music/configure')}
          />

          <NavButton
            icon={ClipboardCheck}
            label="Review Dashboard"
            color="#00FFB8"
            active={location.pathname === '/music/dashboard' && !location.hash}
            badge={reviewBadge}
            onClick={() => navigate('/music/dashboard')}
          />

          <NavButton
            icon={ArchiveX}
            label="Rejected Pile"
            color="#FF5D73"
            badge={rejectedBadge}
            disabled={rejectedBadge === 0}
            active={location.hash === '#rejected-pile'}
            title={rejectedBadge === 0 ? 'No rejected material' : 'Jump to rejected material'}
            onClick={() => goToSection('rejected-pile')}
          />

          <NavButton
            icon={studioApproved ? Radio : LockKeyhole}
            label="Radio Studio"
            color="#FF00FF"
            disabled={Boolean(config) && !studioApproved}
            active={location.pathname === '/music/live'}
            title={
              Boolean(config) && !studioApproved
                ? 'Approve every track and spoken segment to unlock Radio Studio'
                : 'Open Radio Studio'
            }
            onClick={() => navigate(configId ? `/music/live?config_id=${configId}` : '/music/live')}
          />

          <NavButton
            icon={Archive}
            label="Show Archive"
            color="#63E6BE"
            active={location.hash === '#show-archive'}
            onClick={() => goToSection('show-archive')}
          />

          <div className="relative flex-shrink-0" ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsOpen(open => !open)}
              className="h-9 inline-flex items-center gap-2 px-3 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                color: toolsActive ? '#FFD700' : '#CFC7FF',
                background: toolsActive ? 'rgba(255,215,0,0.10)' : 'rgba(139,92,246,0.08)',
                borderColor: toolsActive ? 'rgba(255,215,0,0.38)' : 'rgba(139,92,246,0.28)',
              }}
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden lg:inline">Production Tools</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {toolsOpen && (
              <div
                className="absolute right-0 top-[44px] z-[90] w-64 rounded-xl border border-white/10 bg-[#090b12]/95 backdrop-blur-xl p-2 shadow-2xl"
              >
                <div className="px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Production Tools</p>
                </div>

                {onRoulette && (
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onRoulette();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] text-left"
                  >
                    <Dices className="w-4 h-4 text-fuchsia-300" />
                    <div>
                      <p className="text-xs font-medium text-white">Show Roulette</p>
                      <p className="text-[9px] text-white/30">Generate a fresh show concept</p>
                    </div>
                  </button>
                )}

                {TOOLS.map(tool => {
                  const Icon = tool.icon;
                  const active = location.pathname === tool.path;
                  return (
                    <button
                      type="button"
                      key={tool.path}
                      onClick={() => {
                        setToolsOpen(false);
                        navigate(tool.path);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] text-left transition-colors"
                      style={active ? { background: `${tool.color}0d` } : undefined}
                    >
                      <Icon className="w-4 h-4" style={{ color: tool.color }} />
                      <span className="text-xs font-medium" style={{ color: active ? tool.color : 'rgba(255,255,255,0.78)' }}>
                        {tool.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
