import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MUSIC_PAGE_FLOW = [
  { path: '/music/configure', label: 'Discovery' },
  { path: '/music/dashboard', label: 'Dashboard' },
  { path: '/music/research', label: 'Knowledge' },
  { path: '/music/playlist', label: 'Playlist' },
  { path: '/music/top10', label: 'Top 10' },
  { path: '/music/topics', label: 'Topics' },
  { path: '/music/assets', label: 'Assets' },
  { path: '/music/rundown', label: 'Rundown' },
];

export default function MusicPageNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentIndex = MUSIC_PAGE_FLOW.findIndex(p => p.path === location.pathname);
  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? MUSIC_PAGE_FLOW[currentIndex - 1] : null;
  const next = currentIndex < MUSIC_PAGE_FLOW.length - 1 ? MUSIC_PAGE_FLOW[currentIndex + 1] : null;

  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      {prev ? (
        <button
          onClick={() => navigate(prev.path)}
          className="cp-glass flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105 group"
          style={{ borderColor: 'rgba(0,255,255,0.2)' }}
        >
          <ChevronLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
          <div className="text-left">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Previous</p>
            <p className="text-sm font-medium text-white">{prev.label}</p>
          </div>
        </button>
      ) : (
        <div />
      )}

      {/* Step indicator dots */}
      <div className="hidden md:flex items-center gap-1.5">
        {MUSIC_PAGE_FLOW.map((p, i) => (
          <button
            key={p.path}
            onClick={() => navigate(p.path)}
            className="transition-all"
            title={p.label}
          >
            <span
              className="block rounded-full"
              style={{
                width: i === currentIndex ? '24px' : '8px',
                height: '8px',
                background: i === currentIndex ? '#FF00FF' : i < currentIndex ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                boxShadow: i === currentIndex ? '0 0 8px rgba(255,0,255,0.5)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          </button>
        ))}
      </div>

      {next ? (
        <button
          onClick={() => navigate(next.path)}
          className="cp-glass flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105 group"
          style={{ borderColor: 'rgba(255,0,255,0.2)' }}
        >
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Next</p>
            <p className="text-sm font-medium text-white">{next.label}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-fuchsia-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}