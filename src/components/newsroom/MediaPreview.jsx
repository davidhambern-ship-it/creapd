import React from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, Video, Film } from 'lucide-react';

export default function MediaPreview({ images = [] }) {
  const recent = images.slice(0, 6);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-400 rounded-full" />
          <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Media Preview</h3>
        </div>
        <Link to="/images" className="text-[10px] font-mono text-emerald-400/60 hover:text-emerald-400">VAULT →</Link>
      </div>

      {recent.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 flex-1">
          {recent.map((img, i) => (
            <Link key={img.id || i} to="/images"
              className="group relative rounded-lg overflow-hidden border border-white/[0.06] bg-black/40 aspect-square hover:border-white/20 transition-all">
              {img.file_url ? (
                <img src={img.file_url} alt={img.title || 'media'} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                <p className="text-[8px] font-mono text-white/70 truncate">{img.title || 'Asset'}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <Film className="w-8 h-8 text-white/10 mb-2" />
          <p className="text-[10px] text-white/30 font-mono">No media yet</p>
          <Link to="/images" className="mt-2 text-[10px] font-mono text-emerald-400/60 hover:text-emerald-400">Generate →</Link>
        </div>
      )}

      <div className="flex gap-1.5 mt-3">
        <Link to="/images" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-colors">
          <ImageIcon className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-mono text-white/50">Images</span>
        </Link>
        <Link to="/images" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-colors">
          <Video className="w-3 h-3 text-sky-400" />
          <span className="text-[9px] font-mono text-white/50">Video</span>
        </Link>
      </div>
    </div>
  );
}