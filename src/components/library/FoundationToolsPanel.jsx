import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Highlighter, StickyNote, BookMarked, Copy, Check } from 'lucide-react';
import { HIGHLIGHT_CATEGORIES } from '@/lib/spiritualConstants';

const TABS = [
  { key: 'highlights', label: 'Highlights', icon: Highlighter },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'bookmarks', label: 'Bookmarks', icon: BookMarked },
];

export default function FoundationToolsPanel({
  highlights, notes, bookmarks,
  highlightCategory, setHighlightCategory,
  noteText, setNoteText, onAddNote,
  selectedVerse, setSelectedVerse,
  onAddHighlight, onBookmark, onCopy, copiedRef
}) {
  const [activeTab, setActiveTab] = useState('highlights');

  return (
    <div className="mt-4 space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className="text-muted-foreground/60">
                {tab.key === 'highlights' ? highlights.length : tab.key === 'notes' ? notes.length : bookmarks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Highlights Tab */}
      {activeTab === 'highlights' && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
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
          {highlights.length === 0 ? (
            <p className="text-xs text-muted-foreground">Click the highlighter icon on any verse to save it here.</p>
          ) : (
            <div className="space-y-2">
              {highlights.slice(0, 20).map(h => {
                const cat = HIGHLIGHT_CATEGORIES.find(c => c.key === h.highlight_category);
                return (
                  <div key={h.id} className="p-2 rounded-md bg-secondary/30">
                    <div className="flex items-center gap-1 mb-1">
                      {cat && <span className={`px-1.5 py-0.5 rounded text-xs ${cat.color}`}>{cat.label}</span>}
                      {h.passage_reference && <span className="text-xs text-primary font-medium">{h.passage_reference}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{h.highlighted_text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {selectedVerse && (
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="text-xs font-medium text-primary mb-2">{selectedVerse.verse_reference}</p>
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write your note..."
                rows={2}
                className="mb-2"
              />
              <Button size="sm" onClick={onAddNote} disabled={!noteText.trim()} className="w-full">
                <StickyNote className="w-3.5 h-3.5 mr-1" /> Save Note
              </Button>
            </div>
          )}
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Select a verse and write a note.</p>
          ) : (
            <div className="space-y-2">
              {notes.slice(0, 20).map(n => (
                <div key={n.id} className="p-2 rounded-md bg-secondary/30">
                  {n.passage_reference && <p className="text-xs text-primary font-medium mb-1">{n.passage_reference}</p>}
                  <p className="text-xs text-muted-foreground line-clamp-3">{n.note_content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookmarks Tab */}
      {activeTab === 'bookmarks' && (
        <div>
          {bookmarks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bookmark verses to return to them.</p>
          ) : (
            <div className="space-y-1">
              {bookmarks.map(b => (
                <div key={b.id} className="flex items-center gap-2 p-1.5 rounded-md bg-secondary/30 text-xs">
                  <BookMarked className="w-3 h-3 text-accent shrink-0" />
                  <span className="truncate">{b.passage_reference}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}