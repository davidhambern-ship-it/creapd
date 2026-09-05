import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, FlaskConical, ChevronUp, ChevronDown, OctagonX } from 'lucide-react';
import ResearchProgressModal from './ResearchProgressModal';

const STAGE_LABELS = {
  query_expansion: 'Query Expansion',
  discovery: 'Parallel Discovery',
  source_verification: 'Source Verification',
  synthesis: 'Synthesis',
  verification: 'Fact Verification',
  critical_analysis: 'Critical Analysis',
};

export default function ResearchTrackerBar({ topics }) {
  const researchingTopics = (topics || []).filter(t => t.status === 'researching');
  const [expanded, setExpanded] = useState(null);
  const [stageMap, setStageMap] = useState({});
  const [modalTopic, setModalTopic] = useState(null);
  const [cancellingTopicId, setCancellingTopicId] = useState(null);

  useEffect(() => {
    if (researchingTopics.length === 0) {
      setStageMap({});
      return;
    }
    let active = true;

    const poll = async () => {
      try {
        const topicIds = researchingTopics.map(t => t.id);
        const dossiers = await base44.entities.ResearchDossier.filter({}, '-created_date', 50);
        if (!active) return;

        const map = {};
        (dossiers || []).forEach(d => {
          if (d.topic_id && topicIds.includes(d.topic_id)) {
            let meta = {};
            try { meta = JSON.parse(d.orchestration_metadata || '{}'); } catch {}
            map[d.topic_id] = {
              stage: meta.current_stage || 'discovery',
              sources: meta.sources_discovered || 0,
              verified: meta.sources_verified || 0,
              status: d.status,
            };
          }
        });
        setStageMap(map);
      } catch { /* ignore */ }

      if (active) setTimeout(poll, 3000);
    };

    poll();
    return () => { active = false; };
  }, [researchingTopics.map(t => t.id).join(',')]);

  const handleCancelResearch = async (event, topic) => {
    event.preventDefault();
    event.stopPropagation();
    if (!topic?.id || cancellingTopicId) return;

    setCancellingTopicId(topic.id);
    try {
      await base44.entities.ResearchTopic.update(topic.id, {
        status: 'pending',
        pipeline_stage: 'idle',
        rejection_reason: 'Research cancelled by user',
      });

      const dossiers = await base44.entities.ResearchDossier.filter(
        { topic_id: topic.id }, '-created_date', 1
      );
      const dossier = dossiers?.[0];
      if (dossier && dossier.status === 'researching') {
        let metadata = {};
        try { metadata = JSON.parse(dossier.orchestration_metadata || '{}'); } catch {}
        await base44.entities.ResearchDossier.update(dossier.id, {
          status: 'failed',
          error_message: 'Research cancelled by user.',
          orchestration_metadata: JSON.stringify({
            ...metadata,
            current_stage: 'cancelled',
            cancelled_by_user: true,
            cancelled_at: new Date().toISOString(),
          }),
        });
      }

      window.location.reload();
    } catch (err) {
      console.error('Cancel research failed:', err);
      setCancellingTopicId(null);
    }
  };

  if (researchingTopics.length === 0) return null;

  return (
    <>
      <div className="px-4 md:px-6 pb-3">
        <div className="cc-glass-card overflow-hidden cc-animate-fade-up" style={{ borderColor: 'hsl(190 50% 28% / 0.4)' }}>
          <div
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
            onClick={() => setExpanded(expanded ? null : 'all')}
            style={{ background: 'linear-gradient(135deg, hsl(190 50% 12% / 0.3), hsl(190 30% 6% / 0.15))' }}
          >
            <div className="relative flex-shrink-0">
              <FlaskConical className="w-4 h-4" style={{ color: 'hsl(190 80% 55%)' }} />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'hsl(190 80% 60%)' }}>
                {researchingTopics.length} topic{researchingTopics.length !== 1 ? 's' : ''} researching
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {researchingTopics.map(t => t.title).join(' · ')}
              </p>
            </div>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>

          {expanded && (
            <div className="divide-y" style={{ borderColor: 'hsl(190 20% 14% / 0.3)' }}>
              {researchingTopics.map(topic => {
                const info = stageMap[topic.id] || {};
                const stageLabel = STAGE_LABELS[info.stage] || 'Initializing...';
                const stageOrder = ['query_expansion', 'discovery', 'source_verification', 'synthesis', 'verification', 'critical_analysis'];
                const stageIdx = stageOrder.indexOf(info.stage);
                const progressPct = stageIdx >= 0 ? ((stageIdx + 1) / stageOrder.length) * 100 : 5;
                const isCancelling = cancellingTopicId === topic.id;

                return (
                  <div key={topic.id} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                    <button
                      onClick={() => setModalTopic(topic)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: 'hsl(190 80% 55%)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{topic.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 14% / 0.4)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${progressPct}%`,
                                background: 'linear-gradient(90deg, hsl(190 70% 50%), hsl(152 60% 50%))',
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap font-mono">
                            {isCancelling ? 'Stopping...' : stageLabel}
                          </span>
                          {info.sources > 0 && (
                            <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: 'hsl(152 50% 55%)' }}>
                              {info.verified}/{info.sources} src
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={(event) => handleCancelResearch(event, topic)}
                      disabled={!!cancellingTopicId}
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/50 transition-all disabled:opacity-50"
                      title="Stop this research and return the topic to Pending"
                    >
                      {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <OctagonX className="w-3 h-3" />}
                      {isCancelling ? 'Stopping' : 'Stop'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ResearchProgressModal
        open={!!modalTopic}
        topicId={modalTopic?.id}
        topicTitle={modalTopic?.title}
        onClose={() => setModalTopic(null)}
      />
    </>
  );
}
