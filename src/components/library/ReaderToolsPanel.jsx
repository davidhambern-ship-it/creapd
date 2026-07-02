import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Highlighter, StickyNote, BookMarked, Zap, X,
  GraduationCap, Columns2
} from 'lucide-react';
import { HIGHLIGHT_CATEGORIES } from '@/lib/spiritualConstants';
import PassageActions from '@/components/library/PassageActions';
import CreateMessageButton from '@/components/message/CreateMessageButton';

const TABS = [
  { key: 'highlights', label: 'Highlights', icon: Highlighter },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'bookmarks', label: 'Bookmarks', icon: BookMarked },
  { key: 'actions', label: 'Actions', icon: Zap },
];

export default function ReaderToolsPanel({
  highlights, notes, bookmarks,
  highlightCategory, setHighlightCategory,
  noteText, setNoteText, onAddNote,
  activePassage, setActivePassage, onSelectWordFromPassage,
  text, onNavigate, activeTab, setActiveTab
}) {
  return (
    <div className="glass-panel flex flex-col lg:h-full lg:overflow-hidden rounded-xl">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] px-2 pt-2 flex-shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-foreground border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 lg:overflow-y-auto p-4 space-y-3">
        {activeTab === 'highlights' && (
          <>
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
            <div>
              {highlights.length === 0 ? (
                <p className="text-xs text-muted-foreground">Click the highlighter icon on any passage to save it here.</p>
              ) : (
                <div className="space-y-2">
                  {highlights.slice(0, 20).map(h => {
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
          </>
        )}

        {activeTab === 'notes' && (
          <>
            {activePassage && (
              <div className="glass-panel p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-primary">{activePassage.ref}</p>
                  <button onClick={() => setActivePassage(null)} className="p-1 rounded hover:bg-secondary/50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <PassageActions
                  textTitle={text.title}
                  passageRef={activePassage.ref}
                  onSelectWord={onSelectWordFromPassage}
                  onClose={() => setActivePassage(null)}
                />
                <div className="mt-2">
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
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">All Notes ({notes.length})</p>
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Select a passage and write notes about it.</p>
              ) : (
                <div className="space-y-2">
                  {notes.slice(0, 20).map(n => (
                    <div key={n.id} className="p-2 rounded-md bg-secondary/30">
                      {n.passage_reference && <p className="text-xs text-primary mb-1">{n.passage_reference}</p>}
                      <p className="text-xs text-muted-foreground line-clamp-4">{n.note_content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'bookmarks' && (
          <div>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Bookmark passages to return to them later.</p>
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

        {activeTab === 'actions' && (
          <div className="space-y-1.5">
            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => onNavigate(`/spiritual/study?query=${encodeURIComponent(`Study: ${text.title}`)}&autoRun=true&source=library-reader`)}>
              <GraduationCap className="w-4 h-4 mr-2" /> Start Study Workspace
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => onNavigate(`/spiritual/library/compare?query=${encodeURIComponent(`Compare ${text.title} with related texts`)}`)}>
              <Columns2 className="w-4 h-4 mr-2" /> Compare This Text
            </Button>
            <CreateMessageButton
              context={{
                title: `Message: ${text.title}`,
                topic: text.title,
                faith_tradition: text.tradition,
                study_topics: JSON.stringify([text.title]),
              }}
              variant="outline"
              size="sm"
              className="w-full justify-start"
              label="Create Message"
            />
          </div>
        )}
      </div>
    </div>
  );
}