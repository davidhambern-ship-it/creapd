import React, { useState, useEffect, useRef } from 'react';
import { useResearch } from '@/context/ResearchContext';
import { base44 } from '@/api/base44Client';
import Bookshelf from '@/components/research/Bookshelf';
import { Button } from '@/components/ui/button';
import { BookOpen, Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResearchTopics() {
  const { activeProject, refreshProject, creaprMessages, creaprSay, userSay } = useResearch();
  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const lastProcessedRef = useRef(null);

  useEffect(() => {
    if (!activeProject) return;
    loadTopics();
    if (activeProject.categories) {
      try { setCategories(JSON.parse(activeProject.categories)); } catch {}
    }
    if (activeProject.research_question) {
      creaprSay(`Your research topic is: "${activeProject.research_question}". You can refine it or proceed to the Research Department.`);
    } else {
      creaprSay('Welcome to the CREAPr Library. What would you like to research today?');
    }
  }, [activeProject?.id]);

  const loadTopics = async () => {
    if (!activeProject) return;
    try {
      const t = await base44.entities.ResearchTopic.filter({ project_id: activeProject.id });
      setTopics(t || []);
    } catch { setTopics([]); }
  };

  useEffect(() => {
    const lastMsg = creaprMessages[creaprMessages.length - 1];
    if (lastMsg?.role === 'user' && lastMsg.id !== lastProcessedRef.current) {
      lastProcessedRef.current = lastMsg.id;
      handleUserInput(lastMsg.content);
    }
  }, [creaprMessages]);

  const handleUserInput = async (text) => {
    if (!activeProject) {
      creaprSay('Please create a project in the Lobby first.');
      return;
    }
    if (analyzing) return;

    setAnalyzing(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are CREAPr, a research analyst at a professional research institute. A producer wants to research: "${text}".\n\n1. Confirm your understanding of their intent in 1-2 sentences.\n2. Generate 3-4 research category names that would help organize this topic into sections of a library.\n\nRespond conversationally and professionally.`,
        response_json_schema: {
          type: 'object',
          properties: {
            understanding: { type: 'string', description: 'CREAPr confirmation of understanding' },
            categories: { type: 'array', items: { type: 'string' }, description: 'Research category names' },
          },
        },
      });

      const newCategories = (res.categories || []).map(name => ({ name, topics: [] }));
      setCategories(newCategories);

      await base44.entities.ResearchProject.update(activeProject.id, {
        research_question: text,
        intent_summary: res.understanding,
        categories: JSON.stringify(newCategories),
        status: 'configuring',
      });

      creaprSay(`${res.understanding} I've organized the library into ${newCategories.length} sections. Browse the shelves and select a book to define a research topic.`);
      await refreshProject();
    } catch (e) {
      creaprSay('I had trouble analyzing your topic. Please try again.');
    }
    setAnalyzing(false);
  };

  const handleDirectSubmit = () => {
    if (!topicInput.trim()) return;
    userSay(topicInput.trim());
    setTopicInput('');
  };

  const handleBookSelect = (topic) => {
    setSelectedTopic(topic);
    creaprSay(`Opening "${topic.title}". You can review and refine this research topic here.`);
  };

  const handleCreateTopic = async (categoryName) => {
    if (!activeProject || !activeProject.research_question) return;
    try {
      const topic = await base44.entities.ResearchTopic.create({
        project_id: activeProject.id,
        title: activeProject.research_question.slice(0, 60),
        category: categoryName,
        description: activeProject.research_question,
        research_assignment: JSON.stringify({ research_question: activeProject.research_question }),
        key_questions: JSON.stringify([]),
        status: 'assigned',
      });
      setTopics(prev => [...prev, topic]);
      setSelectedTopic(topic);
      creaprSay(`Research topic "${topic.title}" created and assigned. Proceed to the Research Department when you're ready to begin.`);
    } catch (e) {
      creaprSay('I encountered an issue creating the research topic.');
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center">
        <BookOpen className="w-8 h-8 text-amber-400/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Please create or select a project in the Lobby first.</p>
      </div>
    );
  }

  const shelfCategories = categories.length > 0
    ? categories.map(cat => ({
        ...cat,
        topics: topics.filter(t => t.category === cat.name),
      }))
    : [{ name: 'General', topics }];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-heading font-bold text-white flex items-center justify-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          CREAPr Library
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Topics Department — Discover and define your research topic</p>
      </div>

      {/* Direct topic input */}
      {!activeProject.research_question && (
        <div className="glass-panel p-4 max-w-lg mx-auto">
          <label className="text-xs text-muted-foreground mb-1 block">What would you like to research?</label>
          <div className="flex gap-2">
            <input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDirectSubmit()}
              placeholder="Describe your research topic..."
              className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            <Button
              onClick={handleDirectSubmit}
              disabled={!topicInput.trim() || analyzing}
              size="sm"
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          </div>
          {analyzing && <p className="text-[10px] text-amber-400/70 mt-2 animate-pulse">CREAPr is analyzing your topic...</p>}
        </div>
      )}

      {/* Bookshelf */}
      {activeProject.research_question && (
        <>
          <div className="glass-panel p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Research Question</p>
              <p className="text-sm text-white font-medium">{activeProject.research_question}</p>
            </div>
            {topics.length === 0 && (
              <Button
                onClick={() => handleCreateTopic(categories[0]?.name || 'General')}
                size="sm"
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20"
              >
                <Check className="w-3 h-3 mr-1" /> Create Research Assignment
              </Button>
            )}
          </div>

          <Bookshelf
            categories={shelfCategories}
            onBookSelect={handleBookSelect}
            selectedTopicId={selectedTopic?.id}
          />
        </>
      )}

      {/* Selected topic detail (open book) */}
      {selectedTopic && (
        <div className="glass-panel p-5 max-w-2xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              {selectedTopic.title}
            </h3>
            <button onClick={() => setSelectedTopic(null)} className="text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{selectedTopic.description}</p>
          {selectedTopic.key_questions && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Key Questions</p>
              <div className="space-y-1">
                {(() => {
                  try { return JSON.parse(selectedTopic.key_questions); } catch { return []; }
                })().map((q, i) => (
                  <p key={i} className="text-xs text-foreground/80">• {q}</p>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', selectedTopic.status === 'assigned' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400')}>
              {selectedTopic.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}