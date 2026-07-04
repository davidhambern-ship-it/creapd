import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Loader2, ChevronLeft, BookOpen, BookMarked,
  Highlighter, Search, Shield, ExternalLink,
  ChevronDown, ChevronUp, Columns2, GraduationCap, PanelRight
} from 'lucide-react';
import SourceIntegrityBadge from '@/components/library/SourceIntegrityBadge';
import WordInteractionModal from '@/components/library/WordInteractionModal';
import { READING_MODES } from '@/lib/spiritualConstants';
import NativeTextReader from '@/components/library/NativeTextReader';
import FoundationTextReader from '@/components/library/FoundationTextReader';
import ReaderToolsPanel from '@/components/library/ReaderToolsPanel';

export default function LibraryReader() {
  const { textId } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activePassage, setActivePassage] = useState(null);
  const [activeWord, setActiveWord] = useState(null);
  const [showSourceIntegrity, setShowSourceIntegrity] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readingMode, setReadingMode] = useState('reading');
  const [noteText, setNoteText] = useState('');
  const [highlightCategory, setHighlightCategory] = useState('important');
  const [chapters, setChapters] = useState([]);
  const [isFoundation, setIsFoundation] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('highlights');
  const [showTools, setShowTools] = useState(false);

  const loadText = useCallback(async () => {
    if (!textId) return;
    setLoading(true);
    try {
      const t = await base44.entities.LibraryText.get(textId);
      setText(t);
      if (t.is_foundation) {
        const works = await base44.entities.TextWork.filter({ library_text_id: textId }, '-updated_date', 1).catch(() => []);
        if (works && works.length > 0) setIsFoundation(true);
      }
      const [h, n, b] = await Promise.all([
        base44.entities.LibraryHighlight.filter({ text_id: textId }, '-created_date', 50).catch(() => []),
        base44.entities.LibraryNote.filter({ text_id: textId }, '-created_date', 50).catch(() => []),
        base44.entities.LibraryBookmark.filter({ text_id: textId }, '-created_date', 50).catch(() => [])
      ]);
      setHighlights(h || []);
      setNotes(n || []);
      setBookmarks(b || []);
      try {
        const parsed = JSON.parse(t.chapters || '[]');
        setChapters(Array.isArray(parsed) ? parsed : []);
      } catch {
        setChapters([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [textId]);

  useEffect(() => { loadText(); }, [loadText]);

  const handleWordClick = (word) => {
    const cleaned = word.replace(/[^\p{L}\p{M}]/gu, '');
    if (cleaned.length < 2) return;
    setActiveWord(cleaned);
  };

  const handlePassageClick = (passageRef, passageText) => {
    setActivePassage({ ref: passageRef, text: passageText });
    setActiveTab('notes');
  };

  const handleAddHighlight = async (text_content, passageRef) => {
    if (!text_content) return;
    try {
      const h = await base44.entities.LibraryHighlight.create({
        text_id: textId,
        text_title: text?.title || '',
        passage_reference: passageRef || '',
        highlighted_text: text_content,
        highlight_category: highlightCategory
      });
      setHighlights([h, ...highlights]);
      setActiveTab('highlights');
    } catch (err) { console.error(err); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      const n = await base44.entities.LibraryNote.create({
        text_id: textId,
        text_title: text?.title || '',
        passage_reference: activePassage?.ref || '',
        note_content: noteText,
        note_type: 'general'
      });
      setNotes([n, ...notes]);
      setNoteText('');
    } catch (err) { console.error(err); }
  };

  const handleBookmark = async (passageRef) => {
    try {
      const b = await base44.entities.LibraryBookmark.create({
        text_id: textId,
        text_title: text?.title || '',
        passage_reference: passageRef
      });
      setBookmarks([b, ...bookmarks]);
      setActiveTab('bookmarks');
    } catch (err) { console.error(err); }
  };

  const handleSelectWordFromPassage = () => {
    if (!activePassage) return;
    const words = activePassage.text.split(/\s+/).filter(w => w.length > 3);
    if (words.length > 0) setActiveWord(words[0].replace(/[^\p{L}\p{M}]/gu, ''));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!text) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Text not found.</p>
          <Button asChild><Link to="/spiritual/library">Back to Library</Link></Button>
        </div>
      </div>
    );
  }

  const translations = (() => { try { return JSON.parse(text.available_translations || '[]'); } catch { return []; } })();
  const themes = (() => { try { return JSON.parse(text.major_themes || '[]'); } catch { return []; } })();

  const passages = (text.full_text || '').split(/\n\n+/).filter(p => p.trim());
  const filteredPassages = searchQuery
    ? passages.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    : passages;

  const showReaderControls = !isFoundation;

  return (
    <div className="flex flex-col lg:h-full">
      {/* ─── Reader Header ─── */}
      <div className="flex-shrink-0 sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate('/spiritual/library')} className="p-1.5 rounded-lg hover:bg-berna-orange/10 text-berna-orange">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link to="/spiritual/library" className="hover:text-foreground">Library</Link>
                  <span>/</span>
                  <span className="truncate">{text.tradition}</span>
                </div>
                <h1 className="font-heading font-bold text-lg truncate">{text.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {showReaderControls && (
                <>
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50'}`}
                    title="Search"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowSourceIntegrity(!showSourceIntegrity)}
                    className={`p-2 rounded-lg transition-colors ${showSourceIntegrity ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50'}`}
                    title="Source Integrity"
                  >
                    <Shield className="w-4 h-4" />
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
                </>
              )}
            </div>
          </div>

          {showReaderControls && showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search within this text..."
              className="w-full mt-2 h-9 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}

          {/* Reading Mode segmented control — only for plain text */}
          {showReaderControls && !isFoundation && chapters.length === 0 && (
            <div className="mt-2 overflow-x-auto">
              <div className="inline-flex items-center gap-0.5 rounded-lg bg-secondary/40 p-0.5">
                {READING_MODES.map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => setReadingMode(mode.key)}
                    className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                      readingMode === mode.key
                        ? 'bg-white/10 text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Reading Area (centered, full-width) ─── */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Source Integrity (compact, toggled) */}
        {showReaderControls && showSourceIntegrity && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="glass-panel p-3 rounded-xl">
              <SourceIntegrityBadge text={text} />
            </div>
          </div>
        )}

        {/* Text Profile (collapsible) */}
        {showReaderControls && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="glass-panel rounded-xl">
              <button
                onClick={() => setProfileExpanded(!profileExpanded)}
                className="w-full flex items-center justify-between p-4"
              >
                <h2 className="font-heading font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Text Profile
                </h2>
                {profileExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {profileExpanded && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Tradition:</span> {text.tradition}</div>
                    <div><span className="text-muted-foreground">Collection:</span> {text.collection?.replace(/_/g, ' ')}</div>
                    <div><span className="text-muted-foreground">Original Language:</span> {text.original_language || 'N/A'}</div>
                    <div><span className="text-muted-foreground">Writing System:</span> {text.writing_system || 'N/A'}</div>
                    {text.traditional_attribution && <div><span className="text-muted-foreground">Attribution:</span> {text.traditional_attribution}</div>}
                    {text.scholarly_dating && <div><span className="text-muted-foreground">Scholarly Dating:</span> {text.scholarly_dating}</div>}
                    {text.geographic_origin && <div><span className="text-muted-foreground">Geographic Origin:</span> {text.geographic_origin}</div>}
                    {text.structure && <div><span className="text-muted-foreground">Structure:</span> {text.structure}</div>}
                  </div>
                  {themes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {themes.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-md text-xs bg-primary/15 text-primary">{t}</span>
                      ))}
                    </div>
                  )}
                  {text.historical_context && (
                    <p className="text-sm text-muted-foreground mt-3">{text.historical_context}</p>
                  )}
                  {translations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Available Translations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {translations.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-md text-xs bg-secondary/40">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reading Content */}
        {isFoundation ? (
          <FoundationTextReader text={text} textId={textId} />
        ) : text.full_text_available && text.full_text ? (
          chapters.length > 0 ? (
            <NativeTextReader
              text={text}
              chapters={chapters}
              onWordClick={handleWordClick}
              onPassageClick={handlePassageClick}
              onAddHighlight={handleAddHighlight}
              onBookmark={handleBookmark}
              bookmarks={bookmarks}
              highlights={highlights}
            />
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="glass-panel p-6 md:p-8 rounded-xl">
                {readingMode === 'focus' ? (
                  <div className="prose prose-invert max-w-none">
                    {passages.map((p, i) => (
                      <p key={i} className="text-foreground leading-relaxed mb-4 cursor-pointer hover:bg-secondary/20 rounded p-1 -m-1"
                         onClick={() => handlePassageClick(`Section ${i+1}`, p)}>
                        {p.split(/(\s+)/).map((part, j) => {
                          if (/\s/.test(part)) return part;
                          return <span key={j} className="hover:text-primary cursor-pointer" onClick={(e) => { e.stopPropagation(); handleWordClick(part); }}>{part}</span>;
                        })}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPassages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No passages match "{searchQuery}"</p>
                    ) : filteredPassages.map((p, i) => {
                      const passageRef = `Section ${i + 1}`;
                      const isBookmarked = bookmarks.some(b => b.passage_reference === passageRef);
                      return (
                        <div key={i} className="group relative">
                          <div
                            className="text-foreground leading-relaxed p-2 rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors"
                            onClick={() => handlePassageClick(passageRef, p)}
                          >
                            {p.split(/(\s+)/).map((part, j) => {
                              if (/\s/.test(part)) return part;
                              return (
                                <span
                                  key={j}
                                  className="hover:text-primary hover:underline cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); handleWordClick(part); }}
                                >
                                  {part}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleAddHighlight(p, passageRef)} className="p-1 rounded hover:bg-secondary/50" title="Highlight">
                              <Highlighter className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleBookmark(passageRef)} className="p-1 rounded hover:bg-secondary/50" title="Bookmark">
                              <BookMarked className={`w-3.5 h-3.5 ${isBookmarked ? 'text-accent' : 'text-muted-foreground'}`} />
                            </button>
                            <span className="text-xs text-muted-foreground ml-1">{passageRef}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="glass-panel p-8 text-center rounded-xl">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold mb-2">Native Acquisition Pending</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {text.full_text_unavailable_reason || 'The Content Acquisition Engine is working to acquire this resource as a native text.'}
              </p>
              {text.source_url && (
                <a href={text.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                  <ExternalLink className="w-3.5 h-3.5" /> View acquisition source
                </a>
              )}
              <div className="mt-6 p-4 rounded-lg bg-secondary/30 text-left">
                <p className="text-xs font-medium text-muted-foreground mb-2">What you can still do:</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(`Study: ${text.title}`)}&autoRun=true&source=library-reader`)}>
                    <GraduationCap className="w-4 h-4 mr-1" /> Start Study
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/spiritual/library/compare?query=${encodeURIComponent(`Compare ${text.title} with related texts`)}`)}>
                    <Columns2 className="w-4 h-4 mr-1" /> Compare
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tools Slide-out (for non-foundation texts) */}
      {showReaderControls && (
        <Sheet open={showTools} onOpenChange={setShowTools}>
          <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Reader Tools</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ReaderToolsPanel
                highlights={highlights}
                notes={notes}
                bookmarks={bookmarks}
                highlightCategory={highlightCategory}
                setHighlightCategory={setHighlightCategory}
                noteText={noteText}
                setNoteText={setNoteText}
                onAddNote={handleAddNote}
                activePassage={activePassage}
                setActivePassage={setActivePassage}
                onSelectWordFromPassage={handleSelectWordFromPassage}
                text={text}
                onNavigate={navigate}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <WordInteractionModal
        word={activeWord}
        textTitle={text.title}
        passageRef={activePassage?.ref || ''}
        onClose={() => setActiveWord(null)}
      />
    </div>
  );
}