import React from 'react';
import { Link } from 'react-router-dom';
import { Languages, Star, BookOpen, GraduationCap, ArrowRight } from 'lucide-react';

const PANELS = [
  { key: 'continue', title: 'Continue Reading', icon: BookOpen, empty: 'No texts opened yet. Click a sacred text to begin reading.', hasViewAll: false },
  { key: 'research', title: 'Recent Research Projects', icon: GraduationCap, empty: 'No research projects yet. Start a study to build your library.', viewAll: '/spiritual/study' },
  { key: 'word_studies', title: 'Recent Word Studies', icon: Languages, empty: 'No word studies yet. Language research will appear here.', viewAll: '/spiritual/research' },
  { key: 'saved', title: 'Saved Collections', icon: Star, empty: 'No saved items yet. Save research to build personal collections.', viewAll: '/spiritual/research' }
];

export default function LibraryActivity({ recentlyRead, researchProjects, wordStudies, savedItems, onOpenText }) {
  const data = {
    continue: recentlyRead.map(t => ({ title: t, onClick: () => onOpenText(t) })),
    research: researchProjects.map(s => ({ title: s.title, subtitle: s.research_question, to: `/spiritual/study/${s.id}` })),
    word_studies: wordStudies.map(w => ({ title: w.title, subtitle: w.source, to: `/spiritual/research/${w.id}` })),
    saved: savedItems.map(s => ({ title: s.title, subtitle: s.source, to: `/spiritual/research/${s.id}` }))
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {PANELS.map(panel => {
        const Icon = panel.icon;
        const items = data[panel.key] || [];
        return (
          <div key={panel.key} className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" /> {panel.title}
              </h4>
              {panel.viewAll && items.length > 0 && (
                <Link to={panel.viewAll} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{panel.empty}</p>
            ) : (
              <div className="space-y-1.5">
                {items.slice(0, 4).map((item, i) => (
                  item.to ? (
                    <Link key={i} to={item.to} className="block p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                    </Link>
                  ) : (
                    <button key={i} onClick={item.onClick} className="block w-full text-left p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}