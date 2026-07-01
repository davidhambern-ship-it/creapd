import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Loader2, BookOpen, GraduationCap, Sparkles, Languages, ArrowRight,
  Columns2, Globe, Clock, MapPin, Search, Star, FileText, PenTool,
  Package, BookMarked, Lightbulb, ChevronDown, ChevronUp, Library,
  ScrollText, Building2, Map, Clock3, FolderOpen, Award, Flame, TrendingUp
} from 'lucide-react';
import LibraryHero from '@/components/library/LibraryHero';
import LibraryCollections from '@/components/library/LibraryCollections';
import {
  BROWSE_CATEGORIES, LIBRARY_COLLECTIONS, FAITH_TRADITIONS, LIBRARY_LANGUAGES,
  LIBRARY_HISTORICAL_PERIODS, LIBRARY_REGIONS, QUICK_ACTIONS, SUPPORTED_LEARNING_LANGUAGES
} from '@/lib/spiritualConstants';

const BROWSE_DATA = {
  tradition: FAITH_TRADITIONS,
  language: LIBRARY_LANGUAGES,
  period: LIBRARY_HISTORICAL_PERIODS,
  region: LIBRARY_REGIONS,
  collection: LIBRARY_COLLECTIONS.map(c => c.label),
  theme: ['Forgiveness', 'Grace', 'Love', 'Justice', 'Faith', 'Hope', 'Salvation', 'Covenant', 'Kingdom of God', 'Wisdom', 'Prayer', 'Redemption'],
  figure: ['Moses', 'Jesus', 'Paul', 'Muhammad', 'Buddha', 'Krishna', 'Confucius', 'Augustine', 'Luther', 'Calvin'],
  place: ['Jerusalem', 'Bethlehem', 'Mecca', 'Varanasi', 'Bodh Gaya', 'Rome', 'Athens', 'Babylon', 'Sinai', 'Galilee'],
  original_language: SUPPORTED_LEARNING_LANGUAGES.map(l => l.label),
  writing_system: ['Hebrew', 'Greek Alphabet', 'Arabic Script', 'Devanagari', 'Latin', 'Coptic', 'Ge\'ez', 'Cuneiform', 'Chinese Characters'],
  study_type: ['Word Study', 'Passage Study', 'Theme Study', 'Character Study', 'Historical Study', 'Comparative Study', 'Doctrinal Study', 'Language Study'],
  discoveries: ['Dead Sea Scrolls', 'Nag Hammadi Library', 'Codex Sinaiticus', 'Ketef Hinnom Scrolls', 'Silver Scrolls', 'Recent Archaeological Finds']
};

const BROWSE_ICONS = {
  tradition: Globe, language: Languages, period: Clock, region: MapPin,
  collection: BookOpen, theme: Sparkles, figure: BookMarked, place: Map,
  original_language: Languages, writing_system: PenTool, study_type: GraduationCap,
  discoveries: Search
};

export default function SpiritualLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [libraryTexts, setLibraryTexts] = useState([]);
  const [researchProjects, setResearchProjects] = useState([]);
  const [wordStudies, setWordStudies] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [languageProgress, setLanguageProgress] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [recentlyRead, setRecentlyRead] = useState([]);
  const [expandedBrowse, setExpandedBrowse] = useState(searchParams.get('browse') || 'tradition');
  const [activeTab, setActiveTab] = useState('home');

  const RECENTLY_READ_KEY = 'wsLibrary_recentlyRead';

  const loadData = useCallback(async () => {
    try {
      const [texts, sessions, words, comps, langs, bms, hls, nts] = await Promise.all([
        base44.entities.LibraryText.list('-updated_date', 20).catch(() => []),
        base44.entities.ResearchSession.list('-created_date', 5).catch(() => []),
        base44.entities.WordStudy.list('-updated_date', 5).catch(() => []),
        base44.entities.LibraryComparison.list('-created_date', 5).catch(() => []),
        base44.entities.LanguageProgress.list('-updated_date', 10).catch(() => []),
        base44.entities.LibraryBookmark.list('-created_date', 5).catch(() => []),
        base44.entities.LibraryHighlight.list('-created_date', 5).catch(() => []),
        base44.entities.LibraryNote.list('-created_date', 5).catch(() => [])
      ]);
      setLibraryTexts(texts || []);
      setResearchProjects(sessions || []);
      setWordStudies(words || []);
      setComparisons(comps || []);
      setLanguageProgress(langs || []);
      setBookmarks(bms || []);
      setHighlights(hls || []);
      setNotes(nts || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    try { setRecentlyRead(JSON.parse(localStorage.getItem(RECENTLY_READ_KEY) || '[]')); } catch { setRecentlyRead([]); }
  }, [loadData]);

  const handleSearch = async (query) => {
    setSearching(true);
    setSearchResults(null);
    setActiveTab('search');
    try {
      const res = await base44.functions.invoke('librarySearch', { query, mode: 'general' });
      setSearchResults(res.data || res);
      // Refresh texts list
      const texts = await base44.entities.LibraryText.list('-updated_date', 20).catch(() => []);
      setLibraryTexts(texts || []);
    } catch (err) {
      setSearchResults({ error: err.message || 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  const handleBrowseSelect = (category, item) => {
    handleSearch(`${category}: ${item}`);
  };

  const handleOpenText = (text) => {
    const updated = [text.title, ...recentlyRead.filter(t => t !== text.title)].slice(0, 8);
    setRecentlyRead(updated);
    localStorage.setItem(RECENTLY_READ_KEY, JSON.stringify(updated));
    navigate(`/spiritual/library/reader/${text.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalWordsLearned = wordStudies.filter(w => w.is_learned).length;
  const totalStudyStreak = Math.max(...languageProgress.map(l => l.study_streak || 0), 0);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <LibraryHero onSearch={handleSearch} searching={searching} />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {[
            { key: 'home', label: 'Library Home', icon: Library },
            { key: 'search', label: 'Search Results', icon: Search },
            { key: 'activity', label: 'Recent Activity', icon: Clock3 },
            { key: 'collections', label: 'Saved Collections', icon: Star },
            { key: 'learning', label: 'Learning Dashboard', icon: GraduationCap },
            { key: 'research', label: 'Research Dashboard', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {QUICK_ACTIONS.slice(0, 10).map(action => {
                  const Icon = BROWSE_ICONS[action.icon?.toLowerCase()] || action.icon === 'Globe' ? Globe :
                    action.icon === 'Languages' ? Languages :
                    action.icon === 'BookOpen' ? BookOpen :
                    action.icon === 'Columns2' ? Columns2 :
                    action.icon === 'GraduationCap' ? GraduationCap :
                    action.icon === 'Search' ? Search :
                    action.icon === 'FileText' ? FileText :
                    action.icon === 'PenTool' ? PenTool :
                    action.icon === 'Sparkles' ? Sparkles : BookOpen;
                  return (
                    <button
                      key={action.label}
                      onClick={() => navigate(action.path)}
                      className="glass-panel p-3 hover:border-primary/30 transition-colors text-left group"
                    >
                      <Icon className="w-4 h-4 text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-medium leading-tight">{action.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Browse Categories */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Browse the Library</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {BROWSE_CATEGORIES.map(cat => {
                  const Icon = BROWSE_ICONS[cat.key] || BookOpen;
                  const isExpanded = expandedBrowse === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setExpandedBrowse(isExpanded ? null : cat.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isExpanded ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {cat.label}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
              {expandedBrowse && BROWSE_DATA[expandedBrowse] && (
                <div className="flex flex-wrap gap-2">
                  {BROWSE_DATA[expandedBrowse].map(item => {
                    const display = typeof item === 'string' ? item : item.label || item.name;
                    return (
                      <button
                        key={display}
                        onClick={() => handleBrowseSelect(BROWSE_CATEGORIES.find(c => c.key === expandedBrowse)?.label || expandedBrowse, display)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-secondary/40 border border-border text-foreground hover:border-primary/40 hover:bg-primary/10 transition-colors"
                      >
                        {display}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Continue Learning */}
            {(recentlyRead.length > 0 || libraryTexts.length > 0) && (
              <div>
                <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Continue Learning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentlyRead.slice(0, 3).map((title, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const text = libraryTexts.find(t => t.title === title);
                        if (text) handleOpenText(text);
                        else handleSearch(`Read: ${title}`);
                      }}
                      className="glass-panel p-4 hover:border-primary/30 transition-colors text-left group"
                    >
                      <BookOpen className="w-4 h-4 text-primary mb-2" />
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground">Continue reading</p>
                    </button>
                  ))}
                  {researchProjects.slice(0, 3).map(s => (
                    <Link
                      key={s.id}
                      to={`/spiritual/study/${s.id}`}
                      className="glass-panel p-4 hover:border-primary/30 transition-colors group"
                    >
                      <GraduationCap className="w-4 h-4 text-primary mb-2" />
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">Continue research</p>
                    </Link>
                  ))}
                  {comparisons.slice(0, 2).map(c => (
                    <Link
                      key={c.id}
                      to={`/spiritual/library/compare/${c.id}`}
                      className="glass-panel p-4 hover:border-primary/30 transition-colors group"
                    >
                      <Columns2 className="w-4 h-4 text-primary mb-2" />
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">Continue comparison</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Library Collections */}
            <LibraryCollections sacredTexts={libraryTexts.filter(t => t.collection === 'sacred_scriptures').map(t => t.title)} onOpenText={(title) => {
              const text = libraryTexts.find(t => t.title === title);
              if (text) handleOpenText(text);
              else handleSearch(`Read: ${title}`);
            }} />

            {/* Library Texts */}
            {libraryTexts.length > 0 && (
              <div>
                <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Library Catalog</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {libraryTexts.slice(0, 12).map(text => (
                    <button
                      key={text.id}
                      onClick={() => handleOpenText(text)}
                      className="glass-panel p-4 hover:border-primary/30 transition-colors text-left group"
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary">{text.title}</p>
                          <p className="text-xs text-muted-foreground">{text.tradition}</p>
                        </div>
                      </div>
                      {text.original_language && (
                        <p className="text-xs text-muted-foreground ml-6">{text.original_language}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Producer Automation Suggestions */}
            <div className="glass-panel p-5 border-accent/20">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-accent" /> Producer Suggestions
              </h3>
              <div className="space-y-2">
                {wordStudies.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-primary" />
                      <p className="text-sm">You've studied {wordStudies.length} words. Continue your language journey?</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab('learning')}>Continue</Button>
                  </div>
                )}
                {comparisons.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Columns2 className="w-4 h-4 text-primary" />
                      <p className="text-sm">You have {comparisons.length} comparison(s). Build a production from one?</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/spiritual/library/compare/${comparisons[0].id}`)}>View</Button>
                  </div>
                )}
                {researchProjects.length > 2 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <p className="text-sm">You've started {researchProjects.length} research projects. Create a production?</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/spiritual/configure')}>Create</Button>
                  </div>
                )}
                {wordStudies.length === 0 && comparisons.length === 0 && researchProjects.length <= 2 && (
                  <p className="text-sm text-muted-foreground">Start reading, studying, or comparing texts — Producer will suggest personalized next steps as you explore.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {searching && (
              <div className="glass-panel p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Searching the World Scripture Library...</p>
              </div>
            )}
            {searchResults && !searching && (
              <>
                {searchResults.error ? (
                  <div className="glass-panel p-8 text-center">
                    <p className="text-sm text-destructive">{searchResults.error}</p>
                  </div>
                ) : (
                  <>
                    {/* Found Texts */}
                    {((searchResults.new_texts || []).length + (searchResults.existing_texts || []).length) > 0 && (
                      <div>
                        <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Texts Found ({(searchResults.new_texts || []).length + (searchResults.existing_texts || []).length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[...(searchResults.existing_texts || []), ...(searchResults.new_texts || [])].map((text, i) => (
                            <button
                              key={text.id || i}
                              onClick={() => navigate(`/spiritual/library/reader/${text.id}`)}
                              className="glass-panel p-4 hover:border-primary/30 transition-colors text-left"
                            >
                              <p className="text-sm font-medium truncate">{text.title}</p>
                              <p className="text-xs text-muted-foreground">{text.tradition} · {text.original_language || 'Unknown language'}</p>
                              {text.full_text_available && <p className="text-xs text-berna-emerald mt-1">Full text available</p>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passages */}
                    {(searchResults.passages || []).length > 0 && (
                      <div>
                        <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Passages Found</h3>
                        <div className="space-y-2">
                          {searchResults.passages.map((p, i) => (
                            <div key={i} className="glass-panel p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <BookMarked className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{p.text_title} · {p.reference}</span>
                                {p.translation && <span className="text-xs text-muted-foreground">({p.translation})</span>}
                              </div>
                              <p className="text-sm leading-relaxed">{p.content}</p>
                              {p.context_note && <p className="text-xs text-muted-foreground mt-2">{p.context_note}</p>}
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="outline" onClick={() => handleSearch(`Study passage: ${p.reference} from ${p.text_title}`)}>
                                  <GraduationCap className="w-3.5 h-3.5 mr-1" /> Study
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => navigate(`/spiritual/library/compare?query=${encodeURIComponent(`Compare ${p.reference}`)}`)}>
                                  <Columns2 className="w-3.5 h-3.5 mr-1" /> Compare
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Words */}
                    {(searchResults.words || []).length > 0 && (
                      <div>
                        <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Words Found</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {searchResults.words.map((w, i) => (
                            <button
                              key={i}
                              onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(`Word study: ${w.word}`)}&autoRun=true&source=library-search`)}
                              className="glass-panel p-4 hover:border-primary/30 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Languages className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{w.word}</span>
                                {w.original_script && <span className="text-lg" style={{ fontFamily: 'serif' }}>{w.original_script}</span>}
                              </div>
                              <p className="text-xs text-muted-foreground">{w.language} · {w.literal_meaning}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Topics */}
                    {(searchResults.topics || []).length > 0 && (
                      <div>
                        <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Topics Found</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {searchResults.topics.map((t, i) => (
                            <div key={i} className="glass-panel p-4">
                              <p className="text-sm font-medium mb-1">{t.topic}</p>
                              <p className="text-xs text-muted-foreground">{t.description}</p>
                              {t.related_traditions && t.related_traditions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {t.related_traditions.map(tr => <span key={tr} className="px-1.5 py-0.5 rounded text-xs bg-secondary/40">{tr}</span>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {(searchResults.suggestions || []).length > 0 && (
                      <div className="glass-panel p-4 border-accent/20">
                        <h4 className="text-sm font-heading font-semibold mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-accent" /> Suggested Next Steps
                        </h4>
                        <div className="space-y-1">
                          {searchResults.suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => handleSearch(s.query)}
                              className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary/30 transition-colors text-left"
                            >
                              <span className="text-sm">{s.label}</span>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActivityPanel title="Recently Opened Texts" icon={BookOpen} items={libraryTexts.slice(0, 5).map(t => ({ title: t.title, subtitle: t.tradition, onClick: () => handleOpenText(t) }))} />
            <ActivityPanel title="Recent Research Projects" icon={GraduationCap} items={researchProjects.map(s => ({ title: s.title, subtitle: s.research_question, to: `/spiritual/study/${s.id}` }))} />
            <ActivityPanel title="Recent Word Studies" icon={Languages} items={wordStudies.map(w => ({ title: w.word, subtitle: w.language, to: `/spiritual/library/word/${w.id}` }))} />
            <ActivityPanel title="Recent Comparisons" icon={Columns2} items={comparisons.map(c => ({ title: c.title, subtitle: c.comparison_type?.replace(/_/g, ' '), to: `/spiritual/library/compare/${c.id}` }))} />
            <ActivityPanel title="Recent Bookmarks" icon={BookMarked} items={bookmarks.map(b => ({ title: b.passage_reference, subtitle: b.text_title, onClick: () => navigate(`/spiritual/library/reader/${b.text_id}`) }))} />
            <ActivityPanel title="Recent Highlights" icon={Star} items={highlights.map(h => ({ title: h.highlighted_text?.substring(0, 60) + '...', subtitle: h.text_title, onClick: () => navigate(`/spiritual/library/reader/${h.text_id}`) }))} />
            <ActivityPanel title="Recent Notes" icon={PenTool} items={notes.map(n => ({ title: n.note_content?.substring(0, 60) + '...', subtitle: n.text_title, onClick: () => navigate(`/spiritual/library/reader/${n.text_id}`) }))} />
          </div>
        )}

        {/* COLLECTIONS TAB */}
        {activeTab === 'collections' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CollectionPanel title="Saved Texts" icon={BookOpen} items={libraryTexts.filter(t => t.is_saved)} onOpen={(t) => handleOpenText(t)} />
              <CollectionPanel title="Bookmarked Passages" icon={BookMarked} items={bookmarks} onOpen={(b) => navigate(`/spiritual/library/reader/${b.text_id}`)} />
              <CollectionPanel title="Favorite Word Studies" icon={Languages} items={wordStudies.filter(w => w.is_favorite)} onOpen={(w) => navigate(`/spiritual/library/word/${w.id}`)} />
              <CollectionPanel title="Saved Comparisons" icon={Columns2} items={comparisons.filter(c => c.is_pinned)} onOpen={(c) => navigate(`/spiritual/library/compare/${c.id}`)} />
              <CollectionPanel title="Research Projects" icon={GraduationCap} items={researchProjects} onOpen={(s) => navigate(`/spiritual/study/${s.id}`)} />
              <CollectionPanel title="Notes" icon={PenTool} items={notes} onOpen={(n) => navigate(`/spiritual/library/reader/${n.text_id}`)} />
            </div>
          </div>
        )}

        {/* LEARNING DASHBOARD TAB */}
        {activeTab === 'learning' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Languages} label="Languages Studied" value={languageProgress.length} />
              <StatCard icon={BookOpen} label="Words Learned" value={totalWordsLearned} />
              <StatCard icon={Flame} label="Study Streak" value={`${totalStudyStreak} days`} />
              <StatCard icon={Award} label="Total Practice" value={wordStudies.reduce((s, w) => s + (w.practice_count || 0), 0)} />
            </div>

            {/* Language Progress */}
            {languageProgress.length > 0 ? (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-3">Language Progress</h3>
                <div className="space-y-3">
                  {languageProgress.map(lang => (
                    <div key={lang.id} className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{lang.language}</p>
                          <p className="text-xs text-muted-foreground capitalize">Level: {lang.current_level}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{lang.words_learned || 0} words</p>
                          {lang.study_streak > 0 && <p className="text-xs text-accent">🔥 {lang.study_streak} day streak</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <ProgressMini label="Writing" value={lang.writing_progress || 0} />
                        <ProgressMini label="Reading" value={lang.reading_progress || 0} />
                        <ProgressMini label="Pronunciation" value={lang.pronunciation_progress || 0} />
                        <ProgressMini label="Grammar" value={lang.grammar_progress || 0} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-panel p-8 text-center">
                <Languages className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-semibold mb-2">Begin Learning a Language</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Language learning emerges naturally from your research. Click any word in the Reader to start a word study and build your vocabulary.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUPPORTED_LEARNING_LANGUAGES.slice(0, 6).map(lang => (
                    <button
                      key={lang.key}
                      onClick={() => navigate(`/spiritual/study?query=${encodeURIComponent(`Learn ${lang.label}`)}&autoRun=true&source=library-learning`)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-secondary/30 border border-border hover:border-primary/40 hover:text-foreground transition-colors"
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Word Studies */}
            {wordStudies.length > 0 && (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-3">Vocabulary Builder ({wordStudies.length} words)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {wordStudies.map(w => (
                    <Link
                      key={w.id}
                      to={`/spiritual/library/word/${w.id}`}
                      className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-center"
                    >
                      {w.original_script && <p className="text-lg" style={{ fontFamily: 'serif' }}>{w.original_script}</p>}
                      <p className="text-sm font-medium">{w.word}</p>
                      <p className="text-xs text-muted-foreground">{w.language}</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-1 ${
                        w.mastery_level === 'mastered' ? 'bg-berna-emerald/20 text-berna-emerald' :
                        w.mastery_level === 'learning' ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>{w.mastery_level || 'new'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESEARCH DASHBOARD TAB */}
        {activeTab === 'research' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={GraduationCap} label="Research Projects" value={researchProjects.length} />
              <StatCard icon={Columns2} label="Comparisons" value={comparisons.length} />
              <StatCard icon={BookOpen} label="Texts in Library" value={libraryTexts.length} />
              <StatCard icon={Star} label="Highlights" value={highlights.length} />
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold">Research Projects</h3>
                <Button size="sm" asChild><Link to="/spiritual/study">New Research</Link></Button>
              </div>
              {researchProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No research projects yet. Start a study to build your research archive.</p>
              ) : (
                <div className="space-y-2">
                  {researchProjects.map(s => (
                    <Link key={s.id} to={`/spiritual/study/${s.id}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.research_question}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'ready' ? 'bg-berna-emerald/20 text-berna-emerald' : 'bg-primary/20 text-primary'}`}>
                        {s.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold">Comparison Archive</h3>
                <Button size="sm" asChild><Link to="/spiritual/library/compare">New Comparison</Link></Button>
              </div>
              {comparisons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comparisons yet. Start comparing texts, concepts, or traditions.</p>
              ) : (
                <div className="space-y-2">
                  {comparisons.map(c => (
                    <Link key={c.id} to={`/spiritual/library/compare/${c.id}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.comparison_type?.replace(/_/g, ' ')}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityPanel({ title, icon: Icon, items }) {
  return (
    <div className="glass-panel p-4">
      <h4 className="font-heading font-semibold text-sm flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No items yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 5).map((item, i) => (
            item.to ? (
              <Link key={i} to={item.to} className="block p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
              </Link>
            ) : (
              <button key={i} onClick={item.onClick} className="block w-full text-left p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionPanel({ title, icon: Icon, items, onOpen }) {
  return (
    <div className="glass-panel p-4">
      <h4 className="font-heading font-semibold text-sm flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" /> {title} ({items.length})
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No items in this collection.</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 6).map((item, i) => (
            <button key={i} onClick={() => onOpen(item)} className="block w-full text-left p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <p className="text-sm font-medium truncate">{item.title || item.passage_reference || item.word || item.note_content?.substring(0, 40)}</p>
              <p className="text-xs text-muted-foreground truncate">{item.subtitle || item.tradition || item.language || item.text_title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-panel p-4">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <p className="text-2xl font-heading font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProgressMini({ label, value }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}