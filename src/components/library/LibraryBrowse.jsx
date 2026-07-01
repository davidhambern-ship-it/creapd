import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Languages, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import {
  FAITH_TRADITIONS, LIBRARY_LANGUAGES, LIBRARY_HISTORICAL_PERIODS, LIBRARY_REGIONS
} from '@/lib/spiritualConstants';

const BROWSE_SECTIONS = [
  { key: 'tradition', label: 'Faith Tradition', icon: Globe, items: FAITH_TRADITIONS },
  { key: 'language', label: 'Language', icon: Languages, items: LIBRARY_LANGUAGES },
  { key: 'period', label: 'Historical Period', icon: Clock, items: LIBRARY_HISTORICAL_PERIODS },
  { key: 'region', label: 'Region', icon: MapPin, items: LIBRARY_REGIONS }
];

export default function LibraryBrowse() {
  const [expanded, setExpanded] = useState('tradition');
  const navigate = useNavigate();

  const handleSelect = (sectionLabel, item) => {
    navigate(`/spiritual/study?query=${encodeURIComponent(`Browse ${sectionLabel}: ${item}`)}&autoRun=true&source=library-browse`);
  };

  const activeSection = BROWSE_SECTIONS.find(s => s.key === expanded);

  return (
    <div className="glass-panel p-5 mb-6">
      <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Browse the Library
      </h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {BROWSE_SECTIONS.map(section => {
          const Icon = section.icon;
          const isExpanded = expanded === section.key;
          return (
            <button
              key={section.key}
              onClick={() => setExpanded(isExpanded ? null : section.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isExpanded ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {section.label}
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
      {activeSection && (
        <div className="flex flex-wrap gap-2">
          {activeSection.items.map(item => (
            <button
              key={item}
              onClick={() => handleSelect(activeSection.label, item)}
              className="px-3 py-1.5 rounded-lg text-xs bg-secondary/40 border border-border text-foreground hover:border-primary/40 hover:bg-primary/10 transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}