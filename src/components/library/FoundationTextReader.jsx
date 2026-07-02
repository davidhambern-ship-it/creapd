import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Loader2, Search, Highlighter, StickyNote, BookMarked, GraduationCap,
  ChevronLeft, ChevronRight, X, Shield, Copy, Check, Navigation, PanelRight,
  Columns2, ExternalLink
} from 'lucide-react';
import { HIGHLIGHT_CATEGORIES } from '@/lib/spiritualConstants';
import CreateMessageButton from '@/components/message/CreateMessageButton';
import PassageNavigator from './PassageNavigator';
import FoundationToolsPanel from './FoundationToolsPanel';

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
  const [showNavigator, setShowNavigator] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [pendingVerseScroll, setPendingVerseScroll] = useState(null);
  const verseRefs = useRef({});

  const fetchAllChapters = async (workId) => {
    const all = [];
    const PAGE_SIZE = 500;
    let lastOrder = -1;
    while (true) {
      const batch = await base44.entities.SectionChapter.filter(
        { text_work_id: workId, order: { $gt: lastOrder } },
        'order',
        PAGE_SIZE
      );
      if (!batch || batch.length === 0) break;
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      lastOrder = batch[batch.length - 1].order;
    }
    return all;
  };

  useEffect(() => {
    if (!textId) return;
    (async () => {
      try {
        const works = await base44.entities.TextWork.filter({ library_text_id: textId }, '-updated_date', 1);
        if (!works || works.length === 0) { setLoading(false); return; }
        const work = works[0];
        setTextWork(work);
        const chaps = await fetchAllChapters(work.id);
        setChapters(chaps);
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

  // Scroll to verse after verses load (from PassageNavigator)
  useEffect(() => {
    if (pendingVerseScroll !== null && verses.length > 0) {
      const verse = verses.find(v => v.verse_number === pendingVerseScroll);
      if (verse) {
        setTimeout(() => {
          verseRefs.current[verse.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setSelectedVerse(verse);
        }, 150);
      }
      setPendingVerseScroll(null);
    }
  }, [pendingVerseScroll, verses]);

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

  const handlePassageSelect = (chapter, verseNumber) => {
    clearSearch();
    setActiveChapterId(chapter.id);
    setSelectedVerse(null);
    if (verseNumber !== null) {
      setPendingVerseScroll(verseNumber);
    }
  };

  const currentChapter = chapters.find(c => c.id === activeChapterId);
  const currentIdx = chapters.findIndex(c => c.id === activeChapterId);

  const bookGroups = chapters.reduce((acc, ch) => {
    const book = ch.book_name || 'Chapters';
    if (!acc[book]) acc[book] = [];
    acc[book].push(ch);
    return acc;
  }, {});
  const currentBookName = currentChapter ? (currentChapter.book_name || 'Chapters') : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Sub-header: location + Navigate + Search + Tools */}
      <div className="glass-panel p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {currentBookName} {currentChapter && `· ${currentChapter.chapter_number}`}
          </p>
          <p className="text-sm font-medium truncate">{currentChapter?.name || 'Select a passage'}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={() => setShowNavigator(true)}>
            <Navigation className="w-3.5 h-3.5 mr-1.5" /> Navigate
          </Button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50'}`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTools(true)}
            className="p-2 rounded-lg hover:bg-secondary/50 relative"
            title="Notes & Highlights"
          >
            <PanelRight className="w-4 h-4" />
            {(highlights.length > 0 || notes.length > 0 || bookmarks.length > 0) && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Search bar (collapsible) */}
      {showSearch && (
        <div className="glass-panel p-3">
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
      )}

      {/* Source metadata */}
      {textWork && (
        <div className="glass-panel p-3 flex items-center gap-3 text-xs">
          <Shield className="w-4 h-4 text-berna-emerald shrink-0" />
          <div className="flex-1 min-w-0">
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

      {/* Reading Content */}
      {searchResults ? (
        <div className="glass-panel p-5 md:p-8">
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
                  onClick={() => setSelectedVerse(verse)}
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
        <div className="glass-panel p-5 md:p-8">
          {/* Chapter header */}
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

          {loadingVerses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {verses.map(verse => (
                <div key={verse.id} ref={el => { if (el) verseRefs.current[verse.id] = el; }}>
                  <VerseRow
                    verse={verse}
                    onClick={() => setSelectedVerse(verse)}
                    onHighlight={() => handleAddHighlight(verse)}
                    onBookmark={() => handleBookmark(verse)}
                    onCopy={() => copyReference(verse)}
                    isSelected={selectedVerse?.id === verse.id}
                    isHighlighted={isVerseHighlighted(verse.id)}
                    isBookmarked={isVerseBookmarked(verse.verse_reference)}
                    copied={copiedRef === verse.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected verse actions (inline) */}
      {selectedVerse && (
        <div className="glass-panel p-4">
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

      {/* Passage Navigator Modal */}
      <PassageNavigator
        open={showNavigator}
        onClose={() => setShowNavigator(false)}
        chapters={chapters}
        onSelect={handlePassageSelect}
        tradition={text?.tradition}
      />

      {/* Tools Slide-out */}
      <Sheet open={showTools} onOpenChange={setShowTools}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reader Tools</SheetTitle>
          </SheetHeader>
          <FoundationToolsPanel
            highlights={highlights}
            notes={notes}
            bookmarks={bookmarks}
            highlightCategory={highlightCategory}
            setHighlightCategory={setHighlightCategory}
            noteText={noteText}
            setNoteText={setNoteText}
            onAddNote={handleAddNote}
            selectedVerse={selectedVerse}
            setSelectedVerse={setSelectedVerse}
            onAddHighlight={handleAddHighlight}
            onBookmark={handleBookmark}
            onCopy={copyReference}
            copiedRef={copiedRef}
          />
        </SheetContent>
      </Sheet>
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