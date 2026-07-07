import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import ResearchProgressModal from '@/components/research/ResearchProgressModal';
import CreaprLibrary from '@/components/creapr-library/CreaprLibrary';
import TopicsCenterWorkspace from '@/components/research/TopicsCenterWorkspace';
import TopicsAssistantSidebar from '@/components/research/TopicsAssistantSidebar';

export default function ResearchTopics() {
  const researchData = useResearchProduction();
  const { config, topics, loading, refresh } = researchData;
  const [researching, setResearching] = useState(null);
  const [progressTopic, setProgressTopic] = useState(null);

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-berna-purple" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-berna-purple/10 border border-white/[0.08]">
            <FlaskConical className="w-8 h-8 text-berna-purple" />
          </div>
          <h2 className="text-xl font-heading font-semibold mb-2 text-white">No Research Production</h2>
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
    <div className="flex h-full overflow-hidden relative w-full max-w-full bg-background">
      {/* 3-column grid: center workspace + right assistant sidebar (left dept nav is from ResearchLayout) */}
      <div className="flex w-full h-full overflow-hidden">
        {/* Center workspace */}
        <div className="flex-1 min-w-0 h-full overflow-hidden border-r border-white/[0.06]">
          <TopicsCenterWorkspace
            config={config}
            topics={topics}
            loading={loading}
            researching={researching}
            onResearch={handleResearch}
            onExtract={handleExtract}
            onDelete={handleDelete}
            refresh={refresh}
          />
        </div>

        {/* Right sidebar — CREAPr assistant + knowledge shelf */}
        <div className="hidden lg:flex w-[360px] shrink-0 h-full flex-col bg-background/40 backdrop-blur-sm">
          <TopicsAssistantSidebar config={config} topics={topics} onClose={refresh} />
        </div>
      </div>

      {/* Mobile: CREAPr dock fallback */}
      <div className="lg:hidden">
        <CreaprLibrary config={config} embedded onClose={refresh} />
      </div>

      <ResearchProgressModal
        open={!!progressTopic}
        topicId={progressTopic?.id}
        topicTitle={progressTopic?.title}
        onClose={() => setProgressTopic(null)}
      />
    </div>
  );
}