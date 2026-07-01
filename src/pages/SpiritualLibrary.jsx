import React from 'react';
import { Link } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, BookMarked, Search, Library } from 'lucide-react';

export default function SpiritualLibrary() {
  const { config, loading } = useSpiritualProduction();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  let sacredTexts = [];
  try { sacredTexts = JSON.parse(config.sacred_texts || '[]'); } catch { sacredTexts = []; }

  const librarySections = [
    { label: 'Sacred Texts', icon: BookOpen, count: sacredTexts.length },
    { label: 'Translations', icon: Library, count: config.default_translation ? 1 : 0 },
    { label: 'Original Languages', icon: Search, count: '—' },
    { label: 'Cross References', icon: BookMarked, count: '—' },
    { label: 'Historical Resources', icon: Library, count: '—' },
    { label: 'Maps', icon: BookMarked, count: '—' },
    { label: 'Timelines', icon: Library, count: '—' },
    { label: 'Commentaries', icon: BookOpen, count: '—' },
    { label: 'Word Studies', icon: Search, count: '—' },
    { label: 'Reference Library', icon: Library, count: '—' }
  ];

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold mb-1">Sacred Text Library</h1>
          <p className="text-sm text-muted-foreground">{config.faith_tradition} · {config.branch_denomination}</p>
        </div>

        <div className="glass-panel p-5 mb-6 border-primary/20">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Default Translation: {config.default_translation || 'Default'}</p>
              <p className="text-xs text-muted-foreground">Used throughout the production unless another version is specifically requested.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {librarySections.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.label} className="glass-panel p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="font-heading font-semibold">{section.label}</h3>
                </div>
                {section.label === 'Sacred Texts' && sacredTexts.length > 0 ? (
                  <div className="space-y-1">
                    {sacredTexts.map(text => (
                      <div key={text} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                        <BookMarked className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{section.count} {typeof section.count === 'number' ? 'items' : ''}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-3">Passage Search</h3>
          <p className="text-sm text-muted-foreground mb-4">Search by book, chapter, verse, topic, keyword, or reference.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search passages..."
              className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button size="sm"><Search className="w-4 h-4 mr-1" /> Search</Button>
          </div>
        </div>
      </div>
    </div>
  );
}