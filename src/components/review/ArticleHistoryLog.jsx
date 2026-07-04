import React from 'react';
import {
  Download, Filter, Sparkles, Video, CheckCircle, XCircle,
  Edit3, AlertTriangle, Mic, AlertCircle, FileText
} from 'lucide-react';

const eventConfig = {
  fetched: { icon: Download, color: 'text-blue-400', label: 'Fetched' },
  sifted: { icon: Filter, color: 'text-cyan-400', label: 'Sifted' },
  reviewed: { icon: Sparkles, color: 'text-berna-purple', label: 'AI Reviewed' },
  processed: { icon: Video, color: 'text-berna-orange', label: 'Processed' },
  approved: { icon: CheckCircle, color: 'text-berna-emerald', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-400', label: 'Rejected' },
  edited: { icon: Edit3, color: 'text-amber-400', label: 'Edited' },
  flagged: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Flagged' },
  transcription_started: { icon: Mic, color: 'text-berna-purple', label: 'Transcription Started' },
  transcription_failed: { icon: AlertCircle, color: 'text-red-400', label: 'Transcription Failed' },
  promoted: { icon: FileText, color: 'text-berna-emerald', label: 'Promoted to Briefing' },
};

export default function ArticleHistoryLog({ historyStr }) {
  let history = [];
  try { history = historyStr ? JSON.parse(historyStr) : []; } catch (e) { history = []; }

  if (history.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-3">No processing history yet</p>;
  }

  return (
    <div className="space-y-0">
      {history.map((entry, idx) => {
        const cfg = eventConfig[entry.event] || { icon: Sparkles, color: 'text-muted-foreground', label: entry.event };
        const Icon = cfg.icon;
        const isLast = idx === history.length - 1;
        return (
          <div key={idx} className="flex gap-2.5 relative">
            {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-white/[0.08]" />}
            <div className={`flex-shrink-0 w-[22px] h-[22px] rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center ${cfg.color}`}>
              <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              {entry.details && <p className="text-[10px] text-white/60 mt-0.5">{entry.details}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}