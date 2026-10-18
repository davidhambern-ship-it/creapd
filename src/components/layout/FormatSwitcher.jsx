import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  FlaskConical,
  Home,
  Mic2,
  Radio,
} from 'lucide-react';

const FORMATS = [
  {
    key: 'radio',
    label: 'Radio',
    path: '/music/dashboard',
    roots: ['/music'],
    icon: Radio,
    accent: '#e879f9',
    glow: 'rgba(217,70,239,.18)',
  },
  {
    key: 'podcast',
    label: 'Podcast',
    path: '/podcast',
    roots: ['/podcast', '/news', '/talk'],
    icon: Mic2,
    accent: '#fb923c',
    glow: 'rgba(249,115,22,.16)',
  },
  {
    key: 'research',
    label: 'Research',
    path: '/research',
    roots: ['/research'],
    icon: FlaskConical,
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,.16)',
  },
];

function inferFormat(pathname) {
  return FORMATS.find(format =>
    format.roots.some(root => pathname === root || pathname.startsWith(root + '/'))
  )?.key || 'podcast';
}

export default function FormatSwitcher({
  format,
  compact = false,
  align = 'right',
  className = '',
}) {
  const location = useLocation();
  const activeKey = format || inferFormat(location.pathname);
  const active = FORMATS.find(item => item.key === activeKey) || FORMATS[1];
  const ActiveIcon = active.icon;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handlePointer = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div ref={rootRef} className={`relative flex items-center gap-1.5 ${className}`}>
      <Link
        to="/"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2.5 text-[11px] font-semibold text-white/65 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
        title="CREAPD Home"
      >
        <Home className="h-3.5 w-3.5" />
        {!compact && <span>CREAPD Home</span>}
      </Link>

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-black/35 px-2.5 text-[11px] font-semibold text-white backdrop-blur-md transition hover:brightness-110"
        style={{
          borderColor: `${active.accent}55`,
          boxShadow: `0 0 18px ${active.glow}`,
        }}
        title="Switch CREAPD format"
      >
        <ActiveIcon className="h-3.5 w-3.5" style={{ color: active.accent }} />
        <span>{active.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-[calc(100%+8px)] z-[1000] w-56 overflow-hidden rounded-xl border border-white/10 bg-[#080b11]/97 p-2 shadow-2xl backdrop-blur-xl ${align === 'left' ? 'left-0' : 'right-0'}`}
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">CREAPD Navigation</p>
          </div>

          <Link
            to="/"
            role="menuitem"
            className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
              <Home className="h-4 w-4 text-white/70" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">CREAPD Home</p>
              <p className="text-[9px] text-white/35">Choose a production format</p>
            </div>
          </Link>

          <div className="my-1 h-px bg-white/[0.06]" />

          {FORMATS.map(item => {
            const Icon = item.icon;
            const current = item.key === active.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                role="menuitem"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
                style={current ? {
                  background: item.glow,
                  border: `1px solid ${item.accent}35`,
                } : {
                  border: '1px solid transparent',
                }}
              >
                <div
                  className="grid h-8 w-8 place-items-center rounded-lg border bg-black/30"
                  style={{ borderColor: `${item.accent}45` }}
                >
                  <Icon className="h-4 w-4" style={{ color: item.accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className="text-[9px] text-white/35">
                    {current ? 'Current format · open format home' : `Switch to ${item.label}`}
                  </p>
                </div>
                {current && <Check className="h-3.5 w-3.5" style={{ color: item.accent }} />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
