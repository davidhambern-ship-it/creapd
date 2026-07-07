import React from 'react';
import { BookOpen, Database, FileText, Clock } from 'lucide-react';
import CreaprLibrary from '@/components/creapr-library/CreaprLibrary';

export default function TopicsAssistantSidebar({ config, topics, onClose }) {
  const researchingCount = topics.filter(t => t.status === 'researching').length;
  const researchedCount = topics.filter(t => t.status === 'researched' || t.status === 'in_review').length;

  const stats = [
    { label: 'Topics', value: topics.length, icon: BookOpen, color: 'text-berna-purple' },
    { label: 'Researching', value: researchingCount, icon: Clock, color: 'text-berna-orange' },
    { label: 'Researched', value: researchedCount, icon: FileText, color: 'text-berna-emerald' },
    { label: 'Sources', value: topics.reduce((sum, t) => sum + (t.source_count || 0), 0), icon: Database, color: 'text-blue-400' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* CREAPr Assistant — compact, takes ~1/4 of the sidebar */}
      <div className="shrink-0 h-1/4 min-h-[140px] overflow-hidden border-b border-white/[0.06] glass-panel">
        <CreaprLibrary config={config} embedded onClose={onClose} />
      </div>

      {/* Knowledge Shelf stats — fills remaining space */}
      <div className="flex-1 min-h-0 border-t border-white/[0.06] px-3 py-2.5 bg-background/60 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 mb-2">
          <Database className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Knowledge Shelf</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center px-1 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Icon className={`w-3 h-3 mx-auto mb-0.5 ${stat.color}`} />
                <div className="text-sm font-bold text-white leading-none">{stat.value}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}