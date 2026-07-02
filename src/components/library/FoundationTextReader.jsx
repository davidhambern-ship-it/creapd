import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Search, Highlighter, StickyNote, BookMarked, GraduationCap,
  ChevronLeft, ChevronRight, X, Shield, Copy, Check, Columns2, ExternalLink
} from 'lucide-react';
import { HIGHLIGHT_CATEGORIES } from '@/lib/spiritualConstants';
import CreateMessageButton from '@/components/message/CreateMessageButton';

export default function FoundationTextReader({ text, textId }) {
  const navigate = useNavigate();
  const [textWork, setTextWork] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [highlightCategory, setHighlightCategory] = useState('important');
  const [copiedRef, setCopiedRef] = useState(null);
  const [showChapterList, setShowChapterList] = useState(false);

  // Load TextWork and chapters
  useEffect(() => {
    if (!textId) return;
    (async () => {
      try {
        const works = await base44.entities.TextWork.filter({ library_text_id: textId }, '-updated_date', 1);
        if (!works || works.length === 0) { setLoading(false); return; }
        const work = works[0];
        setTextWork(work);

        const chaps = await base44.entities.SectionChapter.filter({ text_work_id: work.id }, 'order', 500);
        setChapters(chaps || []);
        if (chaps && chaps.length > 0) setActiveChapterId(chaps[0].id);

        const [h, n, b] = await Promise.all([
          base44.entities.LibraryHighlight.filter({ text_id: textId }, '-created_date', 50).catch(() => []),
          base44.entities.LibraryNote.filter({ text_id: textId }, '-created_date', 50).catch(() => []),
          base44.entities.LibraryBookmark.filter({ text_id: textId }, '-created_date', 50).catch(() => [])
        ]);
        setHighlights(h || []);
        setNotes(n || []);
        setBookmarks(b || []);
      } catch (err) {
        console.error('FoundationTextReader load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [textId]);

  // Load verses when chapter changes
  const loadVerses = useCallback(async (chapterId) => {
    if (!chapterId) return;
    setLoadingVerses(true);
    try {
      const v = await base44.entities.SegmentVerse.filter({ section_chapter_id: chapterId }, 'verse_number', 500);
      setVerses(v || []);
    } catch (err) {
      console.error('Verse load error:', err);
    } finally {
      setLoadingVerses(false);
    }
  }, []);

  useEffect(() => {
    if (activeChapterId) loadVerses(activeChapterId);
  }, [activeChapterId, loadVerses]);

  // Search across all verses
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !textWork) return;
    setSearching(true);
    try {
      const results = await base44.entities.SegmentVerse.filter({
        text_work_id: textWork.id,
        verse_text: { $regex: searchQuery.trim(), $options: 'i' }
      }, 'order_index', 100);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, textWork]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleVerseClick = (verse) => {
    setSelectedVerse(verse);
  };

  const handleAddHighlight = async (verse) => {
    try {
      const h = await base44.entities.LibraryHighlight.create({
        text_id: textId,
        text_title: text?.title || '',
        passage_reference: verse.verse_reference,
        segment_verse_id: verse.id,
        highlighted_text: verse.verse_text,
        highlight_category: highlightCategory
      });
      setHighlights([h, ...highlights]);
    } catch (err) { console.error(err); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedVerse) return;
    try {
      const n = await base44.entities.LibraryNote.create({
        text_id: textId,
        text_title: text?.title || '',
        passage_reference: selectedVerse.verse_reference,
        segment_verse_id: selectedVerse.id,
        note_content: noteText,
        note_type: 'general'
      });
      setNotes([n, ...notes]);
      setNoteText('');
    } catch (err) { console.error(err); }
  };

  const handleBookmark = async (verse) => {
    try {
      const b = await base44.entities.LibraryBookmark.create({
        text_id: textId,
        text_title: text?.title || '',
        passage_reference: verse.verse_reference
      });
      setBookmarks([b, ...bookmarks]);
    } catch (err) { console.error(err); }
  };

  const copyReference = (verse) => {
    navigator.clipboard.writeText(`${verse.verse_reference} — ${verse.verse_text}\n\n${verse.citation || ''}`);
    setCopiedRef(verse.id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const isVerseHighlighted = (verseId) => highlights.some(h => h.segment_verse_id === verseId);
  const isVerseBookmarked = (verseRef) => bookmarks.some(b => b.passage_reference === verseRef);

  const navigateChapter = (direction) => {
    if (!chapters.length) return;
    const currentIdx = chapters.findIndex(c => c.id === activeChapterId);
    const newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (newIdx >= 0 && newIdx < chapters.length) {
      setActiveChapterId(chapters[newIdx].id);
      setSelectedVerse(null);
    }
  };

  const currentChapter = chapters.find(c => c.id === activeChapterId);
  const currentIdx = chapters.findIndex(c => c.id === activeChapterId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Chapter Navigation */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-primary" />
            Chapters ({chapters.length})
          </h3>
          {textWork?.seeding_status === 'seeding' && (
            <div className="mb-3 p-2 rounded-md bg-primary/10 text-primary text-xs flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Seeding in progress...
            </div>
          )}
          <div className="space-y-0.5">
            {chapters.map(chap => (
              <button
                key={chap.id}
                onClick={() => { setActiveChapterId(chap.id); setSelectedVerse(null); clearSearch(); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeChapterId === chap.id
                    ? 'bg-primary/20 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                <span className="text-muted-foreground/60 mr-1.5">{chap.order}</span>
                {chap.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Reading Area */}
      <div className="lg:col-span-2">
        {/* Search Bar */}
        <div className="glass-panel p-3 mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={`Search ${text?.title} verse-by-verse...`}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="p-1 rounded hover:bg-secondary/50">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <Button size="sm" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </Button>
          </div>
          {searchResults && (
            <p className="text-xs text-muted-foreground mt-2">
              {searchResults.length} verse{searchResults.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Source Metadata */}
        {textWork && (
          <div className="glass-panel p-3 mb-4 flex items-center gap-3 text-xs">
            <Shield className="w-4 h-4 text-berna-emerald shrink-0" />
            <div className="flex-1">
              <span className="text-muted-foreground">Source: </span>
              <span className="font-medium">{textWork.source_provider}</span>
              <span className="text-muted-foreground mx-1.5">·</span>
              <span className="text-muted-foreground">License: </span>
              <span className="font-medium capitalize">{textWork.license_status?.replace(/_/g, ' ')}</span>
              {textWork.source_url && (
                <>
                  <span className="text-muted-foreground mx-1.5">·</span>
                  <a href={textWork.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                    Provider <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search Results or Chapter Verses */}
        {searchResults ? (
          <div className="glass-panel p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-sm">Search Results</h3>
              <Button size="sm" variant="ghost" onClick={clearSearch}>Clear</Button>
            </div>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No verses found matching "{searchQuery}"</p>
            ) : (
              <div className="space-y-3">
                {searchResults.map(verse => (
                  <VerseRow
                    key={verse.id}
                    verse={verse}
                    onClick={() => handleVerseClick(verse)}
                    onHighlight={() => handleAddHighlight(verse)}
                    onBookmark={() => handleBookmark(verse)}
                    onCopy={() => copyReference(verse)}
                    onNavigate={() => { clearSearch(); setActiveChapterId(verse.section_chapter_id); }}
                    isSelected={selectedVerse?.id === verse.id}
                    isHighlighted={isVerseHighlighted(verse.id)}
                    isBookmarked={isVerseBookmarked(verse.verse_reference)}
                    copied={copiedRef === verse.id}
                    showChapter
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel p-5 md:p-6">
            {/* Chapter Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div>
                <h2 className="font-heading font-bold text-lg">{currentChapter?.name}</h2>
                <p className="text-xs text-muted-foreground">{verses.length} verses</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => navigateChapter('prev')} disabled={currentIdx <= 0}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigateChapter('next')} disabled={currentIdx >= chapters.length - 1}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Verses */}
            {loadingVerses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {verses.map(verse => (
                  <VerseRow
                    key={verse.id}
                    verse={verse}
                    onClick={() => handleVerseClick(verse)}
                    onHighlight={() => handleAddHighlight(verse)}
                    onBookmark={() => handleBookmark(verse)}
                    onCopy={() => copyReference(verse)}
                    isSelected={selectedVerse?.id === verse.id}
                    isHighlighted={isVerseHighlighted(verse.id)}
                    isBookmarked={isVerseBookmarked(verse.verse_reference)}
                    copied={copiedRef === verse.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Verse Actions */}
        {selectedVerse && (
          <div className="glass-panel p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-heading font-semibold text-sm">{selectedVerse.verse_reference}</h3>
                <p className="text-xs text-muted-foreground">{selectedVerse.citation}</p>
              </div>
              <button onClick={() => setSelectedVerse(null)} className="p-1 rounded hover:bg-secondary/50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-3 p-2 rounded-md bg-secondary/20">{selectedVerse.verse_text}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button size="sm" variant={isVerseHighlighted(selectedVerse.id) ? 'secondary' : 'outline'} onClick={() => handleAddHighlight(selectedVerse)}>
                <Highlighter className="w-3.5 h-3.5 mr-1" /> {isVerseHighlighted(selectedVerse.id) ? 'Highlighted' : 'Highlight'}
              </Button>
              <Button size="sm" variant={isVerseBookmarked(selectedVerse.verse_reference) ? 'secondary' : 'outline'} onClick={() => handleBookmark(selectedVerse)}>
                <BookMarked className="w-3.5 h-3.5 mr-1" /> {isVerseBookmarked(selectedVerse.verse_reference) ? 'Bookmarked' : 'Bookmark'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => copyReference(selectedVerse)}>
                {copiedRef === selectedVerse.id ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedRef === selectedVerse.id ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(selectedVerse.verse_reference + ' — ' + selectedVerse.verse_text)}&autoRun=true&source=library-reader`)}>
                <GraduationCap className="w-3.5 h-3.5 mr-1" /> Study
              </Button>
              <CreateMessageButton
                context={{
                  title: `Message: ${selectedVerse.verse_reference}`,
                  topic: selectedVerse.verse_reference,
                  faith_tradition: text?.tradition,
                  study_topics: JSON.stringify([selectedVerse.verse_reference]),
                }}
                variant="outline"
                size="sm"
                label="Create Message"
              />
            </div>
            <div className="flex items-start gap-2">
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={`Add a note to ${selectedVerse.verse_reference}...`}
                rows={2}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                <StickyNote className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Highlight Category */}
        <div className="glass-panel p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Highlight Category</p>
          <div className="flex flex-wrap gap-1">
            {HIGHLIGHT_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setHighlightCategory(cat.key)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${cat.color} ${highlightCategory === cat.key ? 'ring-1 ring-primary' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="glass-panel p-4">
          <h4 className="font-heading font-semibold text-sm flex items-center gap-2 mb-3">
            <Highlighter className="w-4 h-4 text-accent" /> Highlights ({highlights.length})
          </h4>
          {highlights.length === 0 ? (
            <p className="text-xs text-muted-foreground">Click a verse and highlight it to save here.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {highlights.slice(0, 10).map(h => {
                const cat = HIGHLIGHT_CATEGORIES.find(c => c.key === h.highlight_category);
                return (
                  <button
                    key={h.id}
                    onClick={() => { if (h.segment_verse_id) { /* could navigate to verse */ } }}
                    className="w-full text-left p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {cat && <span className={`px-1.5 py-0.5 rounded text-xs ${cat.color}`}>{cat.label}</span>}
                      {h.passage_reference && <span className="text-xs text-primary font-medium">{h.passage_reference}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{h.highlighted_text}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="glass-panel p-4">
          <h4 className="font-heading font-semibold text-sm flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-primary" /> Notes ({notes.length})
          </h4>
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Select a verse and write a note.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notes.slice(0, 10).map(n => (
                <div key={n.id} className="p-2 rounded-md bg-secondary/30">
                  {n.passage_reference && <p className="text-xs text-primary font-medium mb-1">{n.passage_reference}</p>}
                  <p className="text-xs text-muted-foreground line-clamp-3">{n.note_content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookmarks */}
        <div className="glass-panel p-4">
          <h4 className="font-heading font-semibold text-sm flex items-center gap-2 mb-3">
            <BookMarked className="w-4 h-4 text-accent" /> Bookmarks ({bookmarks.length})
          </h4>
          {bookmarks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bookmark verses to return to them.</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {bookmarks.map(b => (
                <div key={b.id} className="flex items-center gap-2 p-1.5 rounded-md bg-secondary/30 text-xs">
                  <BookMarked className="w-3 h-3 text-accent shrink-0" />
                  <span className="truncate">{b.passage_reference}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerseRow({ verse, onClick, onHighlight, onBookmark, onCopy, onNavigate, isSelected, isHighlighted, isBookmarked, copied, showChapter }) {
  return (
    <div
      className={`group relative rounded-lg p-3 transition-all cursor-pointer ${
        isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-secondary/20'
      } ${isHighlighted ? 'border-l-2 border-l-accent' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-muted-foreground/70 mt-0.5 shrink-0 select-none min-w-[2rem]">
          {verse.verse_number}
        </span>
        <div className="flex-1 min-w-0">
          {showChapter && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate?.(); }}
              className="text-xs font-medium text-primary mb-1 hover:underline"
            >
              {verse.verse_reference}
            </button>
          )}
          <p className="text-sm text-foreground leading-relaxed">{verse.verse_text}</p>
        </div>
      </div>
      {/* Hover actions */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={onHighlight} className="p-1 rounded hover:bg-secondary/50" title="Highlight">
          <Highlighter className={`w-3.5 h-3.5 ${isHighlighted ? 'text-accent' : 'text-muted-foreground'}`} />
        </button>
        <button onClick={onBookmark} className="p-1 rounded hover:bg-secondary/50" title="Bookmark">
          <BookMarked className={`w-3.5 h-3.5 ${isBookmarked ? 'text-accent' : 'text-muted-foreground'}`} />
        </button>
        <button onClick={onCopy} className="p-1 rounded hover:bg-secondary/50" title="Copy verse">
          {copied ? <Check className="w-3.5 h-3.5 text-berna-emerald" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        <span className="text-xs text-muted-foreground ml-1">{verse.verse_reference}</span>
      </div>
    </div>
  );
}