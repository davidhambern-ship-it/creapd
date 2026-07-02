import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, ArrowLeft, ArrowRight, BookOpen, Languages, ChevronRight, BookMarked } from 'lucide-react';

const LEXICON_COLLECTIONS = [
  {
    tag: 'strongs-g',
    title: "Strong's Greek Dictionary",
    source: 'OpenScriptures',
    language: 'Koine Greek',
    description: 'Greek lexicon with Strong\'s numbering, transliterations, and KJV definitions.',
    color: 'primary'
  },
  {
    tag: 'strongs-h',
    title: "Strong's Hebrew Dictionary",
    source: 'OpenScriptures',
    language: 'Biblical Hebrew',
    description: 'Hebrew lexicon with Strong\'s numbering, transliterations, and definitions.',
    color: 'accent'
  },
  {
    tag: 'stepbible-greek_lexicon',
    title: 'STEP Bible Greek Lexicon',
    source: 'STEP Bible (CC BY 4.0)',
    language: 'Koine Greek',
    description: 'Translators Brief lexicon of Extended Strongs for Greek — morphology and full definitions.',
    color: 'primary'
  },
  {
    tag: 'stepbible-hebrew_lexicon',
    title: 'STEP Bible Hebrew Lexicon',
    source: 'STEP Bible (CC BY 4.0)',
    language: 'Biblical Hebrew',
    description: 'Translators Brief lexicon of Extended Strongs for Hebrew — morphology and full definitions.',
    color: 'accent'
  }
];

const PAGE_SIZE = 24;

export default function LexiconBrowser() {
  const [selectedTag, setSelectedTag] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const loadEntries = useCallback(async (tag, pageNum, search) => {
    setLoading(true);
    try {
      let results;
      const skip = pageNum * PAGE_SIZE;

      if (search) {
        // Use filter with a broad query — the SDK does not support full-text search,
        // so we fetch a larger batch and filter client-side by word/transliteration/meaning.
        results = await base44.entities.WordStudy.filter(
          { tags: tag },
          '-updated_date',
          500
        );
        const q = search.toLowerCase();
        const filtered = results.filter(w =>
          (w.word || '').toLowerCase().includes(q) ||
          (w.transliteration || '').toLowerCase().includes(q) ||
          (w.literal_meaning || '').toLowerCase().includes(q) ||
          (w.original_script || '').toLowerCase().includes(q)
        );
        const total = filtered.length;
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
        setEntries(filtered.slice(skip, skip + PAGE_SIZE));
      } else {
        results = await base44.entities.WordStudy.filter(
          { tags: tag },
          '-created_date',
          PAGE_SIZE + 1,
          skip
        );
        // If we got more than PAGE_SIZE, there's a next page
        const hasMore = results.length > PAGE_SIZE;
        setEntries(results.slice(0, PAGE_SIZE));
        // Estimate total pages — we can't get exact count easily, so estimate from this batch
        // For a rough count, we'll just track hasMore
        if (hasMore) {
          setTotalPages(pageNum + 2);
        } else {
          setTotalPages(pageNum + 1);
        }
      }
    } catch (err) {
      console.error('Lexicon load error:', err);
      setEntries([]);
      setTotalPages(1);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTag) {
      setPage(0);
      setActiveSearch('');
      setSearchQuery('');
      loadEntries(selectedTag, 0, '');
    }
  }, [selectedTag, loadEntries]);

  useEffect(() => {
    if (selectedTag) {
      loadEntries(selectedTag, page, activeSearch);
    }
  }, [page, selectedTag, activeSearch, loadEntries]);

  const handleSearch = () => {
    setPage(0);
    setActiveSearch(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(0);
  };

  // ─── Collection Grid ───
  if (!selectedTag) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BookMarked className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Lexicons & Dictionaries</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Browse the original-language lexicons imported into the library. Each entry includes transliteration, definitions, morphology, and Strong's numbering.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LEXICON_COLLECTIONS.map(lex => (
            <button
              key={lex.tag}
              onClick={() => setSelectedTag(lex.tag)}
              className="glass-panel p-5 hover:border-primary/40 transition-colors text-left group"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${lex.color === 'primary' ? 'bg-primary/20' : 'bg-accent/20'}`}>
                  <BookOpen className={`w-5 h-5 ${lex.color === 'primary' ? 'text-primary' : 'text-accent'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm group-hover:text-primary transition-colors">{lex.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lex.source} · {lex.language}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{lex.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Entry Browser ───
  const selectedLexicon = LEXICON_COLLECTIONS.find(l => l.tag === selectedTag);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedTag(null)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-secondary/30 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Lexicons
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">{selectedLexicon.title}</h3>
          <span className="text-xs text-muted-foreground">· {selectedLexicon.language}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search by word, transliteration, or meaning..."
            className="w-full glass-panel pl-9 pr-3 py-2 text-sm"
          />
        </div>
        {activeSearch && (
          <button
            onClick={handleClearSearch}
            className="px-3 py-2 rounded-lg text-xs bg-secondary/30 hover:bg-secondary/50 text-muted-foreground"
          >
            Clear
          </button>
        )}
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Languages className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No entries found{activeSearch ? ` for "${activeSearch}"` : '.'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map(w => (
              <Link
                key={w.id}
                to={`/spiritual/library/word/${w.id}`}
                className="glass-panel p-4 hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between mb-1">
                  {w.original_script ? (
                    <span className="text-xl font-serif" style={{ fontFamily: 'serif' }}>{w.original_script}</span>
                  ) : (
                    <span className="text-sm font-mono text-muted-foreground">—</span>
                  )}
                  {w.transliteration && (
                    <span className="text-xs text-muted-foreground italic">{w.transliteration}</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{w.word}</p>
                {w.literal_meaning && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{w.literal_meaning}</p>
                )}
                {w.grammar && (
                  <p className="text-xs text-muted-foreground/70 mt-1 font-mono">{w.grammar}</p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Page {page + 1}{totalPages > 1 ? ` of ~${totalPages}` : ''}
              {activeSearch && ` · ${entries.length} results on this page`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-secondary/30 hover:bg-secondary/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={entries.length < PAGE_SIZE || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-secondary/30 hover:bg-secondary/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}