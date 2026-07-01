import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'John 3:16', 'What does Agape mean?', 'Sermon on the Mount',
  'Genesis 1', 'Psalm 23', 'History of Baptism'
];

export default function LibraryHero() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const doSearch = (q) => {
    navigate(`/spiritual/study?query=${encodeURIComponent(q)}&autoRun=true&source=library-search`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    doSearch(query.trim());
  };

  return (
    <div className="glass-panel p-8 md:p-10 mb-6 border-primary/20 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-3xl font-heading font-bold mb-2">World Scripture Library</h1>
      <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
        What would you like to learn today? Search across sacred texts, languages, manuscripts, and research collections.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books, passages, words, languages, topics..."
          className="flex-1 h-11 rounded-lg border border-input bg-background/50 px-4 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button type="submit" className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Search className="w-4 h-4" /> Search
        </button>
      </form>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => doSearch(s)}
            className="px-3 py-1.5 rounded-lg text-xs bg-secondary/30 border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}