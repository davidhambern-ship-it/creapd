import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagInput({ tags, onChange, placeholder, suggestions = [] }) {
  const [input, setInput] = useState('');

  const parsed = Array.isArray(tags) ? tags : (() => { try { return JSON.parse(tags || '[]'); } catch { return []; } })();
  const safeTags = parsed;

  const addTag = (val) => {
    const trimmed = (val || input).trim();
    if (trimmed && !safeTags.includes(trimmed)) {
      onChange([...safeTags, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tag) => {
    onChange(safeTags.filter(t => t !== tag));
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="flex-1 h-9 rounded-md border border-input bg-white/[0.03] px-3 py-1 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={() => addTag()}
          className="px-3 h-9 rounded-md bg-berna-purple/20 border border-berna-purple/30 text-berna-purple hover:bg-berna-purple/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {safeTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {safeTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-berna-purple/10 border border-berna-purple/20 text-xs text-berna-purple">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.filter(s => !safeTags.includes(s)).slice(0, 6).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] text-muted-foreground hover:text-white hover:border-white/[0.12] transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}