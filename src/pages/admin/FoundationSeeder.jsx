import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Loader2, BookOpen, CheckCircle2, AlertCircle, Database, RefreshCw,
  FileText, ChevronRight, ExternalLink
} from 'lucide-react';

const SEED_SOURCES = [
  {
    key: 'quran',
    name: 'The Quran',
    tradition: 'Islam',
    provider: 'Al Quran Cloud API',
    providerUrl: 'https://alquran.cloud',
    description: '114 surahs, 6236 ayahs — Saheeh International English translation',
    license: 'Official Free Access',
    color: 'text-berna-emerald',
    bgColor: 'bg-berna-emerald/10',
    borderColor: 'border-berna-emerald/30'
  },
  {
    key: 'bible',
    name: 'The Bible',
    tradition: 'Christianity',
    provider: 'bible-api.com',
    providerUrl: 'https://bible-api.com',
    description: 'King James Version — select books to seed',
    license: 'Public Domain',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30'
  }
];

const BIBLE_BOOKS = [
  { key: 'john', name: 'John', chapters: 21 },
  { key: 'genesis', name: 'Genesis', chapters: 50 },
  { key: 'psalms', name: 'Psalms', chapters: 150 },
  { key: 'matthew', name: 'Matthew', chapters: 28 },
  { key: 'romans', name: 'Romans', chapters: 16 },
  { key: 'mark', name: 'Mark', chapters: 16 },
  { key: 'luke', name: 'Luke', chapters: 24 },
  { key: 'acts', name: 'Acts', chapters: 28 },
  { key: 'exodus', name: 'Exodus', chapters: 40 },
  { key: 'isaiah', name: 'Isaiah', chapters: 66 },
  { key: 'proverbs', name: 'Proverbs', chapters: 31 },
  { key: 'revelation', name: 'Revelation', chapters: 22 }
];

export default function FoundationSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [textWorks, setTextWorks] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedBooks, setSelectedBooks] = useState(['john', 'genesis', 'psalms', 'matthew', 'romans']);

  const loadTextWorks = async () => {
    setLoadingStats(true);
    try {
      const works = await base44.entities.TextWork.filter({ is_foundation: true }, '-updated_date', 50);
      setTextWorks(works || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { loadTextWorks(); }, []);

  const handleSeed = async (source) => {
    setSeeding(true);
    setError(null);
    setResult(null);
    try {
      const payload = { source };
      if (source === 'bible') payload.books = selectedBooks;
      const resp = await base44.functions.invoke('seedFoundationText', payload);
      setResult(resp.data);
      await loadTextWorks();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  const toggleBook = (bookKey) => {
    setSelectedBooks(prev =>
      prev.includes(bookKey) ? prev.filter(b => b !== bookKey) : [...prev, bookKey]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link to="/admin/world-scripture-registry" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="w-3 h-3" />
            <span>Foundation Text Seeder</span>
          </div>
          <div className="flex items-center gap-3">
            <Database className="w-7 h-7 text-primary" />
            <div>
              <h1 className="font-heading font-bold text-2xl">Foundation Text Seeder</h1>
              <p className="text-sm text-muted-foreground">
                Import structured scripture data into the local database — every verse stored as its own row
              </p>
            </div>
          </div>
        </div>

        {/* Seeded Texts Status */}
        <div className="glass-panel p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Seeded Foundation Texts
            </h2>
            <Button size="sm" variant="ghost" onClick={loadTextWorks} disabled={loadingStats}>
              {loadingStats ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </Button>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : textWorks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No foundation texts seeded yet. Use the seeder below to import.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {textWorks.map(work => (
                <div key={work.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-heading font-semibold">{work.title}</h3>
                      <p className="text-xs text-muted-foreground">{work.source_provider}</p>
                    </div>
                    {work.seeding_status === 'seeded' ? (
                      <span className="flex items-center gap-1 text-xs text-berna-emerald">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Seeded
                      </span>
                    ) : work.seeding_status === 'seeding' ? (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Seeding
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{work.seeding_status}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Chapters: </span>
                      <span className="font-medium">{work.total_chapters || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verses: </span>
                      <span className="font-medium">{work.total_verses || 0}</span>
                    </div>
                  </div>
                  {work.library_text_id && (
                    <Link
                      to={`/spiritual/library/reader/${work.library_text_id}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <BookOpen className="w-3 h-3" /> Open in Reader
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="glass-panel p-4 mb-6 border-l-4 border-l-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="glass-panel p-4 mb-6 border-l-4 border-l-berna-emerald">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-berna-emerald" />
              <h3 className="font-heading font-semibold">Seeding Complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Chapters Created</p>
                <p className="font-heading font-bold text-lg text-berna-emerald">{result.chapters_created}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verses Created</p>
                <p className="font-heading font-bold text-lg text-berna-emerald">{result.verses_created}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="font-heading font-bold text-lg capitalize">{result.source}</p>
              </div>
            </div>
            {result.library_text_id && (
              <Link to={`/spiritual/library/reader/${result.library_text_id}`}>
                <Button size="sm" className="mt-3">
                  <BookOpen className="w-3.5 h-3.5 mr-1" /> Open in Reader
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Seeder Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SEED_SOURCES.map(source => (
            <div key={source.key} className={`glass-panel p-5 border ${source.borderColor}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`font-heading font-bold text-lg ${source.color}`}>{source.name}</h3>
                  <p className="text-xs text-muted-foreground">{source.tradition}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs ${source.bgColor} ${source.color}`}>{source.license}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{source.description}</p>
              <a
                href={source.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4"
              >
                <FileText className="w-3 h-3" /> {source.provider}
                <ExternalLink className="w-3 h-3" />
              </a>

              {source.key === 'bible' && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Select Books to Seed:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BIBLE_BOOKS.map(book => (
                      <button
                        key={book.key}
                        onClick={() => toggleBook(book.key)}
                        className={`px-2 py-1 rounded-md text-xs transition-all ${
                          selectedBooks.includes(book.key)
                            ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                            : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                        }`}
                      >
                        {book.name} ({book.chapters})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleSeed(source.key)}
                disabled={seeding || (source.key === 'bible' && selectedBooks.length === 0)}
                className="w-full"
              >
                {seeding ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding...</>
                ) : (
                  <><Database className="w-4 h-4 mr-2" /> Seed {source.name}</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {source.key === 'quran'
                  ? '~15 seconds — fetches all 114 surahs in one API call'
                  : '~1-3 minutes depending on books selected'}
              </p>
            </div>
          ))}
        </div>

        {/* Schema Info */}
        <div className="glass-panel p-5 mt-8">
          <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" /> Data Schema (6 Layers)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              { name: 'Tradition', desc: 'Faith tradition (Christianity, Islam, etc.)' },
              { name: 'TextWork', desc: 'A sacred text (The Bible, The Quran)' },
              { name: 'EditionTranslation', desc: 'A specific translation/edition' },
              { name: 'Division', desc: 'Major division (Old/New Testament)' },
              { name: 'SectionChapter', desc: 'A chapter or surah' },
              { name: 'SegmentVerse', desc: 'Individual verse — the core searchable unit' }
            ].map(layer => (
              <div key={layer.name} className="p-2 rounded-md bg-secondary/20">
                <p className="font-mono text-xs text-primary">{layer.name}</p>
                <p className="text-xs text-muted-foreground">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}