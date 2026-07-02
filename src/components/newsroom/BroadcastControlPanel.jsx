import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Eye, Mic, ImageIcon, Download, Send, CalendarClock, Power } from 'lucide-react';

const CONTROLS = [
  { icon: Layers, label: 'BUILD', sub: 'Production', path: '/production', color: 'text-berna-purple', glow: 'bg-berna-purple/20' },
  { icon: Eye, label: 'PREVIEW', sub: 'Package', path: '/production', color: 'text-sky-400', glow: 'bg-sky-400/20' },
  { icon: Mic, label: 'VOICE', sub: 'Generate', path: '/production', color: 'text-berna-orange', glow: 'bg-amber-400/20' },
  { icon: ImageIcon, label: 'VISUALS', sub: 'Generate', path: '/images', color: 'text-emerald-400', glow: 'bg-emerald-400/20' },
  { icon: Download, label: 'EXPORT', sub: 'Package', path: '/export', color: 'text-blue-400', glow: 'bg-blue-400/20' },
  { icon: Send, label: 'PUBLISH', sub: 'Deliver', path: '/export', color: 'text-cyan-400', glow: 'bg-cyan-400/20' },
  { icon: CalendarClock, label: 'SCHEDULE', sub: 'Broadcast', path: '/planner', color: 'text-purple-400', glow: 'bg-purple-400/20' },
];

export default function BroadcastControlPanel({ packages = [] }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/80 to-black/90 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-black/30">
        <div className="flex items-center gap-2">
          <Power className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-white/70 tracking-wider uppercase">Broadcast Console</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-mono text-emerald-400">SYSTEM READY</span>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 p-3">
        {CONTROLS.map((ctrl, i) => (
          <Link key={i} to={ctrl.path} className="group">
            <div className="relative rounded-lg border border-white/[0.08] bg-black/40 p-3 text-center transition-all hover:scale-[1.03] hover:border-white/20 overflow-hidden">
              <div className={`absolute inset-0 ${ctrl.glow} opacity-0 group-hover:opacity-100 transition-opacity blur-md`} />
              <div className="relative">
                <div className={`w-8 h-8 mx-auto mb-1.5 rounded-full ${ctrl.glow} flex items-center justify-center`}>
                  <ctrl.icon className={`w-4 h-4 ${ctrl.color}`} />
                </div>
                <p className={`text-[10px] font-mono font-bold tracking-wider ${ctrl.color}`}>{ctrl.label}</p>
                <p className="text-[8px] font-mono text-white/30 uppercase">{ctrl.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {packages.length > 0 && (
        <div className="px-4 py-2 border-t border-white/[0.06] bg-black/20">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-white/40">ACTIVE:</span>
            <span className="text-white/60 truncate">{packages[0].story_summary || 'Package in progress'}</span>
          </div>
        </div>
      )}
    </div>
  );
}