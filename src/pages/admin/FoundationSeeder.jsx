import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Loader2, BookOpen, CheckCircle2, AlertCircle, Database, RefreshCw,
  FileText, ChevronRight, ExternalLink, ListChecks
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
    description: 'King James Version — 66 books, 1189 chapters. Selects all by default.',
    license: 'Public Domain',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30'
  }
];

const BIBLE_BOOKS = [
  // Old Testament (39 books)
  { key: 'genesis', name: 'Genesis', chapters: 50, testament: 'OT' },
  { key: 'exodus', name: 'Exodus', chapters: 40, testament: 'OT' },
  { key: 'leviticus', name: 'Leviticus', chapters: 27, testament: 'OT' },
  { key: 'numbers', name: 'Numbers', chapters: 36, testament: 'OT' },
  { key: 'deuteronomy', name: 'Deuteronomy', chapters: 34, testament: 'OT' },
  { key: 'joshua', name: 'Joshua', chapters: 24, testament: 'OT' },
  { key: 'judges', name: 'Judges', chapters: 21, testament: 'OT' },
  { key: 'ruth', name: 'Ruth', chapters: 4, testament: 'OT' },
  { key: '1samuel', name: '1 Samuel', chapters: 31, testament: 'OT' },
  { key: '2samuel', name: '2 Samuel', chapters: 24, testament: 'OT' },
  { key: '1kings', name: '1 Kings', chapters: 22, testament: 'OT' },
  { key: '2kings', name: '2 Kings', chapters: 25, testament: 'OT' },
  { key: '1chronicles', name: '1 Chronicles', chapters: 29, testament: 'OT' },
  { key: '2chronicles', name: '2 Chronicles', chapters: 36, testament: 'OT' },
  { key: 'ezra', name: 'Ezra', chapters: 10, testament: 'OT' },
  { key: 'nehemiah', name: 'Nehemiah', chapters: 13, testament: 'OT' },
  { key: 'esther', name: 'Esther', chapters: 10, testament: 'OT' },
  { key: 'job', name: 'Job', chapters: 42, testament: 'OT' },
  { key: 'psalms', name: 'Psalms', chapters: 150, testament: 'OT' },
  { key: 'proverbs', name: 'Proverbs', chapters: 31, testament: 'OT' },
  { key: 'ecclesiastes', name: 'Ecclesiastes', chapters: 12, testament: 'OT' },
  { key: 'songofsolomon', name: 'Song of Solomon', chapters: 8, testament: 'OT' },
  { key: 'isaiah', name: 'Isaiah', chapters: 66, testament: 'OT' },
  { key: 'jeremiah', name: 'Jeremiah', chapters: 52, testament: 'OT' },
  { key: 'lamentations', name: 'Lamentations', chapters: 5, testament: 'OT' },
  { key: 'ezekiel', name: 'Ezekiel', chapters: 48, testament: 'OT' },
  { key: 'daniel', name: 'Daniel', chapters: 12, testament: 'OT' },
  { key: 'hosea', name: 'Hosea', chapters: 14, testament: 'OT' },
  { key: 'joel', name: 'Joel', chapters: 3, testament: 'OT' },
  { key: 'amos', name: 'Amos', chapters: 9, testament: 'OT' },
  { key: 'obadiah', name: 'Obadiah', chapters: 1, testament: 'OT' },
  { key: 'jonah', name: 'Jonah', chapters: 4, testament: 'OT' },
  { key: 'micah', name: 'Micah', chapters: 7, testament: 'OT' },
  { key: 'nahum', name: 'Nahum', chapters: 3, testament: 'OT' },
  { key: 'habakkuk', name: 'Habakkuk', chapters: 3, testament: 'OT' },
  { key: 'zephaniah', name: 'Zephaniah', chapters: 3, testament: 'OT' },
  { key: 'haggai', name: 'Haggai', chapters: 2, testament: 'OT' },
  { key: 'zechariah', name: 'Zechariah', chapters: 14, testament: 'OT' },
  { key: 'malachi', name: 'Malachi', chapters: 4, testament: 'OT' },
  // New Testament (27 books)
  { key: 'matthew', name: 'Matthew', chapters: 28, testament: 'NT' },
  { key: 'mark', name: 'Mark', chapters: 16, testament: 'NT' },
  { key: 'luke', name: 'Luke', chapters: 24, testament: 'NT' },
  { key: 'john', name: 'John', chapters: 21, testament: 'NT' },
  { key: 'acts', name: 'Acts', chapters: 28, testament: 'NT' },
  { key: 'romans', name: 'Romans', chapters: 16, testament: 'NT' },
  { key: '1corinthians', name: '1 Corinthians', chapters: 16, testament: 'NT' },
  { key: '2corinthians', name: '2 Corinthians', chapters: 13, testament: 'NT' },
  { key: 'galatians', name: 'Galatians', chapters: 6, testament: 'NT' },
  { key: 'ephesians', name: 'Ephesians', chapters: 6, testament: 'NT' },
  { key: 'philippians', name: 'Philippians', chapters: 4, testament: 'NT' },
  { key: 'colossians', name: 'Colossians', chapters: 4, testament: 'NT' },
  { key: '1thessalonians', name: '1 Thessalonians', chapters: 5, testament: 'NT' },
  { key: '2thessalonians', name: '2 Thessalonians', chapters: 3, testament: 'NT' },
  { key: '1timothy', name: '1 Timothy', chapters: 6, testament: 'NT' },
  { key: '2timothy', name: '2 Timothy', chapters: 4, testament: 'NT' },
  { key: 'titus', name: 'Titus', chapters: 3, testament: 'NT' },
  { key: 'philemon', name: 'Philemon', chapters: 1, testament: 'NT' },
  { key: 'hebrews', name: 'Hebrews', chapters: 13, testament: 'NT' },
  { key: 'james', name: 'James', chapters: 5, testament: 'NT' },
  { key: '1peter', name: '1 Peter', chapters: 5, testament: 'NT' },
  { key: '2peter', name: '2 Peter', chapters: 3, testament: 'NT' },
  { key: '1john', name: '1 John', chapters: 5, testament: 'NT' },
  { key: '2john', name: '2 John', chapters: 1, testament: 'NT' },
  { key: '3john', name: '3 John', chapters: 1, testament: 'NT' },
  { key: 'jude', name: 'Jude', chapters: 1, testament: 'NT' },
  { key: 'revelation', name: 'Revelation', chapters: 22, testament: 'NT' },
];

const ALL_BOOK_KEYS = BIBLE_BOOKS.map(b => b.key);

export default function FoundationSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [textWorks, setTextWorks] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedBooks, setSelectedBooks] = useState(ALL_BOOK_KEYS);
  const [batchProgress, setBatchProgress] = useState(null);
  const cancelRef = useRef(false);

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

  const handleSeedQuran = async () => {
    setSeeding(true);
    setError(null);
    setResult(null);
    try {
      const resp = await base44.functions.invoke('seedFoundationText', { source: 'quran' });
      setResult(resp.data);
      await loadTextWorks();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedBible = async () => {
    setSeeding(true);
    setError(null);
    setResult(null);
    cancelRef.current = false;

    let remaining = [...selectedBooks];
    let totalChapters = 0;
    let totalVerses = 0;
    let batchNum = 0;

    while (remaining.length > 0 && !cancelRef.current) {
      batchNum++;
      setBatchProgress({
        batch: batchNum,
        booksRemaining: remaining.length,
        totalSelected: selectedBooks.length,
        chaptersSoFar: totalChapters,
        versesSoFar: totalVerses,
        currentBooks: remaining.slice(0, 5).join(', ')
      });

      try {
        const resp = await base44.functions.invoke('seedFoundationText', {
          source: 'bible',
          books: remaining
        });
        const data = resp.data;
        totalChapters += data.chapters_created || 0;
        totalVerses += data.verses_created || 0;
        remaining = data.books_remaining || [];
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Seeding failed');
        break;
      }
    }

    setBatchProgress(null);
    setResult({
      source: 'bible',
      chapters_created: totalChapters,
      verses_created: totalVerses,
      books_seeded: selectedBooks.filter(b => !remaining.includes(b)),
      library_text_id: textWorks.find(w => w.title === 'The Bible')?.library_text_id
    });
    await loadTextWorks();
    setSeeding(false);
  };

  const toggleBook = (bookKey) => {
    setSelectedBooks(prev =>
      prev.includes(bookKey) ? prev.filter(b => b !== bookKey) : [...prev, bookKey]
    );
  };

  const selectAll = () => setSelectedBooks(ALL_BOOK_KEYS);
  const deselectAll = () => setSelectedBooks([]);

  const otBooks = BIBLE_BOOKS.filter(b => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter(b => b.testament === 'NT');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link to="/admin/world-scripture-registry" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/admin/source-management-center" className="hover:text-foreground">Source Management Center</Link>
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

        {/* Batch Progress */}
        {batchProgress && (
          <div className="glass-panel p-4 mb-6 border-l-4 border-l-primary">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <h3 className="font-heading font-semibold">Seeding Bible — Batch {batchProgress.batch}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Books Remaining</p>
                <p className="font-heading font-bold text-lg text-primary">{batchProgress.booksRemaining}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chapters So Far</p>
                <p className="font-heading font-bold text-lg">{batchProgress.chaptersSoFar}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verses So Far</p>
                <p className="font-heading font-bold text-lg">{batchProgress.versesSoFar}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Selected</p>
                <p className="font-heading font-bold text-lg">{batchProgress.totalSelected}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Processing: {batchProgress.currentBooks}{batchProgress.booksRemaining > 5 ? '...' : ''}
            </p>
            <div className="mt-2 w-full bg-secondary/30 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${((batchProgress.totalSelected - batchProgress.booksRemaining) / batchProgress.totalSelected) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Success */}
        {result && !batchProgress && (
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
          {/* Quran Card */}
          <div className={`glass-panel p-5 border ${SEED_SOURCES[0].borderColor}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className={`font-heading font-bold text-lg ${SEED_SOURCES[0].color}`}>{SEED_SOURCES[0].name}</h3>
                <p className="text-xs text-muted-foreground">{SEED_SOURCES[0].tradition}</p>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs ${SEED_SOURCES[0].bgColor} ${SEED_SOURCES[0].color}`}>{SEED_SOURCES[0].license}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{SEED_SOURCES[0].description}</p>
            <a
              href={SEED_SOURCES[0].providerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4"
            >
              <FileText className="w-3 h-3" /> {SEED_SOURCES[0].provider}
              <ExternalLink className="w-3 h-3" />
            </a>
            <Button
              onClick={handleSeedQuran}
              disabled={seeding}
              className="w-full"
            >
              {seeding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding...</>
              ) : (
                <><Database className="w-4 h-4 mr-2" /> Seed {SEED_SOURCES[0].name}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">~15 seconds — fetches all 114 surahs in one API call</p>
          </div>

          {/* Bible Card */}
          <div className={`glass-panel p-5 border ${SEED_SOURCES[1].borderColor}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className={`font-heading font-bold text-lg ${SEED_SOURCES[1].color}`}>{SEED_SOURCES[1].name}</h3>
                <p className="text-xs text-muted-foreground">{SEED_SOURCES[1].tradition}</p>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs ${SEED_SOURCES[1].bgColor} ${SEED_SOURCES[1].color}`}>{SEED_SOURCES[1].license}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{SEED_SOURCES[1].description}</p>
            <a
              href={SEED_SOURCES[1].providerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-3"
            >
              <FileText className="w-3 h-3" /> {SEED_SOURCES[1].provider}
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Select All / Deselect All */}
            <div className="flex items-center gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={selectAll} disabled={seeding} className="text-xs h-7">
                <ListChecks className="w-3 h-3 mr-1" /> Select All
              </Button>
              <Button size="sm" variant="ghost" onClick={deselectAll} disabled={seeding} className="text-xs h-7">
                Clear
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {selectedBooks.length} / {ALL_BOOK_KEYS.length} books selected
              </span>
            </div>

            {/* Old Testament Books */}
            <p className="text-xs font-medium text-muted-foreground mb-1">Old Testament (39 books)</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {otBooks.map(book => (
                <button
                  key={book.key}
                  onClick={() => toggleBook(book.key)}
                  disabled={seeding}
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

            {/* New Testament Books */}
            <p className="text-xs font-medium text-muted-foreground mb-1">New Testament (27 books)</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {ntBooks.map(book => (
                <button
                  key={book.key}
                  onClick={() => toggleBook(book.key)}
                  disabled={seeding}
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

            <Button
              onClick={handleSeedBible}
              disabled={seeding || selectedBooks.length === 0}
              className="w-full"
            >
              {seeding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding...</>
              ) : (
                <><Database className="w-4 h-4 mr-2" /> Seed {selectedBooks.length === ALL_BOOK_KEYS.length ? 'Entire Bible' : `${selectedBooks.length} Books`}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {selectedBooks.length === ALL_BOOK_KEYS.length
                ? 'All 66 books (1189 chapters) — seeds in batches automatically'
                : `Selected books — seeds in batches automatically`}
            </p>
          </div>
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