import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Languages, BookOpen, GraduationCap, Sparkles, ArrowRight } from 'lucide-react';
import { BRIDGE_TYPE_LABELS } from '@/lib/spiritualConstants';

export default function WordInteractionModal({ word, textTitle, passageRef, onClose }) {
  const [loading, setLoading] = useState(false);
  const [wordData, setWordData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadWord = async () => {
    if (!word) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('librarySearch', { query: word, mode: 'word_study' });
      setWordData(res.data?.word_study || res.word_study);
    } catch (err) {
      setError(err.message || 'Failed to load word study');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (word) loadWord();
  }, [word]);

  if (!word) return null;

  const bridges = (() => { try { return JSON.parse(wordData?.language_bridges || '[]'); } catch { return []; } })();
  const occurrences = (() => { try { return JSON.parse(wordData?.occurrences || '[]'); } catch { return []; } })();
  const translations = (() => { try { return JSON.parse(wordData?.translation_variations || '[]'); } catch { return []; } })();

  const goToWordStudyPage = () => {
    if (wordData?.id) navigate(`/spiritual/library/word/${wordData.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-panel max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Languages className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">{word}</h3>
              <p className="text-xs text-muted-foreground">{textTitle} · {passageRef}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">{error}</div>
        )}

        {wordData && !loading && (
          <div className="space-y-4">
            {wordData.original_script && (
              <div className="text-center py-3 bg-secondary/30 rounded-lg">
                <p className="text-3xl font-heading" style={{ fontFamily: 'serif' }}>{wordData.original_script}</p>
                <p className="text-sm text-muted-foreground mt-1">{wordData.language} · {wordData.writing_system}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {wordData.pronunciation && (
                <div><span className="text-muted-foreground">Pronunciation:</span> {wordData.pronunciation}</div>
              )}
              {wordData.ipa && (
                <div><span className="text-muted-foreground">IPA:</span> {wordData.ipa}</div>
              )}
              {wordData.literal_meaning && (
                <div><span className="text-muted-foreground">Literal:</span> {wordData.literal_meaning}</div>
              )}
              {wordData.part_of_speech && (
                <div><span className="text-muted-foreground">Part of Speech:</span> {wordData.part_of_speech}</div>
              )}
              {wordData.root && (
                <div><span className="text-muted-foreground">Root:</span> {wordData.root}</div>
              )}
              {wordData.transliteration && (
                <div><span className="text-muted-foreground">Transliteration:</span> {wordData.transliteration}</div>
              )}
            </div>

            {wordData.contextual_meaning && (
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs font-medium text-muted-foreground mb-1">Contextual Meaning</p>
                <p className="text-sm">{wordData.contextual_meaning}</p>
              </div>
            )}

            {wordData.grammar && (
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs font-medium text-muted-foreground mb-1">Grammar</p>
                <p className="text-sm">{wordData.grammar}</p>
              </div>
            )}

            {translations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Translation Variations</p>
                <div className="space-y-1">
                  {translations.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-md bg-secondary/20">
                      <span className="font-medium text-primary shrink-0">{t.translation}</span>
                      <span className="text-muted-foreground">{t.rendering}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bridges.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Language Bridge</p>
                <div className="space-y-1">
                  {bridges.map((b, i) => (
                    <div key={i} className="p-2 rounded-md bg-secondary/20 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{b.target_word}</span>
                        <span className="text-muted-foreground">({b.target_language})</span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary">{BRIDGE_TYPE_LABELS[b.bridge_type] || b.bridge_type}</span>
                      </div>
                      {b.explanation && <p className="text-muted-foreground mt-1">{b.explanation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {occurrences.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Occurrences ({occurrences.length})</p>
                <div className="flex flex-wrap gap-1">
                  {occurrences.slice(0, 10).map((o, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-secondary/30">{o.reference}</span>
                  ))}
                  {occurrences.length > 10 && <span className="text-xs text-muted-foreground px-2 py-0.5">+{occurrences.length - 10} more</span>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={goToWordStudyPage}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <GraduationCap className="w-4 h-4" /> Full Word Study <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => { navigate(`/spiritual/study?query=${encodeURIComponent(`Study word: ${word}`)}&autoRun=true&source=library-word`); onClose(); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-sm hover:bg-secondary/70 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Research
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}