import React, { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';

const SUGGESTIONS = [
  'Show me every occurrence of Agape',
  'Compare the Bhagavad Gita and Proverbs',
  'Where is forgiveness discussed?',
  'Read the Gospel of John',
  'Learn the Greek alphabet'
];

export default function LibraryHero({ onSearch, searching }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
  };

  const handleSuggestion = (s) => {
    setQuery(s);
    onSearch(s);
  };

  return (
    <div className="glass-panel p-8 md:p-10 mb-6 border-primary/20 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-3xl font-heading font-bold mb-2">World Scripture Library</h1>
      <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
        What would you like to explore today? Search across sacred texts, languages, manuscripts, and research collections.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books, passages, words, languages, topics..."
          className="flex-1 h-11 rounded-lg border border-input bg-background/50 px-4 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button type="submit" disabled={searching} className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
        </button>
      </form>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            disabled={searching}
            className="px-3 py-1.5 rounded-lg text-xs bg-secondary/30 border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}