import React from 'react';
import { cn } from '@/lib/utils';

const BOOK_COLORS = [
  'from-amber-700/60 to-amber-900/60',
  'from-emerald-700/60 to-emerald-900/60',
  'from-violet-700/60 to-violet-900/60',
  'from-rose-700/60 to-rose-900/60',
  'from-cyan-700/60 to-cyan-900/60',
  'from-blue-700/60 to-blue-900/60',
  'from-pink-700/60 to-pink-900/60',
  'from-teal-700/60 to-teal-900/60',
];

export default function Bookshelf({ categories, onBookSelect, selectedTopicId }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <p className="text-xs text-muted-foreground">The library shelves are empty. Define a research topic to populate the shelves.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((cat, catIdx) => (
        <div key={catIdx} className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-amber-400/70 font-heading font-semibold">{cat.name}</span>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 to-transparent" />
          </div>

          <div className="relative">
            {/* Shelf background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-lg" />

            {/* Books */}
            <div className="relative flex items-end gap-0.5 px-3 py-3 overflow-x-auto min-h-[120px]">
              {Array.from({ length: Math.max(cat.topics.length * 5, 15) }).map((_, bookIdx) => {
                const topicIndex = Math.floor(bookIdx / 5);
                const isInteractive = bookIdx % 5 === 4 && topicIndex < cat.topics.length;
                const topic = isInteractive ? cat.topics[topicIndex] : null;
                const isSelected = topic && selectedTopicId === topic.id;
                const colorIdx = (bookIdx + catIdx) % BOOK_COLORS.length;
                const height = 80 + ((bookIdx * 7) % 30);

                return (
                  <button
                    key={bookIdx}
                    onClick={() => isInteractive && topic && onBookSelect(topic)}
                    disabled={!isInteractive}
                    className={cn(
                      'relative flex-shrink-0 rounded-t-sm transition-all duration-300',
                      isInteractive ? 'cursor-pointer' : 'cursor-default',
                      `bg-gradient-to-b ${BOOK_COLORS[colorIdx]}`,
                      isInteractive && !isSelected && 'hover:-translate-y-2 hover:shadow-lg hover:shadow-amber-500/20 hover:brightness-125',
                      isSelected && '-translate-y-3 shadow-lg shadow-amber-500/30 brightness-125 ring-1 ring-amber-400/40'
                    )}
                    style={{
                      width: isInteractive ? 14 : 10,
                      height,
                    }}
                  >
                    {isInteractive && (
                      <>
                        <span className="absolute inset-x-0 top-1 h-px bg-white/20" />
                        <span className="absolute inset-x-0 bottom-1 h-px bg-black/30" />
                        <span
                          className="absolute top-1/2 left-1/2 text-[7px] font-bold text-white/80 whitespace-nowrap"
                          style={{ transform: 'translate(-50%, -50%) rotate(90deg)' }}
                        >
                          {topic?.title?.slice(0, 20)}
                        </span>
                        {isInteractive && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Shelf board */}
            <div className="h-2 bg-gradient-to-b from-amber-900/40 to-amber-950/60 rounded-sm border-t border-amber-700/20" />
          </div>
        </div>
      ))}
    </div>
  );
}