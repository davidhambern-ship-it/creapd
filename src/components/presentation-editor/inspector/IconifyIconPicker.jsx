import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from './shared';
import { Loader2, Search, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const POPULAR_SETS = [
  { prefix: 'mdi', name: 'Material Design' },
  { prefix: 'bi', name: 'Bootstrap' },
  { prefix: 'lucide', name: 'Lucide' },
  { prefix: 'fa-solid', name: 'Font Awesome' },
  { prefix: 'heroicons', name: 'Heroicons' },
  { prefix: 'tabler', name: 'Tabler' },
  { prefix: 'ph', name: 'Phosphor' },
  { prefix: 'fluent-emoji-flat', name: 'Fluent Emoji' },
  { prefix: 'noto', name: 'Noto Emoji' },
  { prefix: 'carbon', name: 'IBM Carbon' },
  { prefix: 'mingcute', name: 'MingCute' },
  { prefix: 'solar', name: 'Solar' },
];

const SUGGESTIONS = ['home', 'star', 'heart', 'bell', 'user', 'check', 'arrow-right', 'calendar', 'globe', 'play', 'music', 'image'];

export default function IconifyIconPicker({ colorScheme, onInsert }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [inserting, setInserting] = useState(false);
  const debounceRef = useRef(null);

  const buildIconUrl = (iconName) => {
    const color = colorScheme?.titleColor || '#ffffff';
    const colorParam = color ? `?color=${encodeURIComponent(color)}` : '';
    return `https://api.iconify.design/${iconName}.svg${colorParam}`;
  };

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=32`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.icons || []);
    } catch {
      setError('Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const insertIcon = async () => {
    if (!selected) return;
    setInserting(true);
    setError(null);
    try {
      const url = buildIconUrl(selected);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch failed');
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const file = new File([blob], `icon-${selected.replace('/', '-')}.svg`, { type: 'image/svg+xml' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onInsert(file_url);
      setSelected(null);
    } catch (err) {
      setError(err.message || 'Failed to insert icon');
    } finally {
      setInserting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Field label="Search Icons (200K+)">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. bell, home, star..."
            className="w-full text-xs bg-background border border-border rounded-md pl-7 pr-2 py-1.5 h-8"
          />
        </div>
      </Field>

      {!query && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">Popular icon sets:</p>
          <div className="grid grid-cols-3 gap-1">
            {POPULAR_SETS.slice(0, 6).map(s => (
              <Button key={s.prefix} variant="outline" size="sm"
                className="h-6 text-[9px] px-1"
                onClick={() => setQuery(s.prefix)}>
                {s.name}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">Try:</p>
          <div className="flex flex-wrap gap-1">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setQuery(s)}
                className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted text-muted-foreground">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto">
          {results.map(icon => (
            <button key={icon}
              onClick={() => setSelected(icon)}
              className={`flex items-center justify-center aspect-square rounded-md border transition ${
                selected === icon ? 'border-primary bg-primary/10' : 'border-border bg-muted/30 hover:bg-muted/50'
              }`}>
              <img src={buildIconUrl(icon)} alt={icon} className="w-6 h-6" />
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <p className="text-[10px] text-muted-foreground text-center py-2">No icons found</p>
      )}

      {selected && (
        <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
          <img src={buildIconUrl(selected)} alt={selected} className="w-8 h-8" />
          <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{selected}</span>
          <Button variant="default" size="sm" className="h-7 text-[10px]" disabled={inserting} onClick={insertIcon}>
            {inserting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {inserting ? '...' : 'Insert'}
          </Button>
        </div>
      )}
    </div>
  );
}