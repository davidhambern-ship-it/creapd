import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Package, CalendarDays, Sparkles, Layers, Clock } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ProducerDesk({ briefing, packages = [], exports = [] }) {
  return (
    <div className="relative rounded-xl border border-amber-400/15 bg-gradient-to-b from-zinc-800/50 to-zinc-900/70 overflow-hidden glow-orange">
      {/* Desk surface glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-amber-400/[0.04] to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-amber-400 rounded-full shadow-glow-orange" />
          <div>
            <h3 className="text-sm font-mono font-bold text-white/90 tracking-wider uppercase">Producer Desk</h3>
            <p className="text-[9px] font-mono text-amber-400/50 uppercase tracking-wider">Hero Asset · Command Center</p>
          </div>
        </div>
        {briefing && <StatusBadge status={briefing.status} />}
      </div>

      {/* Today's Brief — briefing packet feel */}
      <div className="p-4 border-b border-white/[0.04]">
        <Link to="/brief" className="group block rounded-lg border border-amber-400/10 bg-gradient-to-br from-amber-400/[0.04] to-transparent p-3 hover:border-amber-400/20 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono text-amber-400/70 uppercase tracking-wider">Today's Brief — Briefing Packet</span>
            <Sparkles className="w-3 h-3 text-berna-purple ml-auto" />
          </div>
          {briefing ? (
            <>
              <p className="text-sm text-white/90 font-medium mb-1">{briefing.theme || "Today's Brief"}</p>
              <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{briefing.estimated_read_time || '12 min read'}</span>
                <span className="flex items-center gap-1"><Layers className="w-2.5 h-2.5" />{briefing.sections_count || 0} sections</span>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-white/30">No brief generated yet — click to generate</p>
          )}
        </Link>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
        <Link to="/production" className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] hover:border-berna-orange/20 transition-all">
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5 text-berna-orange" />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Current Rundown</span>
          </div>
          {packages.length > 0 ? (
            <>
              <p className="text-xs text-white/80 font-medium line-clamp-1">{packages[0].story_summary || 'Active package'}</p>
              <p className="text-[10px] text-white/40 mt-1">{packages.length} package{packages.length !== 1 ? 's' : ''} in progress</p>
            </>
          ) : (
            <p className="text-[11px] text-white/30">No active packages</p>
          )}
        </Link>

        <Link to="/export" className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] hover:border-berna-emerald/20 transition-all">
          <div className="flex items-center gap-1.5 mb-2">
            <Download className="w-3.5 h-3.5 text-berna-emerald" />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Latest Export</span>
          </div>
          {exports.length > 0 ? (
            <>
              <p className="text-xs text-white/80 font-medium line-clamp-1">{exports[0].file_name || `${exports[0].format} export`}</p>
              <p className="text-[10px] text-white/40 mt-1">{exports[0].format?.toUpperCase()} · {exports[0].status}</p>
            </>
          ) : (
            <p className="text-[11px] text-white/30">No exports yet</p>
          )}
        </Link>

        <Link to="/planner" className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] hover:border-berna-purple/20 transition-all">
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Weekly Plan</span>
          </div>
          <p className="text-xs text-white/80 font-medium">Next week's themes</p>
          <p className="text-[10px] text-white/40 mt-1">Plan & schedule</p>
        </Link>
      </div>
    </div>
  );
}