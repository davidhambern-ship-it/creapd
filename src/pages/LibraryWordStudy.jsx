import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, ChevronLeft, Languages, GraduationCap, Sparkles, BookOpen,
  PenTool, CheckCircle2, Star, ArrowRight, Lightbulb
} from 'lucide-react';
import { BRIDGE_TYPE_LABELS } from '@/lib/spiritualConstants';

export default function LibraryWordStudy() {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const [wordStudy, setWordStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState([]);

  const loadWordStudy = useCallback(async () => {
    if (!wordId) return;
    setLoading(true);
    try {
      const ws = await base44.entities.WordStudy.get(wordId);
      setWordStudy(ws);
      try {
        const questions = JSON.parse(ws.follow_up_questions || '[]');
        if (Array.isArray(questions) && questions.length > 0) setFollowUpQuestions(questions);
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [wordId]);

  useEffect(() => { loadWordStudy(); }, [loadWordStudy]);

  const handleSaveNote = async () => {
    if (!noteText.trim() || !wordStudy) return;
    try {
      const updated = await base44.entities.WordStudy.update(wordStudy.id, {
        notes: (wordStudy.notes || '') + '\n\n' + noteText
      });
      setWordStudy(updated);
      setNoteText('');
    } catch (err) { console.error(err); }
  };

  const handleToggleFavorite = async () => {
    if (!wordStudy) return;
    try {
      const updated = await base44.entities.WordStudy.update(wordStudy.id, {
        is_favorite: !wordStudy.is_favorite
      });
      setWordStudy(updated);
    } catch (err) { console.error(err); }
  };

  const handleMarkLearned = async () => {
    if (!wordStudy) return;
    try {
      const updated = await base44.entities.WordStudy.update(wordStudy.id, {
        is_learned: !wordStudy.is_learned,
        mastery_level: wordStudy.is_learned ? 'reviewing' : 'learning',
        practice_count: (wordStudy.practice_count || 0) + 1
      });
      setWordStudy(updated);
    } catch (err) { console.error(err); }
  };

  const startFollowUpStudy = (question) => {
    navigate(`/spiritual/study?query=${encodeURIComponent(question)}&autoRun=true&source=library-wordstudy`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!wordStudy) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <Languages className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Word study not found.</p>
          <Button asChild><Link to="/spiritual/library">Back to Library</Link></Button>
        </div>
      </div>
    );
  }

  const bridges = (() => { try { return JSON.parse(wordStudy.language_bridges || '[]'); } catch { return []; } })();
  const occurrences = (() => { try { return JSON.parse(wordStudy.occurrences || '[]'); } catch { return []; } })();
  const translations = (() => { try { return JSON.parse(wordStudy.translation_variations || '[]'); } catch { return []; } })();
  const wordFamily = (() => { try { return JSON.parse(wordStudy.word_family || '[]'); } catch { return []; } })();
  const relatedConcepts = (() => { try { return JSON.parse(wordStudy.related_concepts || '[]'); } catch { return []; } })();

  const profileFields = [
    { label: 'Language', value: wordStudy.language },
    { label: 'Writing System', value: wordStudy.writing_system },
    { label: 'Transliteration', value: wordStudy.transliteration },
    { label: 'Pronunciation', value: wordStudy.pronunciation },
    { label: 'IPA', value: wordStudy.ipa },
    { label: 'Literal Meaning', value: wordStudy.literal_meaning },
    { label: 'Part of Speech', value: wordStudy.part_of_speech },
    { label: 'Root', value: wordStudy.root },
    { label: 'Bridge Type', value: BRIDGE_TYPE_LABELS[wordStudy.bridge_type] || wordStudy.bridge_type }
  ].filter(f => f.value);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/spiritual/library')} className="p-1.5 rounded-lg hover:bg-secondary/50">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/spiritual/library" className="hover:text-foreground">Library</Link>
              <span>/</span>
              <span>Word Study</span>
            </div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
              <Languages className="w-6 h-6 text-primary" />
              {wordStudy.word}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToggleFavorite}>
              <Star className={`w-4 h-4 mr-1 ${wordStudy.is_favorite ? 'fill-accent text-accent' : ''}`} />
              {wordStudy.is_favorite ? 'Favorited' : 'Favorite'}
            </Button>
            <Button size="sm" onClick={handleMarkLearned} variant={wordStudy.is_learned ? 'default' : 'outline'}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {wordStudy.is_learned ? 'Learned' : 'Mark Learned'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Original Script Display */}
            {wordStudy.original_script && (
              <div className="glass-panel p-8 text-center border-primary/20">
                <p className="text-5xl font-heading mb-2" style={{ fontFamily: 'serif' }}>{wordStudy.original_script}</p>
                <p className="text-sm text-muted-foreground">{wordStudy.language} · {wordStudy.writing_system}</p>
                {wordStudy.pronunciation && (
                  <p className="text-lg text-primary mt-2">{wordStudy.pronunciation}</p>
                )}
              </div>
            )}

            {/* Word Profile */}
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Word Profile
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {profileFields.map(f => (
                  <div key={f.label}>
                    <span className="text-muted-foreground">{f.label}:</span>{' '}
                    <span className="font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contextual Meaning */}
            {wordStudy.contextual_meaning && (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-2">Contextual Meaning</h3>
                <p className="text-sm">{wordStudy.contextual_meaning}</p>
              </div>
            )}

            {/* Grammar */}
            {wordStudy.grammar && (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-2">Grammar</h3>
                <p className="text-sm">{wordStudy.grammar}</p>
              </div>
            )}

            {/* Historical Development */}
            {wordStudy.historical_development && (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-2">Historical Development</h3>
                <p className="text-sm text-muted-foreground">{wordStudy.historical_development}</p>
              </div>
            )}

            {/* Translation Variations */}
            {translations.length > 0 && (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-3">Translation Variations</h3>
                <div className="space-y-2">
                  {translations.map((t, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-primary">{t.translation}</span>
                      </div>
                      <p className="text-sm">{t.rendering}</p>
                      {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Language Bridge Engine */}
            {bridges.length > 0 && (
              <div className="glass-panel p-5 border-primary/20">
                <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" /> Language Bridge Engine
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Conceptual relationships — Producer distinguishes between direct translations and conceptual parallels.
                </p>
                <div className="space-y-2">
                  {bridges.map((b, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{b.target_word}</span>
                        <span className="text-xs text-muted-foreground">({b.target_language})</span>
                        <span className="ml-auto px-2 py-0.5 rounded-md text-xs bg-primary/15 text-primary">
                          {BRIDGE_TYPE_LABELS[b.bridge_type] || b.bridge_type}
                        </span>
                      </div>
                      {b.explanation && <p className="text-xs text-muted-foreground">{b.explanation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Occurrences */}
            {occurrences.length > 0 && (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-3">Occurrences ({occurrences.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {occurrences.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(`Study passage: ${o.reference}`)}&autoRun=true&source=library-wordstudy`)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 border border-transparent transition-all"
                    >
                      {o.reference}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Related */}
            {(wordFamily.length > 0 || relatedConcepts.length > 0) && (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-3">Related</h3>
                {wordFamily.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Word Family</p>
                    <div className="flex flex-wrap gap-1.5">
                      {wordFamily.map((w, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-secondary/40">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
                {relatedConcepts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Related Concepts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedConcepts.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-primary/15 text-primary">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Questions */}
            {followUpQuestions.length > 0 && (
              <div className="glass-panel p-5 border-accent/20">
                <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-accent" /> Follow-up Study Questions
                </h3>
                <div className="space-y-2">
                  {followUpQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => startFollowUpStudy(q)}
                      className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-left group"
                    >
                      <span className="text-sm">{q}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Mastery */}
            <div className="glass-panel p-4">
              <h4 className="font-heading font-semibold text-sm mb-3">Learning Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Level:</span> <span className="font-medium capitalize">{wordStudy.mastery_level || 'new'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Practice:</span> <span>{wordStudy.practice_count || 0}x</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Writing:</span> <span>{wordStudy.writing_practice_count || 0}x</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quiz Score:</span> <span>{wordStudy.quiz_score || 0}%</span></div>
              </div>
            </div>

            {/* Notes */}
            <div className="glass-panel p-4">
              <h4 className="font-heading font-semibold text-sm mb-2">Notes</h4>
              {wordStudy.notes && (
                <div className="p-2 rounded-md bg-secondary/30 text-xs text-muted-foreground mb-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {wordStudy.notes}
                </div>
              )}
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note about this word..."
                rows={3}
                className="mb-2"
              />
              <Button size="sm" className="w-full" onClick={handleSaveNote} disabled={!noteText.trim()}>
                <PenTool className="w-3.5 h-3.5 mr-1" /> Save Note
              </Button>
            </div>

            {/* Actions */}
            <div className="glass-panel p-4">
              <h4 className="font-heading font-semibold text-sm mb-3">Actions</h4>
              <div className="space-y-1.5">
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(`Study word: ${wordStudy.word}`)}&autoRun=true&source=library-wordstudy`)}>
                  <GraduationCap className="w-4 h-4 mr-2" /> Start Study
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => navigate(`/spiritual/library/compare?query=${encodeURIComponent(`Compare ${wordStudy.word} across traditions`)}`)}>
                  <Sparkles className="w-4 h-4 mr-2" /> Compare Word
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => navigate('/spiritual/library/languages')}>
                  <Languages className="w-4 h-4 mr-2" /> Language Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}