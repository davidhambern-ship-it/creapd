import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { useCreaprEngine } from '@/hooks/useCreaprEngine';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, Lightbulb, ArrowRight } from 'lucide-react';
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
      <div className="flex flex-1 min-h-0 overflow-hidden relative flex-col">
        {/* Main: CREAP conversation */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <CreaprLibrary
            config={config}
            embedded
            onClose={refresh}
          />
        </div>

        {/* Topics — bottom horizontal strip */}
        <div
          className="shrink-0 h-44 lg:h-52 flex flex-col overflow-hidden"
          style={{ borderTop: '1px solid hsl(190 30% 18% / 0.35)', background: 'hsl(210 40% 6% / 0.6)', backdropFilter: 'blur(12px)' }}
        >
          {/* Compact POC Focus */}
          {engine.pocState && (
            <div className="px-4 py-1.5 shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid hsl(190 30% 14% / 0.3)' }}>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage {engine.pocState.stage}</span>
              <Link to={engine.pocState.nextRoute} className="text-xs font-medium hover:underline">{engine.pocState.stageInfo.name}</Link>
              <ArrowRight className="w-3 h-3" style={{ color: 'hsl(190 80% 55%)' }} />
            </div>
          )}
          <TopicListPanel
            topics={topics}
            researching={researching}
            onResearch={handleResearch}
            onExtract={handleExtract}
            onDelete={handleDelete}
            horizontal
          />
        </div>

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