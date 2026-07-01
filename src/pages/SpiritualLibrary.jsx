import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, GraduationCap, Sparkles, Languages, ArrowRight } from 'lucide-react';
import LibraryHero from '@/components/library/LibraryHero';
import LibraryBrowse from '@/components/library/LibraryBrowse';
import LibraryCollections from '@/components/library/LibraryCollections';
import LibraryActivity from '@/components/library/LibraryActivity';
import LibraryReaderModal from '@/components/library/LibraryReaderModal';

const RECENTLY_READ_KEY = 'wsLibrary_recentlyRead';

export default function SpiritualLibrary() {
  const { config, loading } = useSpiritualProduction();
  const navigate = useNavigate();
  const [recentlyRead, setRecentlyRead] = useState([]);
  const [researchProjects, setResearchProjects] = useState([]);
  const [wordStudies, setWordStudies] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [readerText, setReaderText] = useState(null);

  const sacredTexts = (() => {
    try { return JSON.parse(config?.sacred_texts || '[]'); } catch { return []; }
  })();

  const loadActivity = useCallback(async () => {
    if (!config) return;
    try {
      const [sessions, wordItems, saved] = await Promise.all([
        base44.entities.ResearchSession.list('-created_date', 5),
        base44.entities.SpiritualResearchItem.filter({ source_type: 'language_study' }, '-created_date', 5),
        base44.entities.SpiritualResearchItem.filter({ is_saved: true }, '-created_date', 5)
      ]);
      setResearchProjects(sessions || []);
      setWordStudies(wordItems || []);
      setSavedItems(saved || []);
    } catch {}
  }, [config]);

  useEffect(() => {
    try { setRecentlyRead(JSON.parse(localStorage.getItem(RECENTLY_READ_KEY) || '[]')); } catch { setRecentlyRead([]); }
    loadActivity();
  }, [loadActivity]);

  const handleOpenText = (text) => {
    const updated = [text, ...recentlyRead.filter(t => t !== text)].slice(0, 8);
    setRecentlyRead(updated);
    localStorage.setItem(RECENTLY_READ_KEY, JSON.stringify(updated));
    setReaderText(text);
  };

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

  const studyTopics = (() => {
    try { return JSON.parse(config.study_topics || '[]'); } catch { return []; }
  })();
  const recommended = [
    ...sacredTexts.slice(0, 3).map(t => ({ title: `Deep dive: ${t}`, type: 'Scripture' })),
    ...studyTopics.slice(0, 3).map(t => ({ title: `Study: ${t}`, type: 'Topic' }))
  ].slice(0, 6);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <LibraryHero />

        <div className="glass-panel p-4 mb-6 border-primary/20 flex items-center gap-3">
          <Languages className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">Default Translation: {config.default_translation || 'Default'}</p>
            <p className="text-xs text-muted-foreground">Used throughout the library and production unless another version is specified.</p>
          </div>
        </div>

        <LibraryBrowse />

        <LibraryCollections sacredTexts={sacredTexts} onOpenText={handleOpenText} />

        <LibraryActivity
          recentlyRead={recentlyRead}
          researchProjects={researchProjects}
          wordStudies={wordStudies}
          savedItems={savedItems}
          onOpenText={handleOpenText}
        />

        {recommended.length > 0 && (
          <div className="glass-panel p-5 mb-6">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Recommended Studies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {recommended.map((rec, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(rec.title)}&autoRun=true&source=library-recommended`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 border border-transparent transition-all text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">{rec.type}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="glass-panel p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">Language Learning</h3>
              <p className="text-xs text-muted-foreground">Learn original languages — Hebrew, Greek, Aramaic, and more.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/spiritual/study?query=Learn original biblical languages&autoRun=true&source=library-language')}>
            Start Learning
          </Button>
        </div>
      </div>

      <LibraryReaderModal
        text={readerText}
        translation={config.default_translation}
        faithTradition={config.faith_tradition}
        onClose={() => setReaderText(null)}
      />
    </div>
  );
}