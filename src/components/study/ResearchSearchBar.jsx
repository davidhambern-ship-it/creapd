import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

export default function ResearchSearchBar({ onSearch, disabled }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="What would you like to study today?"
          className="w-full h-14 pl-12 pr-32 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-lg"
        />
        <button
          type="submit"
          disabled={disabled || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {disabled && <Loader2 className="w-4 h-4 animate-spin" />}
          Research
        </button>
      </div>
    </form>
  );
}