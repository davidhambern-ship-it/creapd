import React from 'react';
import { Link } from 'react-router-dom';
import { Pin } from 'lucide-react';

const NOTE_COLORS = [
  'bg-yellow-400/10 border-yellow-400/20',
  'bg-amber-400/10 border-amber-400/20',
  'bg-orange-400/10 border-orange-400/20',
  'bg-lime-400/10 border-lime-400/20',
  'bg-cyan-400/10 border-cyan-400/20',
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function StickyNoteBoard({ articles = [] }) {
  const notes = articles.filter(a => a.status === 'pending').slice(0, 8);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-800/30 to-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pin className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">RSS Feed Board</h3>
        </div>
        <Link to="/queue" className="text-[10px] font-mono text-white/40 hover:text-white/70">ALL →</Link>
      </div>
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-white/30 font-mono">No new feed items</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {notes.map((note, i) => (
            <Link
              key={note.id}
              to={`/story/${note.id}`}
              className={`group block rounded-sm border ${NOTE_COLORS[i % NOTE_COLORS.length]} p-2.5 transition-all hover:scale-[1.03] hover:shadow-lg`}
              style={{ transform: `rotate(${(i % 3 - 1) * 1.5}deg)` }}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[8px] font-mono text-white/40 truncate flex-1">{note.source_name}</span>
                <span className="text-[8px] font-mono text-white/30">{timeAgo(note.published_at || note.created_date)}</span>
              </div>
              <p className="text-[10px] text-white/80 leading-tight line-clamp-3 mb-1.5">{note.title}</p>
              {note.category && (
                <span className="inline-block text-[7px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                  {note.category.replace(/_/g, ' ')}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}