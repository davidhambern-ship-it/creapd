import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, FileText, Package, Palette, Tv, LayoutTemplate, Download, Briefcase, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const SEARCH_SOURCES = [
  { entity: 'Article', label: 'Stories', icon: FileText, path: '/news/queue', titleField: 'title', subField: 'source_name' },
  { entity: 'Briefing', label: 'Briefings', icon: FileText, path: '/news/brief', titleField: 'title', subField: 'date' },
  { entity: 'ProductionPackage', label: 'Packages', icon: Package, path: '/news/production', titleField: 'story_summary', subField: 'tone' },
  { entity: 'BrandProfile', label: 'Brands', icon: Palette, path: '/news/brands', titleField: 'brand_name', subField: 'organization_name' },
  { entity: 'ShowProfile', label: 'Shows', icon: Tv, path: '/news/shows', titleField: 'show_name', subField: 'host_names' },
  { entity: 'BriefingTemplate', label: 'Templates', icon: LayoutTemplate, path: '/news/templates', titleField: 'name', subField: 'template_key' },
  { entity: 'ExportProfile', label: 'Exports', icon: Download, path: '/news/export', titleField: 'name', subField: 'format' },
  { entity: 'ImageAsset', label: 'Media', icon: ImageIcon, path: '/news/images', titleField: 'title', subField: 'tags' },
  { entity: 'Organization', label: 'Organizations', icon: Briefcase, path: '/news/organizations', titleField: 'name', subField: 'industry' },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({});
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const searches = SEARCH_SOURCES.map(async (src) => {
        try {
          const items = await base44.entities[src.entity].list('-created_date', 20);
          const filtered = items.filter(item => {
            const title = (item[src.titleField] || '').toLowerCase();
            const sub = (item[src.subField] || '').toLowerCase();
            return title.includes(query.toLowerCase()) || sub.includes(query.toLowerCase());
          }).slice(0, 5);
          return { source: src, items: filtered };
        } catch {
          return { source: src, items: [] };
        }
      });
      const allResults = await Promise.all(searches);
      const grouped = {};
      allResults.forEach(r => { if (r.items.length > 0) grouped[r.source.entity] = { source: r.source, items: r.items }; });
      setResults(grouped);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const totalResults = Object.values(results).reduce((sum, r) => sum + r.items.length, 0);

  return (
    <div className="relative flex-1 max-w-md" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search stories, briefs, packages, brands..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full h-8 pl-8 pr-7 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-berna-purple/40 focus:bg-white/[0.06] transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults({}); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-10 left-0 right-0 glass-panel-navy border border-white/[0.08] rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-berna-purple animate-spin" />
              <span className="text-xs text-muted-foreground">Searching...</span>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-6 text-center">
              <Search className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No results for "{query}"</p>
            </div>
          ) : (
            <div className="py-1">
              {Object.values(results).map(({ source, items }) => (
                <div key={source.entity}>
                  <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-white/[0.02]">
                    <source.icon className="w-3 h-3" />
                    {source.label}
                    <span className="text-muted-foreground/60">({items.length})</span>
                  </div>
                  {items.map(item => (
                    <Link
                      key={item.id}
                      to={source.path}
                      onClick={() => { setOpen(false); setQuery(''); }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors"
                    >
                      <source.icon className="w-3.5 h-3.5 text-berna-purple/60 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white truncate">{item[source.titleField] || 'Untitled'}</p>
                        {item[source.subField] && <p className="text-[10px] text-muted-foreground truncate">{item[source.subField]}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}