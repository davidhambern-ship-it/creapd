import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X, ArrowRight, Home, Map, Radio, Mic2, FlaskConical,
} from 'lucide-react';
import { PRODUCER_NAV_SECTIONS, PRODUCTION_MODES } from '@/lib/producerNav';

export default function PodcastProductionMap({ open, onClose }) {
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const formatIcons = { radio: Radio, podcast: Mic2, research: FlaskConical };

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close Production Map"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto border-l border-white/10 bg-[#09070d]/95 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#09070d]/90 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-orange-300">
                <Map className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">Production Map</span>
              </div>
              <h2 className="mt-1 font-heading text-xl font-bold text-white">Podcast Room</h2>
              <p className="mt-1 text-xs text-white/45">Jump anywhere without covering the room with permanent navigation.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Close Production Map"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5">
          <Link
            to="/news/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl border border-orange-300/20 bg-gradient-to-r from-orange-400/10 via-fuchsia-400/[0.07] to-violet-400/[0.07] p-4 text-white transition hover:border-orange-300/35"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-orange-300/20 bg-orange-400/10">
              <Home className="h-4 w-4 text-orange-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-semibold">Podcast Home</p>
              <p className="text-[11px] text-white/45">Return to the room and your Producer Guide.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/35" />
          </Link>

          {PRODUCER_NAV_SECTIONS.map((section) => (
            <section key={section.label}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{section.label}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {section.items
                  .filter(item => item.path !== '/news/dashboard')
                  .map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path ||
                      (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`group flex items-center gap-3 rounded-xl border p-3 transition ${active
                          ? 'border-fuchsia-300/35 bg-fuchsia-400/10 text-white'
                          : 'border-white/[0.07] bg-white/[0.025] text-white/70 hover:border-white/15 hover:bg-white/[0.05] hover:text-white'}`}
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/25">
                          <Icon className={`h-3.5 w-3.5 ${active ? 'text-fuchsia-300' : 'text-orange-300/75'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{item.label}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
                      </Link>
                    );
                  })}
              </div>
            </section>
          ))}

          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Switch Format</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCTION_MODES.map((mode) => {
                const Icon = formatIcons[mode.key] || mode.icon;
                const active = mode.key === 'podcast';
                return (
                  <Link
                    key={mode.key}
                    to={mode.path}
                    onClick={onClose}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition ${active
                      ? 'border-fuchsia-300/35 bg-fuchsia-400/10 text-white'
                      : 'border-white/[0.07] bg-white/[0.025] text-white/55 hover:border-white/15 hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-fuchsia-300' : 'text-white/45'}`} />
                    {mode.label}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
