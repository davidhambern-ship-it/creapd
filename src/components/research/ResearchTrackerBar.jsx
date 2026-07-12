import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, FlaskConical, ChevronUp, ChevronDown } from 'lucide-react';
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

  // Poll dossiers for live stage updates
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

      if (active) {
        setTimeout(poll, 3000);
      }
    };

    poll();
    return () => { active = false; };
  }, [researchingTopics.map(t => t.id).join(',')]);

  if (researchingTopics.length === 0) return null;

  return (
    <>
      <div className="px-4 md:px-6 pb-3">
        <div className="cc-glass-card overflow-hidden cc-animate-fade-up" style={{ borderColor: 'hsl(190 50% 28% / 0.4)' }}>
          {/* Header strip */}
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

          {/* Expanded topic rows */}
          {expanded && (
            <div className="divide-y" style={{ borderColor: 'hsl(190 20% 14% / 0.3)' }}>
              {researchingTopics.map(topic => {
                const info = stageMap[topic.id] || {};
                const stageLabel = STAGE_LABELS[info.stage] || 'Initializing...';
                const stageOrder = ['query_expansion', 'discovery', 'source_verification', 'synthesis', 'verification', 'critical_analysis'];
                const stageIdx = stageOrder.indexOf(info.stage);
                const progressPct = stageIdx >= 0 ? ((stageIdx + 1) / stageOrder.length) * 100 : 5;

                return (
                  <button
                    key={topic.id}
                    onClick={() => setModalTopic(topic)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
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
                          {stageLabel}
                        </span>
                        {info.sources > 0 && (
                          <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: 'hsl(152 50% 55%)' }}>
                            {info.verified}/{info.sources} src
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
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