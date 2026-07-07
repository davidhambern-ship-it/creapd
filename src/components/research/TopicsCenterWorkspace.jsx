import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, FlaskConical, ArrowRight, Layers, Search, FileText, Package } from 'lucide-react';
import TopicListPanel from '@/components/research/TopicListPanel';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { useCreaprEngine } from '@/hooks/useCreaprEngine';

const STAGES = [
  { key: 'topics', label: 'Topics', icon: BookOpen },
  { key: 'research', label: 'Research', icon: Search },
  { key: 'dossier', label: 'Dossier', icon: FileText },
  { key: 'develop', label: 'Develop', icon: Layers },
  { key: 'packet', label: 'Packet', icon: Package },
];

export default function TopicsCenterWorkspace({ config, topics, loading, researching, onResearch, onExtract, onDelete, refresh }) {
  const { mode } = useCREAPMode();
  const engine = useCreaprEngine({ config, topics });

  const researchingCount = topics.filter(t => t.status === 'researching').length;
  const researchedCount = topics.filter(t => t.status === 'researched' || t.status === 'in_review').length;
  const usedCount = topics.filter(t => t.status === 'used').length;

  const progressStages = {
    topics: topics.length > 0,
    research: researchedCount > 0,
    dossier: topics.some(t => t.status === 'in_review' || t.status === 'used'),
    develop: usedCount > 0,
    packet: usedCount > 0,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Welcome header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Welcome back, Producer.</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config?.production_name || 'Research Production'} · {topics.length} topics in your library
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/research/configure">
                <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                Configure
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress stages */}
        <div className="flex items-center gap-1.5">
          {STAGES.map((stage, i) => {
            const done = progressStages[stage.key];
            const Icon = stage.icon;
            return (
              <React.Fragment key={stage.key}>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                  done
                    ? 'bg-berna-emerald/10 border-berna-emerald/20 text-berna-emerald'
                    : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground'
                }`}>
                  <Icon className="w-3 h-3" />
                  {stage.label}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`w-4 h-px ${done ? 'bg-berna-emerald/30' : 'bg-white/[0.06]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Topic workspace */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {engine.pocState && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-berna-purple/5 border border-berna-purple/15">
            <span className="text-[10px] uppercase tracking-wider text-berna-purple font-semibold">Stage {engine.pocState.stage}</span>
            <Link to={engine.pocState.nextRoute} className="text-xs font-medium text-white/80 hover:text-white hover:underline flex items-center gap-1">
              {engine.pocState.stageInfo.name}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-heading font-semibold text-white">Your Topics</h2>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-berna-orange" style={{ boxShadow: '0 0 4px currentColor' }} />
              {researchingCount} researching
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-berna-emerald" />
              {researchedCount} ready
            </span>
          </div>
        </div>

        <TopicListPanel
          topics={topics}
          researching={researching}
          onResearch={onResearch}
          onExtract={onExtract}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}