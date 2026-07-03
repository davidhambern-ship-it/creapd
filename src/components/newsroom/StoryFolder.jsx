import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, FolderOpen, FileText, Search, ImageIcon, Mic, Package, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { key: 'summary', label: 'Summary', icon: FileText },
  { key: 'research', label: 'Research', icon: Search },
  { key: 'sources', label: 'Sources', icon: FileText },
  { key: 'script', label: 'Script', icon: FileText },
  { key: 'visuals', label: 'Visuals', icon: ImageIcon },
  { key: 'voiceover', label: 'Voice', icon: Mic },
];

export default function StoryFolder({ article }) {
  const [open, setOpen] = useState(false);
  if (!article) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 transition-colors ${open ? 'bg-zinc-800/60 border-white/15' : 'bg-zinc-800/30 border-white/[0.08] hover:bg-zinc-800/40'}`}
          style={{ marginLeft: '8px', width: 'calc(100% - 8px)' }}
        >
          {open ? <FolderOpen className="w-4 h-4 text-amber-400" /> : <Folder className="w-4 h-4 text-amber-400/60" />}
          <span className="text-xs text-white/80 truncate flex-1">{article.title}</span>
          <span className="text-[9px] font-mono text-white/30">{article.source_name}</span>
          <ChevronRight className={`w-3 h-3 text-white/30 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="rounded-b-lg border border-white/[0.08] bg-zinc-800/40 p-3 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SECTIONS.map(section => (
              <Link
                key={section.key}
                to={`/story/${article.id}`}
                className="flex items-center gap-2 p-2 rounded-md bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors group"
              >
                <section.icon className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60" />
                <span className="text-[10px] text-white/60 group-hover:text-white/80">{section.label}</span>
              </Link>
            ))}
          </div>
          {article.summary && (
            <div className="mt-2 p-2 rounded-md bg-black/20 border border-white/[0.04]">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">Summary</p>
              <p className="text-[11px] text-white/60 leading-snug line-clamp-3">{article.summary}</p>
            </div>
          )}
          <Link
            to={`/story/${article.id}`}
            className="mt-2 flex items-center justify-center gap-1 py-1.5 rounded-md bg-berna-purple/10 hover:bg-berna-purple/20 border border-berna-purple/20 transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-[10px] font-mono text-berna-purple uppercase tracking-wider">Open Full Folder</span>
          </Link>
        </div>
      )}
    </div>
  );
}