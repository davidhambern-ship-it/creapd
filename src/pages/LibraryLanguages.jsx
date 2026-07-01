import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Loader2, Languages, GraduationCap, ChevronLeft, BookOpen, Flame,
  Award, TrendingUp, Star, ArrowRight, Sparkles
} from 'lucide-react';
import { SUPPORTED_LEARNING_LANGUAGES } from '@/lib/spiritualConstants';

export default function LibraryLanguages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState([]);
  const [wordStudies, setWordStudies] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [prog, words] = await Promise.all([
        base44.entities.LanguageProgress.list('-updated_date', 20).catch(() => []),
        base44.entities.WordStudy.list('-updated_date', 50).catch(() => [])
      ]);
      setProgress(prog || []);
      setWordStudies(words || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalWords = wordStudies.length;
  const learnedWords = wordStudies.filter(w => w.is_learned).length;
  const masteredWords = wordStudies.filter(w => w.mastery_level === 'mastered').length;
  const maxStreak = Math.max(...progress.map(l => l.study_streak || 0), 0);

  // Group word studies by language
  const wordsByLanguage = {};
  wordStudies.forEach(w => {
    const lang = w.language || 'Unknown';
    if (!wordsByLanguage[lang]) wordsByLanguage[lang] = [];
    wordsByLanguage[lang].push(w);
  });

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/spiritual/library')} className="p-1.5 rounded-lg hover:bg-secondary/50">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/spiritual/library" className="hover:text-foreground">Library</Link>
              <span>/</span>
              <span>Languages</span>
            </div>
            <h1 className="text-2xl font-heading font-bold">Language Dashboard</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="glass-panel p-4">
            <Languages className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-heading font-bold">{progress.length}</p>
            <p className="text-xs text-muted-foreground">Languages Studied</p>
          </div>
          <div className="glass-panel p-4">
            <BookOpen className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-heading font-bold">{learnedWords}</p>
            <p className="text-xs text-muted-foreground">Words Learned</p>
          </div>
          <div className="glass-panel p-4">
            <Award className="w-5 h-5 text-berna-emerald mb-2" />
            <p className="text-2xl font-heading font-bold">{masteredWords}</p>
            <p className="text-xs text-muted-foreground">Words Mastered</p>
          </div>
          <div className="glass-panel p-4">
            <Flame className="w-5 h-5 text-accent mb-2" />
            <p className="text-2xl font-heading font-bold">{maxStreak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
        </div>

        {/* Active Language Progress */}
        {progress.length > 0 && (
          <div className="glass-panel p-5 mb-6">
            <h3 className="font-heading font-semibold mb-3">Your Language Journeys</h3>
            <div className="space-y-3">
              {progress.map(lang => {
                const langWords = wordsByLanguage[lang.language] || [];
                return (
                  <div key={lang.id} className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{lang.language}</p>
                        <p className="text-xs text-muted-foreground capitalize">Level: {lang.current_level}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-heading font-bold">{lang.words_learned || 0}</p>
                        <p className="text-xs text-muted-foreground">words</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                      <ProgressBar label="Writing" value={lang.writing_progress || 0} />
                      <ProgressBar label="Reading" value={lang.reading_progress || 0} />
                      <ProgressBar label="Pronunciation" value={lang.pronunciation_progress || 0} />
                      <ProgressBar label="Grammar" value={lang.grammar_progress || 0} />
                    </div>
                    {lang.study_streak > 0 && (
                      <p className="text-xs text-accent flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {lang.study_streak} day study streak
                      </p>
                    )}
                    {langWords.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Recent Words ({langWords.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {langWords.slice(0, 8).map(w => (
                            <Link
                              key={w.id}
                              to={`/spiritual/library/word/${w.id}`}
                              className="px-2 py-0.5 rounded-md text-xs bg-secondary/50 hover:bg-primary/20 transition-colors"
                            >
                              {w.original_script || w.word}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Supported Languages */}
        <div className="glass-panel p-5 mb-6">
          <h3 className="font-heading font-semibold mb-3">Supported Languages</h3>
          <p className="text-sm text-muted-foreground mb-4">Language learning emerges naturally from your reading and research. Click any word in the Reader to start a word study.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUPPORTED_LEARNING_LANGUAGES.map(lang => {
              const isActive = progress.some(p => p.language === lang.label);
              return (
                <button
                  key={lang.key}
                  onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(`Learn ${lang.label}`)}&autoRun=true&source=library-languages`)}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    isActive ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{lang.label}</p>
                    {isActive && <span className="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary">Active</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{lang.script} · {lang.tradition}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* All Vocabulary */}
        {wordStudies.length > 0 && (
          <div className="glass-panel p-5">
            <h3 className="font-heading font-semibold mb-3">Vocabulary Builder ({totalWords} words)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {wordStudies.map(w => (
                <Link
                  key={w.id}
                  to={`/spiritual/library/word/${w.id}`}
                  className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-center group"
                >
                  {w.original_script && <p className="text-xl mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: 'serif' }}>{w.original_script}</p>}
                  <p className="text-sm font-medium">{w.word}</p>
                  <p className="text-xs text-muted-foreground">{w.language}</p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-1 ${
                    w.mastery_level === 'mastered' ? 'bg-berna-emerald/20 text-berna-emerald' :
                    w.mastery_level === 'learning' ? 'bg-primary/20 text-primary' :
                    w.mastery_level === 'reviewing' ? 'bg-accent/20 text-accent' :
                    'bg-muted text-muted-foreground'
                  }`}>{w.mastery_level || 'new'}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {wordStudies.length === 0 && (
          <div className="glass-panel p-8 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold mb-2">Start Your Language Journey</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Language learning is contextual. Open any text in the library, click on any word, and Producer will generate a complete Word Profile with pronunciation, grammar, language bridges, and occurrences.
            </p>
            <Button onClick={() => navigate('/spiritual/library')}>
              <BookOpen className="w-4 h-4 mr-2" /> Browse Library
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}