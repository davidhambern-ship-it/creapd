import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Package, CalendarDays } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ProducerDesk({ briefing, packages = [], exports = [] }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Producer Desk</h3>
        </div>
        {briefing && <StatusBadge status={briefing.status} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 p-4">
        <Link to="/brief" className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Today's Rundown</span>
          </div>
          {briefing ? (
            <>
              <p className="text-xs text-white/80 font-medium mb-1">{briefing.theme || "Today's Brief"}</p>
              <p className="text-[10px] text-white/40">{briefing.estimated_read_time || '12 min read'}</p>
            </>
          ) : (
            <p className="text-[11px] text-white/30">No brief generated</p>
          )}
        </Link>

        <Link to="/production" className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5 text-berna-orange" />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Production Folder</span>
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

        <Link to="/export" className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors">
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

        <Link to="/planner" className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors">
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