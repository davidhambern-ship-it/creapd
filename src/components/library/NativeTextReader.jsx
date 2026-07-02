import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, Highlighter, BookMarked,
  X, Search, Clock, FileText, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NativeTextReader({
  text,
  chapters,
  onWordClick,
  onPassageClick,
  onAddHighlight,
  onBookmark,
  bookmarks = [],
  highlights = []
}) {
  const [activeChapter, setActiveChapter] = useState(0);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const chapterRefs = useRef([]);

  const toc = useMemo(() => {
    try {
      const parsed = JSON.parse(text.table_of_contents || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return chapters.map((ch, idx) => ({ chapter_number: idx + 1, title: ch.title }));
    }
  }, [text.table_of_contents, chapters]);

  const totalChapters = chapters.length;

  const filteredChapter = useMemo(() => {
    const chapter = chapters[activeChapter];
    if (!chapter) return null;
    if (!searchQuery) return chapter;
    const filteredSections = (chapter.sections || []).map(section => ({
      ...section,
      paragraphs: (section.paragraphs || []).filter(p =>
        p.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(s => s.paragraphs.length > 0);
    return { ...chapter, sections: filteredSections };
  }, [chapters, activeChapter, searchQuery]);

  const handleChapterSelect = (idx) => {
    setActiveChapter(idx);
    setShowChapterPicker(false);
    setSearchQuery('');
    setTimeout(() => {
      chapterRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handlePrev = () => activeChapter > 0 && handleChapterSelect(activeChapter - 1);
  const handleNext = () => activeChapter < totalChapters - 1 && handleChapterSelect(activeChapter + 1);

  if (!chapters || chapters.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Sub-header: chapter info + Navigate + prev/next */}
      <div className="glass-panel p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Chapter {activeChapter + 1} of {totalChapters}
          </p>
          <p className="text-sm font-medium truncate">{chapters[activeChapter]?.title || 'Untitled'}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={() => setShowChapterPicker(true)}>
            <Navigation className="w-3.5 h-3.5 mr-1.5" /> Navigate
          </Button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50'}`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <Button size="icon" variant="ghost" onClick={handlePrev} disabled={activeChapter === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleNext} disabled={activeChapter >= totalChapters - 1}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search (collapsible) */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search within this text..."
            className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary/50">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Reading Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {text.word_count > 0 && (
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {text.word_count.toLocaleString()} words</span>
        )}
        {text.reading_time_minutes > 0 && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {text.reading_time_minutes} min read</span>
        )}
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {totalChapters} chapters</span>
      </div>

      {/* Chapter Content */}
      <div ref={el => chapterRefs.current[activeChapter] = el} className="glass-panel p-6 md:p-8">
        <h2 className="font-heading font-bold text-xl mb-6 text-primary">
          {chapters[activeChapter]?.title || `Chapter ${activeChapter + 1}`}
        </h2>

        {filteredChapter && filteredChapter.sections ? (
          <div className="space-y-6">
            {filteredChapter.sections.map((section, sIdx) => (
              <div key={sIdx}>
                {section.title && (
                  <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-4">
                  {(section.paragraphs || []).map((para, pIdx) => {
                    const passageRef = `Ch ${activeChapter + 1}, Sec ${sIdx + 1}, Para ${pIdx + 1}`;
                    const isBookmarked = bookmarks.some(b => b.passage_reference === passageRef);
                    return (
                      <div key={pIdx} className="group relative">
                        <div
                          className="text-foreground leading-relaxed p-2 rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors"
                          onClick={() => onPassageClick?.(passageRef, para)}
                        >
                          {para.split(/(\s+)/).map((part, j) => {
                            if (/\s/.test(part)) return part;
                            return (
                              <span
                                key={j}
                                className="hover:text-primary hover:underline cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); onWordClick?.(part); }}
                              >
                                {part}
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onAddHighlight?.(para, passageRef)}
                            className="p-1 rounded hover:bg-secondary/50"
                            title="Highlight"
                          >
                            <Highlighter className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => onBookmark?.(passageRef)}
                            className="p-1 rounded hover:bg-secondary/50"
                            title="Bookmark"
                          >
                            <BookMarked className={`w-3.5 h-3.5 ${isBookmarked ? 'text-accent' : 'text-muted-foreground'}`} />
                          </button>
                          <span className="text-xs text-muted-foreground ml-1">{passageRef}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {searchQuery ? `No passages match "${searchQuery}" in this chapter` : 'No content in this chapter.'}
          </p>
        )}

        {/* Chapter Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={handlePrev} disabled={activeChapter === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">{activeChapter + 1} / {totalChapters}</span>
          <Button variant="outline" size="sm" onClick={handleNext} disabled={activeChapter >= totalChapters - 1}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Chapter Picker Modal */}
      {showChapterPicker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowChapterPicker(false)}>
          <div
            className="glass-panel-navy w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border border-white/[0.08]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div>
                <p className="text-xs text-muted-foreground">Choose Chapter</p>
                <h2 className="font-heading font-semibold text-sm">{totalChapters} Chapters</h2>
              </div>
              <button onClick={() => setShowChapterPicker(false)} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChapterSelect(idx)}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      idx === activeChapter
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary/30 hover:bg-primary/20 hover:text-primary'
                    }`}
                  >
                    <span className="text-xs text-muted-foreground mr-2">{idx + 1}.</span>
                    <span className="text-sm font-medium">{ch.title || `Chapter ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}