import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { useCreaprEngine } from '@/hooks/useCreaprEngine';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, FlaskConical, Lightbulb, PanelRightOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ResearchProgressModal from '@/components/research/ResearchProgressModal';
import CreaprLibrary from '@/components/creapr-library/CreaprLibrary';
import TopicListPanel from '@/components/research/TopicListPanel';
import TopicsRoomHeader from '@/components/research/TopicsRoomHeader';

export default function ResearchTopics() {
  const researchData = useResearchProduction();
  const { config, topics, loading, refresh } = researchData;
  const { mode } = useCREAPMode();
  const engine = useCreaprEngine(researchData);
  const [researching, setResearching] = useState(null);
  const [progressTopic, setProgressTopic] = useState(null);
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md text-center cc-animate-fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <FlaskConical className="w-8 h-8" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <h2 className="text-xl font-heading font-semibold mb-2">No Research Production</h2>
          <p className="text-muted-foreground mb-4">You need a research production configuration before entering the library.</p>
          <Button asChild>
            <Link to="/research/configure">Create a Production</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleResearch = async (topic) => {
    setResearching(topic.id);
    setProgressTopic(topic);
    try {
      await base44.functions.invoke('deepResearchV2', { topic_id: topic.id, research_depth: topic.research_depth });
      await new Promise(r => setTimeout(r, 2000));
      setProgressTopic(null);
      await base44.functions.invoke('extractResearchPoints', { topic_id: topic.id });
      refresh();
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setResearching(null);
      setProgressTopic(null);
    }
  };

  const handleExtract = async (topic) => {
    setResearching(topic.id);
    try {
      await base44.functions.invoke('extractResearchPoints', { topic_id: topic.id });
      refresh();
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setResearching(null);
    }
  };

  const handleDelete = async (topic) => {
    await base44.entities.ResearchTopic.delete(topic.id);
    refresh();
  };

  return (
    <div className="flex h-full overflow-hidden relative flex-col">
      <TopicsRoomHeader topicCount={topics.length} />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Main: CREAP conversation IS the topics page */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
          <CreaprLibrary
            config={config}
            embedded
            onClose={refresh}
          />
        </div>

        {/* Topics sidebar — desktop */}
        <aside className="hidden lg:flex w-72 flex-col shrink-0 overflow-hidden" style={{ borderLeft: '1px solid hsl(190 30% 18% / 0.35)', background: 'hsl(210 40% 6% / 0.6)', backdropFilter: 'blur(12px)' }}>
          {/* Compact POC Focus */}
          {engine.pocState && (
            <div className="p-3 shrink-0" style={{ borderBottom: '1px solid hsl(190 30% 14% / 0.3)' }}>
              <Link to={engine.pocState.nextRoute} className="block p-3 rounded-lg transition-colors group cc-glass-card hover:border-opacity-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage {engine.pocState.stage}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: 'hsl(190 50% 15% / 0.3)', color: 'hsl(190 70% 55%)' }}>{mode}</span>
                </div>
                <p className="text-sm font-medium leading-tight">{engine.pocState.stageInfo.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{engine.pocState.pendingAction}</p>
                <div className="flex items-center gap-1 mt-2 text-xs group-hover:gap-2 transition-all" style={{ color: 'hsl(190 80% 55%)' }}>
                  Continue <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <TopicListPanel
              topics={topics}
              researching={researching}
              onResearch={handleResearch}
              onExtract={handleExtract}
              onDelete={handleDelete}
            />
          </div>
        </aside>

        {/* Mobile: floating button to open topics */}
        <button
          onClick={() => setMobileTopicsOpen(true)}
          className="lg:hidden absolute bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, hsl(190 50% 18% / 0.9), hsl(190 40% 10% / 0.9))', border: '1px solid hsl(190 50% 28% / 0.5)', color: 'hsl(190 80% 60%)', boxShadow: '0 8px 24px hsl(190 50% 3% / 0.5), 0 0 20px hsl(190 40% 22% / 0.15)' }}
        >
          <PanelRightOpen className="w-4 h-4" />
          <span className="text-sm font-medium">{topics.length} Topics</span>
        </button>

        {/* Mobile: topics sheet */}
        <Sheet open={mobileTopicsOpen} onOpenChange={setMobileTopicsOpen}>
          <SheetContent side="right" className="w-80 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Research Topics</SheetTitle>
            </SheetHeader>
            <TopicListPanel
              topics={topics}
              researching={researching}
              onResearch={(t) => { handleResearch(t); setMobileTopicsOpen(false); }}
              onExtract={(t) => { handleExtract(t); setMobileTopicsOpen(false); }}
              onDelete={handleDelete}
            />
          </SheetContent>
        </Sheet>

        <ResearchProgressModal
          open={!!progressTopic}
          topicId={progressTopic?.id}
          topicTitle={progressTopic?.title}
          onClose={() => setProgressTopic(null)}
        />
      </div>
    </div>
  );
}