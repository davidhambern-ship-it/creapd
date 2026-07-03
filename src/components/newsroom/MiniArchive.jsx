import React from 'react';
import { Link } from 'react-router-dom';
import { Archive, Clock } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MiniArchive({ articles = [] }) {
  const archived = articles.filter(a =>
    a.status === 'published' || a.status === 'archived'
  ).slice(0, 6);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-purple-400 rounded-full" />
          <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Mini Archive</h3>
        </div>
        <Link to="/library" className="text-[10px] font-mono text-purple-400/60 hover:text-purple-400">ALL →</Link>
      </div>

      <div className="space-y-1.5 flex-1">
        {archived.length > 0 ? archived.map((article, i) => (
          <Link key={article.id} to={`/story/${article.id}`}
            className="group flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.04] px-2 py-1.5 hover:bg-white/[0.05] transition-colors">
            <Archive className="w-3 h-3 text-purple-400/40 group-hover:text-purple-400/70 flex-shrink-0" />
            <p className="text-[10px] text-white/60 group-hover:text-white/80 truncate flex-1">{article.title}</p>
            <span className="text-[8px] font-mono text-white/30 flex items-center gap-0.5 flex-shrink-0">
              <Clock className="w-2 h-2" />
              {timeAgo(article.published_at || article.created_date)}
            </span>
          </Link>
        )) : (
          <div className="text-center py-6">
            <Archive className="w-6 h-6 text-white/10 mx-auto mb-1" />
            <p className="text-[10px] text-white/30 font-mono">No archived stories yet</p>
          </div>
        )}
      </div>

      <Link to="/archive" className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-purple-400/10 hover:bg-purple-400/20 border border-purple-400/20 transition-colors">
        <Archive className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Archive Department</span>
      </Link>
    </div>
  );
}