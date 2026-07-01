import React from 'react';
import { Languages } from 'lucide-react';

export default function WordStudyCard({ word }) {
  return (
    <div className="p-4 rounded-lg bg-secondary/30 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Languages className="w-4 h-4 text-primary" />
            <span className="text-lg font-heading font-bold">{word.word}</span>
            {word.transliteration && (
              <span className="text-sm text-muted-foreground italic">{word.transliteration}</span>
            )}
          </div>
          {word.language && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{word.language}</span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {word.literal_meaning && <Field label="Literal Meaning" value={word.literal_meaning} />}
        {word.definitions && <Field label="Definitions" value={word.definitions} />}
        {word.grammar && <Field label="Grammar" value={word.grammar} />}
        {word.root && <Field label="Root" value={word.root} />}
        {word.word_family && <Field label="Word Family" value={word.word_family} />}
        {word.occurrences && <Field label="Occurrences" value={word.occurrences} />}
        {word.translation_differences && <Field label="Translation Differences" value={word.translation_differences} />}
        {word.lexicon_sources && <Field label="Lexicon Sources" value={word.lexicon_sources} />}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className="text-foreground/90">{value}</p>
    </div>
  );
}