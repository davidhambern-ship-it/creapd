import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { useCreaprEngine } from '@/hooks/useCreaprEngine';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ResearchProgressModal from '@/components/research/ResearchProgressModal';
import CreaprLibrary from '@/components/creapr-library/CreaprLibrary';
import TopicListPanel from '@/components/research/TopicListPanel';

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
    <div className="flex h-full overflow-hidden relative flex-col w-full max-w-full bg-background">
      {/* Ambient gradient blobs — matching home theme */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-berna-purple/15 blur-[120px] pointer-events-none"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-berna-orange/15 blur-[100px] pointer-events-none"
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-berna-emerald/10 blur-[90px] pointer-events-none"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Particle dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 lg:px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-berna-purple/20 to-berna-orange/10 border border-white/[0.08] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-berna-purple" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-white neon-underline">Research Library</h1>
            <p className="text-[10px] text-muted-foreground">{topics.length} topics</p>
          </div>
        </div>
      </header>

      {/* Main area: CREAPr chat + topics */}
      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* CREAPr chat panel */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <CreaprLibrary config={config} embedded onClose={refresh} />
        </div>

        {/* Topics panel — right side on desktop */}
        <div className="hidden lg:flex w-80 flex-col border-l border-white/[0.06] bg-background/40 backdrop-blur-sm">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-heading font-semibold text-white">Your Topics</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <TopicListPanel
              topics={topics}
              researching={researching}
              onResearch={handleResearch}
              onExtract={handleExtract}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      {/* Topics strip — bottom on mobile */}
      <div className="lg:hidden shrink-0 h-40 flex flex-col overflow-hidden border-t border-white/[0.06] bg-background/40 backdrop-blur-sm">
        {engine.pocState && (
          <div className="px-4 py-1.5 shrink-0 flex items-center gap-2 border-b border-white/[0.06]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage {engine.pocState.stage}</span>
            <Link to={engine.pocState.nextRoute} className="text-xs font-medium hover:underline">{engine.pocState.stageInfo.name}</Link>
            <ArrowRight className="w-3 h-3 text-berna-purple" />
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
  );
}