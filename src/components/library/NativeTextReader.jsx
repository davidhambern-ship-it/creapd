import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen, List, ChevronLeft, ChevronRight, Highlighter, BookMarked,
  X, Search, Clock, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// NativeTextReader — renders structured chapters/sections/paragraphs with a TOC sidebar.
// This is the native reading experience for packaged LibraryText resources.
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
  const [showTOC, setShowTOC] = useState(false);
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

  // Filter paragraphs within the active chapter by search query
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
    setShowTOC(false);
    setTimeout(() => {
      chapterRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handlePrev = () => activeChapter > 0 && handleChapterSelect(activeChapter - 1);
  const handleNext = () => activeChapter < totalChapters - 1 && handleChapterSelect(activeChapter + 1);

  if (!chapters || chapters.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Chapter Navigation Bar */}
      <div className="flex items-center justify-between gap-3 glass-panel p-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setShowTOC(!showTOC)}
            className={`p-2 rounded-lg transition-colors ${showTOC ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/50'}`}
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              Chapter {activeChapter + 1} of {totalChapters}
            </p>
            <p className="text-sm font-medium truncate">{chapters[activeChapter]?.title || 'Untitled'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={handlePrev} disabled={activeChapter === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleNext} disabled={activeChapter >= totalChapters - 1}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search within text */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search within this text..."
          className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

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

      <div className="flex gap-4">
        {/* TOC Sidebar */}
        {showTOC && (
          <div className="hidden lg:block w-64 shrink-0">
            <div className="glass-panel p-3 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">Contents</h4>
                <button onClick={() => setShowTOC(false)} className="p-1 rounded hover:bg-secondary/50">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChapterSelect(idx)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                      idx === activeChapter
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                    }`}
                  >
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span> {ch.title || `Chapter ${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile TOC Dropdown */}
        {showTOC && (
          <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setShowTOC(false)}>
            <div className="glass-panel p-4 m-4 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-heading font-semibold">Table of Contents</h4>
                <button onClick={() => setShowTOC(false)} className="p-1 rounded hover:bg-secondary/50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChapterSelect(idx)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      idx === activeChapter ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-secondary/30'
                    }`}
                  >
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span> {ch.title || `Chapter ${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chapter Content */}
        <div className="flex-1 min-w-0">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={activeChapter === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {activeChapter + 1} / {totalChapters}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={activeChapter >= totalChapters - 1}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}