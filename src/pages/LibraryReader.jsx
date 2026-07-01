import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, ChevronLeft, BookOpen, BookMarked, Languages, Highlighter,
  StickyNote, Search, X, Shield, ExternalLink, ChevronDown, ChevronUp,
  Columns2, GraduationCap
} from 'lucide-react';
import SourceIntegrityBadge from '@/components/library/SourceIntegrityBadge';
import PassageActions from '@/components/library/PassageActions';
import WordInteractionModal from '@/components/library/WordInteractionModal';
import { HIGHLIGHT_CATEGORIES, READING_MODES } from '@/lib/spiritualConstants';

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
  const [showSourceIntegrity, setShowSourceIntegrity] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readingMode, setReadingMode] = useState('reading');
  const [noteText, setNoteText] = useState('');
  const [highlightCategory, setHighlightCategory] = useState('important');

  const loadText = useCallback(async () => {
    if (!textId) return;
    setLoading(true);
    try {
      const t = await base44.entities.LibraryText.get(textId);
      setText(t);
      const [h, n, b] = await Promise.all([
        base44.entities.LibraryHighlight.filter({ text_id: textId }, '-created_date', 50).catch(() => []),
        base44.entities.LibraryNote.filter({ text_id: textId }, '-created_date', 50).catch(() => []),
        base44.entities.LibraryBookmark.filter({ text_id: textId }, '-created_date', 50).catch(() => [])
      ]);
      setHighlights(h || []);
      setNotes(n || []);
      setBookmarks(b || []);
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
    } catch (err) { console.error(err); }
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

  // Split text into passages for interactivity
  const passages = (text.full_text || '').split(/\n\n+/).filter(p => p.trim());

  const filteredPassages = searchQuery
    ? passages.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    : passages;

  return (
    <div className="min-h-screen bg-background">
      {/* Reader Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate('/spiritual/library')} className="p-1.5 rounded-lg hover:bg-secondary/50">
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
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50'}`}
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSourceIntegrity(!showSourceIntegrity)}
                className={`p-2 rounded-lg transition-colors ${showSourceIntegrity ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50'}`}
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search within this text..."
              className="w-full mt-2 h-9 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}

          {/* Reading Modes */}
          <div className="flex items-center gap-1 mt-2 overflow-x-auto">
            {READING_MODES.map(mode => (
              <button
                key={mode.key}
                onClick={() => setReadingMode(mode.key)}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                  readingMode === mode.key ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Reading Area */}
        <div className="lg:col-span-2">
          {showSourceIntegrity && (
            <div className="mb-4">
              <SourceIntegrityBadge text={text} />
            </div>
          )}

          {/* Text Profile */}
          <div className="glass-panel p-5 mb-4">
            <h2 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Text Profile
            </h2>
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

          {/* Reading Area */}
          {text.full_text_available && text.full_text ? (
            <div className="glass-panel p-6 md:p-8">
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
          ) : (
            <div className="glass-panel p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold mb-2">Full Text Not Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {text.full_text_unavailable_reason || 'This text is available as metadata only due to licensing or access restrictions.'}
              </p>
              {text.source_url && (
                <a href={text.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" /> Access Official Source
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
          )}

          {/* Passage Actions Panel */}
          {activePassage && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-heading font-semibold">Passage: {activePassage.ref}</h3>
                <button onClick={() => setActivePassage(null)} className="p-1 rounded hover:bg-secondary/50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <PassageActions
                textTitle={text.title}
                passageRef={activePassage.ref}
                onSelectWord={() => { const words = activePassage.text.split(/\s+/).filter(w => w.length > 3); if (words.length > 0) setActiveWord(words[0].replace(/[^\p{L}\p{M}]/gu, '')); }}
                onClose={() => setActivePassage(null)}
              />

              {/* Note input for this passage */}
              <div className="glass-panel p-3 mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Add Note to {activePassage.ref}</p>
                <Textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Write your note..."
                  rows={2}
                  className="mb-2"
                />
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                  <StickyNote className="w-3.5 h-3.5 mr-1" /> Save Note
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Highlights, Notes, Bookmarks */}
        <div className="space-y-4">
          {/* Highlight selector */}
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
              <p className="text-xs text-muted-foreground">Click the highlighter icon on any passage to save it here.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {highlights.slice(0, 10).map(h => {
                  const cat = HIGHLIGHT_CATEGORIES.find(c => c.key === h.highlight_category);
                  return (
                    <div key={h.id} className="p-2 rounded-md bg-secondary/30">
                      <div className="flex items-center gap-1 mb-1">
                        {cat && <span className={`px-1.5 py-0.5 rounded text-xs ${cat.color}`}>{cat.label}</span>}
                        {h.passage_reference && <span className="text-xs text-muted-foreground">{h.passage_reference}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{h.highlighted_text}</p>
                    </div>
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
              <p className="text-xs text-muted-foreground">Select a passage and write notes about it.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.slice(0, 10).map(n => (
                  <div key={n.id} className="p-2 rounded-md bg-secondary/30">
                    {n.passage_reference && <p className="text-xs text-primary mb-1">{n.passage_reference}</p>}
                    <p className="text-xs text-muted-foreground line-clamp-4">{n.note_content}</p>
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
              <p className="text-xs text-muted-foreground">Bookmark passages to return to them later.</p>
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

          {/* Quick Actions */}
          <div className="glass-panel p-4">
            <h4 className="font-heading font-semibold text-sm mb-3">Actions</h4>
            <div className="space-y-1.5">
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(`Study: ${text.title}`)}&autoRun=true&source=library-reader`)}>
                <GraduationCap className="w-4 h-4 mr-2" /> Start Study Workspace
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => navigate(`/spiritual/library/compare?query=${encodeURIComponent(`Compare ${text.title} with related texts`)}`)}>
                <Columns2 className="w-4 h-4 mr-2" /> Compare This Text
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => navigate('/spiritual/message')}>
                <BookOpen className="w-4 h-4 mr-2" /> Open Message Builder
              </Button>
            </div>
          </div>
        </div>
      </div>

      <WordInteractionModal
        word={activeWord}
        textTitle={text.title}
        passageRef={activePassage?.ref || ''}
        onClose={() => setActiveWord(null)}
      />
    </div>
  );
}