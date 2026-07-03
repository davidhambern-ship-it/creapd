import React from 'react';
import { Link } from 'react-router-dom';
import { Search, FileInput, Pin, ExternalLink } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const NOTE_COLORS = [
  'bg-yellow-400/10 border-yellow-400/20',
  'bg-amber-400/10 border-amber-400/20',
  'bg-orange-400/10 border-orange-400/20',
  'bg-lime-400/10 border-lime-400/20',
  'bg-cyan-400/10 border-cyan-400/20',
];

export default function ResearchQuickDesk({ articles = [] }) {
  const needsResearch = articles.filter(a => a.status === 'needs_research').slice(0, 4);
  const rssNotes = articles.filter(a => a.status === 'pending').slice(0, 5);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-sky-400 rounded-full" />
          <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Research Quick Desk</h3>
        </div>
        <Link to="/research" className="text-[10px] font-mono text-sky-400/60 hover:text-sky-400">OPEN →</Link>
      </div>

      <div className="space-y-3 flex-1">
        <div>
          <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Search className="w-2.5 h-2.5" /> Needs Research
          </p>
          <div className="space-y-1">
            {needsResearch.length > 0 ? needsResearch.map(item => (
              <Link key={item.id} to={`/story/${item.id}`}
                className="block rounded-md bg-white/[0.03] border border-white/[0.05] px-2 py-1.5 hover:bg-white/[0.06] transition-colors">
                <p className="text-[10px] text-white/70 leading-tight line-clamp-2">{item.title}</p>
                <p className="text-[8px] font-mono text-white/30 mt-0.5">{item.source_name} · {timeAgo(item.published_at || item.created_date)}</p>
              </Link>
            )) : (
              <p className="text-[10px] text-white/25 font-mono py-2">Nothing pending</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Pin className="w-2.5 h-2.5" /> RSS Feed Notes
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {rssNotes.slice(0, 4).map((note, i) => (
              <Link key={note.id} to={`/story/${note.id}`}
                className={`group block rounded-sm border ${NOTE_COLORS[i % NOTE_COLORS.length]} p-1.5 transition-all hover:scale-[1.03]`}
                style={{ transform: `rotate(${(i % 3 - 1) * 1.5}deg)` }}>
                <p className="text-[8px] font-mono text-white/40 truncate">{note.source_name}</p>
                <p className="text-[9px] text-white/70 leading-tight line-clamp-2 mt-0.5">{note.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Link to="/import" className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-sky-400/10 hover:bg-sky-400/20 border border-sky-400/20 transition-colors">
        <FileInput className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider">Import Station</span>
        <ExternalLink className="w-2.5 h-2.5 text-sky-400/50" />
      </Link>
    </div>
  );
}