import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, FlaskConical, Lightbulb, PanelRightOpen } from 'lucide-react';
import ResearchProgressModal from '@/components/research/ResearchProgressModal';
import TopicConversation from '@/components/research/TopicConversation';
import TopicListPanel from '@/components/research/TopicListPanel';

export default function ResearchTopics() {
  const { config, topics, loading, refresh } = useResearchProduction();
  const [researching, setResearching] = useState(null);
  const [progressTopic, setProgressTopic] = useState(null);
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md text-center">
          <FlaskConical className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
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
    <div className="flex h-full overflow-hidden relative">
      {/* Main: CREAP conversation IS the topics page */}
      <div className="flex-1 min-w-0 relative">
        <TopicConversation
          config={config}
          embedded
          onClose={refresh}
        />
      </div>

      {/* Topics sidebar — desktop */}
      <aside className="hidden lg:flex w-72 border-l border-border flex-col bg-background shrink-0">
        <TopicListPanel
          topics={topics}
          researching={researching}
          onResearch={handleResearch}
          onExtract={handleExtract}
          onDelete={handleDelete}
        />
      </aside>

      {/* Mobile: floating button to open topics */}
      <button
        onClick={() => setMobileTopicsOpen(true)}
        className="lg:hidden absolute bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg glow-purple"
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
  );
}