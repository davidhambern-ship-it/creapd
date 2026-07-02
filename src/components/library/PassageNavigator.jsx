import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, X } from 'lucide-react';

function getNavLabels(tradition) {
  const t = (tradition || '').toLowerCase();
  if (t.includes('islam') || t.includes('muslim') || t.includes('quran')) {
    return { bookLabel: 'Surah', chapterLabel: 'Ayah', verseLabel: 'Verse' };
  }
  if (t.includes('christ') || t.includes('bible')) {
    return { bookLabel: 'Book', chapterLabel: 'Chapter', verseLabel: 'Verse' };
  }
  return { bookLabel: 'Section', chapterLabel: 'Chapter', verseLabel: 'Segment' };
}

export default function PassageNavigator({ open, onClose, chapters, onSelect, tradition }) {
  const [step, setStep] = useState('book');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  const labels = getNavLabels(tradition);

  const bookGroups = useMemo(() => {
    return chapters.reduce((acc, ch) => {
      const book = ch.book_name || labels.bookLabel;
      if (!acc[book]) acc[book] = [];
      acc[book].push(ch);
      return acc;
    }, {});
  }, [chapters, labels.bookLabel]);

  const bookNames = Object.keys(bookGroups);
  const hasMultipleBooks = bookNames.length > 1;

  useEffect(() => {
    if (open) {
      setStep(hasMultipleBooks ? 'book' : 'chapter');
      setSelectedBook(null);
      setSelectedChapter(null);
    }
  }, [open, hasMultipleBooks]);

  if (!open) return null;

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setStep('chapter');
  };

  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter);
    if (chapter.verse_count > 0) {
      setStep('verse');
    } else {
      handleComplete(chapter, null);
    }
  };

  const handleVerseSelect = (verseNumber) => {
    handleComplete(selectedChapter, verseNumber);
  };

  const handleComplete = (chapter, verseNumber) => {
    onSelect(chapter, verseNumber);
    setStep(hasMultipleBooks ? 'book' : 'chapter');
    setSelectedBook(null);
    setSelectedChapter(null);
    onClose();
  };

  const handleBack = () => {
    if (step === 'verse') { setStep('chapter'); setSelectedChapter(null); }
    else if (step === 'chapter' && hasMultipleBooks) { setStep('book'); setSelectedBook(null); }
  };

  const chaptersToShow = selectedBook ? bookGroups[selectedBook] : (hasMultipleBooks ? [] : chapters);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="glass-panel-navy w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border border-white/[0.08]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== (hasMultipleBooks ? 'book' : 'chapter') && (
              <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-secondary/50">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <p className="text-xs text-muted-foreground">
                {step === 'book' && `Step 1 of 3`}
                {step === 'chapter' && `Step 2 of 3`}
                {step === 'verse' && `Step 3 of 3`}
              </p>
              <h2 className="font-heading font-semibold text-sm">
                {step === 'book' && `Choose ${labels.bookLabel}`}
                {step === 'chapter' && (selectedBook ? selectedBook : `Choose ${labels.chapterLabel}`)}
                {step === 'verse' && `Choose ${labels.verseLabel}`}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'book' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bookNames.map(book => (
                <button
                  key={book}
                  onClick={() => handleBookSelect(book)}
                  className="p-3 rounded-lg bg-secondary/30 hover:bg-primary/20 hover:text-primary transition-colors text-left"
                >
                  <p className="text-sm font-medium truncate">{book}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bookGroups[book].length} {labels.chapterLabel.toLowerCase()}s
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 'chapter' && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {chaptersToShow.map(chapter => {
                const chapterNum = chapter.chapter_number || chapter.order + 1;
                return (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterSelect(chapter)}
                    className="aspect-square flex items-center justify-center rounded-lg text-sm font-medium bg-secondary/30 hover:bg-primary/20 hover:text-primary transition-colors"
                    title={chapter.name}
                  >
                    {chapterNum}
                  </button>
                );
              })}
            </div>
          )}

          {step === 'verse' && selectedChapter && (
            <div>
              <p className="text-xs text-muted-foreground mb-3 text-center">
                {selectedChapter.name} — {selectedChapter.verse_count} {labels.verseLabel.toLowerCase()}s
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {Array.from({ length: selectedChapter.verse_count }, (_, i) => i + 1).map(verseNum => (
                  <button
                    key={verseNum}
                    onClick={() => handleVerseSelect(verseNum)}
                    className="aspect-square flex items-center justify-center rounded-lg text-sm font-medium bg-secondary/30 hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    {verseNum}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}