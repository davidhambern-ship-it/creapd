import React from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function BroadcastReadyPanel({ packages = [] }) {
  const ready = packages.filter(p => p.status === 'completed' || p.status === 'ready');
  const inProgress = packages.filter(p => p.status === 'in_progress' || p.status === 'rendering');
  const needsAttention = packages.filter(p => p.status === 'failed' || p.status === 'pending');

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-berna-orange rounded-full" />
          <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Broadcast Ready</h3>
        </div>
        <Link to="/production" className="text-[10px] font-mono text-berna-orange/60 hover:text-berna-orange">PRODUCE →</Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-emerald-400/[0.06] border border-emerald-400/15 p-2 text-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
          <p className="text-sm font-mono font-bold text-emerald-400">{ready.length}</p>
          <p className="text-[8px] font-mono text-white/40 uppercase">Ready</p>
        </div>
        <div className="rounded-lg bg-amber-400/[0.06] border border-amber-400/15 p-2 text-center">
          <Clock className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
          <p className="text-sm font-mono font-bold text-amber-400">{inProgress.length}</p>
          <p className="text-[8px] font-mono text-white/40 uppercase">Building</p>
        </div>
        <div className="rounded-lg bg-red-400/[0.06] border border-red-400/15 p-2 text-center">
          <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-0.5" />
          <p className="text-sm font-mono font-bold text-red-400">{needsAttention.length}</p>
          <p className="text-[8px] font-mono text-white/40 uppercase">Issues</p>
        </div>
      </div>

      <div className="space-y-1.5 flex-1">
        {packages.slice(0, 4).map((pkg, i) => (
          <Link key={pkg.id || i} to="/production"
            className="block rounded-md bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5 hover:bg-white/[0.06] transition-colors">
            <div className="flex items-center gap-2">
              <Package className={`w-3 h-3 flex-shrink-0 ${
                pkg.status === 'completed' ? 'text-emerald-400' :
                pkg.status === 'in_progress' ? 'text-amber-400' :
                'text-white/40'
              }`} />
              <p className="text-[10px] text-white/70 truncate flex-1">{pkg.story_summary || 'Production package'}</p>
              <span className={`text-[8px] font-mono uppercase ${
                pkg.status === 'completed' ? 'text-emerald-400' :
                pkg.status === 'in_progress' ? 'text-amber-400' :
                'text-white/30'
              }`}>{pkg.status}</span>
            </div>
          </Link>
        ))}
        {packages.length === 0 && (
          <div className="text-center py-4">
            <Package className="w-6 h-6 text-white/10 mx-auto mb-1" />
            <p className="text-[10px] text-white/30 font-mono">No packages in production</p>
          </div>
        )}
      </div>

      <Link to="/export" className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-berna-orange/10 hover:bg-berna-orange/20 border border-berna-orange/20 transition-colors">
        <span className="text-[10px] font-mono text-berna-orange uppercase tracking-wider">Export Center →</span>
      </Link>
    </div>
  );
}