import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { base44 } from '@/api/base44Client';
import { Loader2, ArrowRight, Sparkles, BookOpen, FlaskConical, Database, Settings, Clock, FileText, Layers } from 'lucide-react';
import TopicsCabinet from '@/components/rpp/topics/TopicsCabinet';
import TopicListPanel from '@/components/research/TopicListPanel';
import CreaprLibrary from '@/components/creapr-library/CreaprLibrary';
import NerveCenterBackground from '@/components/rpp/lobby/NerveCenterBackground';
import NerveCenterTopBar from '@/components/rpp/lobby/NerveCenterTopBar';
import NerveCenterSideRail from '@/components/rpp/lobby/NerveCenterSideRail';
import NerveCenterBottomConsole from '@/components/rpp/lobby/NerveCenterBottomConsole';
import ResearchProgressModal from '@/components/research/ResearchProgressModal';

const STAGES = [
  { key: 'topics', label: 'Topics', icon: BookOpen },
  { key: 'research', label: 'Research', icon: FlaskConical },
  { key: 'dossier', label: 'Dossier', icon: FileText },
  { key: 'develop', label: 'Develop', icon: Layers },
  { key: 'packet', label: 'Packet', icon: ArrowRight },
];

export default function ResearchTopics() {
  const navigate = useNavigate();
  const researchData = useResearchProduction();
  const { config, topics, loading, refresh } = researchData;
  const [researching, setResearching] = useState(null);
  const [progressTopic, setProgressTopic] = useState(null);
  const [userName, setUserName] = useState('');

  const researchingCount = topics.filter(t => t.status === 'researching').length;
  const researchedCount = topics.filter(t => t.status === 'researched' || t.status === 'in_review').length;
  const usedCount = topics.filter(t => t.status === 'used').length;
  const totalSources = topics.reduce((sum, t) => sum + (t.source_count || 0), 0);

  const progressStages = {
    topics: topics.length > 0,
    research: researchedCount > 0,
    dossier: topics.some(t => t.status === 'in_review' || t.status === 'used'),
    develop: usedCount > 0,
    packet: usedCount > 0,
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u && u.full_name) setUserName(u.full_name.split(' ')[0]);
    }).catch(() => {});
  }, []);

  if (loading && !config) {
    return (
      <div className="nc-shell">
        <NerveCenterBackground />
        <NerveCenterTopBar readiness={0} />
        <div className="nc-body">
          <div className="nc-viewport flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
        </div>
        <NerveCenterBottomConsole />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="nc-shell">
        <NerveCenterBackground />
        <NerveCenterTopBar readiness={0} />
        <div className="nc-body">
          <div className="nc-viewport flex items-center justify-center">
            <div className="max-w-md text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(270 80% 60% / 0.1)', border: '1px solid hsl(270 80% 60% / 0.2)' }}>
                <FlaskConical className="w-8 h-8" style={{ color: 'hsl(270 80% 60%)' }} />
              </div>
              <h2 className="text-xl font-heading font-semibold mb-2 text-white">No Research Production</h2>
              <p className="text-muted-foreground mb-4">You need a research production configuration before entering the library.</p>
              <button
                onClick={() => navigate('/research/configure')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:gap-3"
                style={{
                  background: 'linear-gradient(135deg, hsl(270 50% 18% / 0.5), hsl(190 50% 18% / 0.3))',
                  border: '1px solid hsl(270 50% 35% / 0.5)',
                  color: 'hsl(270 80% 70%)',
                }}
              >
                Create a Production
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <NerveCenterBottomConsole />
      </div>
    );
  }

  const handleResearch = async (topic) => {
    setResearching(topic.id);
    setProgressTopic(topic);
    try {
      await base44.functions.invoke('deepResearchV2', { topic_id: topic.id, research_depth: topic.research_depth });
      setProgressTopic(null);
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

  const firstName = userName || 'Producer';
  const topicsStatus = topics.length === 0 ? 'not_started' : researchingCount > 0 ? 'in_progress' : 'complete';
  const libraryStatus = topics.length > 0 ? 'complete' : 'not_started';
  const knowledgeStatus = researchedCount > 0 ? 'complete' : 'not_started';
  const configStatus = config && config.production_name ? 'complete' : 'not_started';

  const recommendation = topics.length === 0
    ? 'Define your research topic with CREAPr to begin.'
    : researchingCount > 0
      ? researchingCount + ' topic' + (researchingCount > 1 ? 's' : '') + ' currently being researched.'
      : researchedCount > 0
        ? 'Research complete — extract points or continue to the Dossier.'
        : 'Your topic is defined — start research to gather knowledge.';

  return (
    <div className="nc-shell">
      <NerveCenterBackground />
      <NerveCenterTopBar readiness={topics.length > 0 ? 40 : 0} />
      <div className="nc-body">
        <NerveCenterSideRail side="left" />
        <div className="nc-viewport">
          <div className="max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
            {/* ═══ Hero ═══ */}
            <div className="text-center mb-6 md:mb-8 cc-animate-fade-up">
              <div className="flex items-center justify-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5" style={{ color: 'hsl(35 80% 55%)' }} />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  CREAPr Library · Topic Discovery
                </span>
              </div>
              <h1
                className="text-3xl md:text-4xl font-heading font-bold mb-2"
                style={{ textShadow: '0 0 24px hsl(270 80% 60% / 0.15)' }}
              >
                Welcome, {firstName}.
              </h1>
              <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
                {config && config.production_name
                  ? <>Your <span style={{ color: 'hsl(35 80% 58%)' }}>{config.production_name}</span> project has <span style={{ color: 'hsl(152 55% 50%)' }}>{topics.length} topic{topics.length !== 1 ? 's' : ''}</span> in the library.</>
                  : 'Define your research topic to begin the production pipeline.'}
              </p>

              {/* Recommendation */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(190 70% 55%)' }}>
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>{recommendation}</span>
                </div>
              </div>

              {/* Progress stages */}
              <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
                {STAGES.map((stage, i) => {
                  const done = progressStages[stage.key];
                  const StageIcon = stage.icon;
                  return (
                    <React.Fragment key={stage.key}>
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-all"
                        style={done
                          ? { background: 'hsl(152 60% 50% / 0.1)', borderColor: 'hsl(152 60% 50% / 0.2)', color: 'hsl(152 60% 55%)' }
                          : { background: 'hsl(0 0% 100% / 0.02)', borderColor: 'hsl(0 0% 100% / 0.06)', color: 'hsl(220 10% 55%)' }
                        }
                      >
                        <StageIcon className="w-2.5 h-2.5" />
                        {stage.label}
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className="w-3 h-px" style={{ background: done ? 'hsl(152 60% 50% / 0.3)' : 'hsl(0 0% 100% / 0.06)' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ═══ Cabinets ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CREAPr Library — topic discovery */}
              <TopicsCabinet
                title="CREAPr Library"
                subtitle="Discover & define your research topic"
                icon={BookOpen}
                accent="purple"
                index={0}
                status={libraryStatus}
                height="420px"
              >
                <div className="h-full overflow-hidden">
                  <CreaprLibrary config={config} embedded onClose={refresh} />
                </div>
              </TopicsCabinet>

              {/* Topic Registry — list with actions */}
              <TopicsCabinet
                title="Topic Registry"
                subtitle={topics.length + ' topic' + (topics.length !== 1 ? 's' : '') + ' · ' + researchingCount + ' researching · ' + researchedCount + ' ready'}
                icon={FlaskConical}
                accent="cyan"
                index={1}
                status={topicsStatus}
                height="420px"
              >
                <div className="h-full overflow-y-auto px-3 py-3">
                  <TopicListPanel
                    topics={topics}
                    researching={researching}
                    onResearch={handleResearch}
                    onExtract={handleExtract}
                    onDelete={handleDelete}
                  />
                </div>
              </TopicsCabinet>

              {/* Knowledge Shelf — stats */}
              <TopicsCabinet
                title="Knowledge Shelf"
                subtitle="Research metrics & activity"
                icon={Database}
                accent="emerald"
                index={2}
                status={knowledgeStatus}
                height="220px"
              >
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.02)', border: '1px solid hsl(0 0% 100% / 0.04)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(270 80% 60% / 0.15)', border: '1px solid hsl(270 80% 60% / 0.25)' }}>
                      <BookOpen className="w-4 h-4" style={{ color: 'hsl(270 80% 60%)' }} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white leading-none">{topics.length}</div>
                      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">Total Topics</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.02)', border: '1px solid hsl(0 0% 100% / 0.04)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(35 90% 55% / 0.15)', border: '1px solid hsl(35 90% 55% / 0.25)' }}>
                      <Clock className="w-4 h-4" style={{ color: 'hsl(35 90% 55%)' }} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white leading-none">{researchingCount}</div>
                      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">Researching</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.02)', border: '1px solid hsl(0 0% 100% / 0.04)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(152 60% 50% / 0.15)', border: '1px solid hsl(152 60% 50% / 0.25)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'hsl(152 60% 50%)' }} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white leading-none">{researchedCount}</div>
                      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">Researched</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.02)', border: '1px solid hsl(0 0% 100% / 0.04)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(190 80% 55% / 0.15)', border: '1px solid hsl(190 80% 55% / 0.25)' }}>
                      <Database className="w-4 h-4" style={{ color: 'hsl(190 80% 55%)' }} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white leading-none">{totalSources}</div>
                      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">Sources Found</div>
                    </div>
                  </div>
                </div>
              </TopicsCabinet>

              {/* Configuration */}
              <TopicsCabinet
                title="Production Configuration"
                subtitle={config && config.production_name ? config.production_name : 'Not configured'}
                icon={Settings}
                accent="amber"
                index={3}
                status={configStatus}
                height="220px"
              >
                <div className="p-4 h-full flex flex-col justify-between">
                  <div className="space-y-2">
                    {config && config.production_name && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Project</span>
                        <span className="text-white font-medium">{config.production_name}</span>
                      </div>
                    )}
                    {config && config.research_depth && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Depth</span>
                        <span className="text-white font-medium capitalize">{config.research_depth}</span>
                      </div>
                    )}
                    {config && config.target_runtime && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Runtime</span>
                        <span className="text-white font-medium">{config.target_runtime}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    to="/research/configure"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:gap-3"
                    style={{
                      background: 'linear-gradient(135deg, hsl(35 50% 18% / 0.5), hsl(270 50% 18% / 0.3))',
                      border: '1px solid hsl(35 50% 35% / 0.4)',
                      color: 'hsl(35 80% 60%)',
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Edit Configuration
                  </Link>
                </div>
              </TopicsCabinet>
            </div>
          </div>
        </div>
        <NerveCenterSideRail side="right" />
      </div>
      <NerveCenterBottomConsole />

      <ResearchProgressModal
        open={!!progressTopic}
        topicId={progressTopic && progressTopic.id}
        topicTitle={progressTopic && progressTopic.title}
        onClose={() => setProgressTopic(null)}
      />
    </div>
  );
}