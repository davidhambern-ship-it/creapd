import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ScrollText, FileText, BookMarked, Languages, Library,
  Map, Clock, Building2, GraduationCap, FolderOpen, Star, ArrowRight
} from 'lucide-react';
import { LIBRARY_COLLECTIONS } from '@/lib/spiritualConstants';

const ICON_MAP = {
  BookOpen, ScrollText, FileText, BookMarked, Languages, Library,
  Map, Clock, Building2, GraduationCap, FolderOpen, Star
};

export default function LibraryCollections({ sacredTexts, onOpenText }) {
  const navigate = useNavigate();

  const handleCollection = (collection) => {
    if (collection.key === 'sacred_scriptures' && sacredTexts.length > 0) return;
    navigate(`/spiritual/study?query=${encodeURIComponent(`Explore ${collection.label}`)}&autoRun=true&source=library-collection`);
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Library Collections
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LIBRARY_COLLECTIONS.map(collection => {
          const Icon = ICON_MAP[collection.icon] || BookOpen;
          const isSacred = collection.key === 'sacred_scriptures';
          const count = isSacred ? sacredTexts.length : null;
          return (
            <div
              key={collection.key}
              onClick={() => handleCollection(collection)}
              className="glass-panel p-4 cursor-pointer hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-heading font-semibold text-sm mb-1 flex items-center gap-1">
                    {collection.label}
                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{collection.description}</p>
                  {isSacred && sacredTexts.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {sacredTexts.slice(0, 4).map(text => (
                        <button
                          key={text}
                          onClick={(e) => { e.stopPropagation(); onOpenText(text); }}
                          className="flex items-center gap-1.5 w-full text-left p-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <BookMarked className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate">{text}</span>
                        </button>
                      ))}
                      {sacredTexts.length > 4 && (
                        <p className="text-xs text-muted-foreground pl-1">+{sacredTexts.length - 4} more</p>
                      )}
                    </div>
                  ) : count !== null ? (
                    <p className="text-xs text-muted-foreground mt-2">{count} {count === 1 ? 'text' : 'texts'} available</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}