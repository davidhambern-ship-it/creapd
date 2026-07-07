import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import { base44 } from '@/api/base44Client';
import { Loader2, Rss } from 'lucide-react';
import LobbyHero from '@/components/rpp/lobby/LobbyHero';
import DepartmentDirectory from '@/components/rpp/lobby/DepartmentDirectory';
import ProjectStatusBoard from '@/components/rpp/lobby/ProjectStatusBoard';
import ProductionReadinessPanel from '@/components/rpp/lobby/ProductionReadinessPanel';
import PacketPickupPanel from '@/components/rpp/lobby/PacketPickupPanel';

function getDeptStatus(deptId, topics, points, packages, dossiers) {
  const researchingTopics = topics.filter(t => t.status === 'researching');
  const approvedPackages = packages.filter(p => p.status === 'approved' || p.status === 'finalized');
  const readyDossiers = (dossiers || []).filter(d => d.status === 'ready');
  switch (deptId) {
    case 'topics': return topics.length > 0 ? 'complete' : 'not_started';
    case 'research':
      if (researchingTopics.length > 0) return 'in_progress';
      if (points.length > 0) return 'complete';
      return 'not_started';
    case 'dossier':
      if (readyDossiers.length > 0) return 'complete';
      if ((dossiers || []).length > 0) return 'needs_review';
      return 'not_started';
    case 'develop':
      if (packages.length > 0) return 'complete';
      return 'not_started';
    case 'packet':
      if (approvedPackages.length > 0) return 'complete';
      if (packages.length > 0) return 'in_progress';
      return 'not_started';
    default: return 'not_started';
  }
}

function getRecommendedDeptId(topics, points, packages, approvedPackages, dossiers) {
  if (topics.length === 0) return 'topics';
  if (points.length === 0) return 'research';
  if (!(dossiers || []).some(d => d.status === 'ready')) return 'dossier';
  if (packages.length === 0) return 'develop';
  if (approvedPackages.length === 0) return 'develop';
  return 'packet';
}

export default function RPPLobby() {
  const navigate = useNavigate();
  const researchData = useResearchProduction();
  const { config, topics, points, packages, dossiers, loading, refresh } = researchData;
  const [userName, setUserName] = useState('');

  const researchingTopics = topics.filter(t => t.status === 'researching');
  const researchedTopics = topics.filter(t => t.status === 'researched' || t.status === 'in_review');
  const approvedPoints = points.filter(p => p.status === 'approved' || p.status === 'used');
  const approvedPackages = packages.filter(p => p.status === 'approved' || p.status === 'finalized');

  const checklist = [
    { label: 'Configuration Saved', done: !!config?.production_name },
    { label: 'Research Assignment', done: topics.length > 0 },
    { label: 'Research Complete', done: researchedTopics.length > 0 },
    { label: 'Points Extracted', done: points.length > 0 },
    { label: 'Points Approved', done: approvedPoints.length > 0 },
    { label: 'Packages Generated', done: packages.length > 0 },
  ];
  const completedItems = checklist.filter(c => c.done).map(c => c.label);
  const missingItems = checklist.filter(c => !c.done).map(c => c.label);
  const readinessPercent = Math.round((completedItems.length / checklist.length) * 100);

  const recommendedDeptId = getRecommendedDeptId(topics, points, packages, approvedPackages, dossiers);
  const recommendedDept = RPP_DEPARTMENTS.find(d => d.id === recommendedDeptId) || RPP_DEPARTMENTS[1];

  // Build department directory data
  const departments = RPP_DEPARTMENTS.filter(d => d.id !== 'lobby').map(d => ({
    dept: d,
    status: getDeptStatus(d.id, topics, points, packages, dossiers),
    count: { topics: topics.length, research: points.length, dossier: (dossiers || []).length, develop: packages.length, packet: approvedPackages.length }[d.id] || 0,
    recommended: d.id === recommendedDeptId,
  }));

  // Pipeline stages
  const stages = RPP_DEPARTMENTS.filter(d => d.id !== 'lobby').map(d => ({
    id: d.id,
    name: d.name,
    path: d.path,
    status: getDeptStatus(d.id, topics, points, packages, dossiers),
  }));

  // Packet state
  const packetState = approvedPackages.length > 0 ? 'ready' : packages.length > 0 ? 'in_progress' : 'none';
  const packetTitle = (approvedPackages[0] || packages[0])?.title || '';

  // CREAPr recommendation
  const recommendation = (() => {
    if (!config?.production_name || topics.length === 0)
      return 'We need a topic before the team can work — start in Topics.';
    if (researchingTopics.length > 0)
      return `${researchingTopics.length} topic${researchingTopics.length > 1 ? 's' : ''} currently being researched.`;
    if (points.length === 0)
      return 'Your topic is defined — head to Research to begin gathering knowledge.';
    if (approvedPackages.length === 0)
      return 'Your research points are ready — let\'s develop them into production assets.';
    return 'Your Production Packet is ready — collect it from Packet.';
  })();

  // Primary CTA
  const ctaLabel = topics.length === 0 ? 'Start New Topic' : approvedPackages.length > 0 ? 'Collect Packet' : 'Continue Project';

  // Fetch user name + send CREAPr greeting on mount
  useEffect(() => {
    base44.auth.me().then(u => { if (u?.full_name) setUserName(u.full_name.split(' ')[0]); }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
      </div>
    );
  }

  // Knowledge ticker items
  const tickerItems = topics.length > 0
    ? topics.slice(0, 8).map(t => ({ title: t.title, sub: t.category || 'Research' }))
    : [{ title: 'No active research topics yet', sub: 'Visit Topics to begin' }];

  return (
    <div className="rpp-lobby px-4 md:px-6 py-4 space-y-4">
      {/* 1. Lobby Hero */}
      <LobbyHero
        userName={userName}
        config={config}
        recommendation={recommendation}
        ctaLabel={ctaLabel}
        onCTAClick={() => navigate(recommendedDept.path)}
        readinessPercent={readinessPercent}
      />

      {/* 2. Department Directory */}
      <DepartmentDirectory departments={departments} />

      {/* 3 + 4. Pipeline + Readiness (two columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProjectStatusBoard stages={stages} />
        <ProductionReadinessPanel
          readinessPercent={readinessPercent}
          completedItems={completedItems}
          missingItems={missingItems}
          nextStep={recommendedDept.name}
          onNextStep={() => navigate(recommendedDept.path)}
        />
      </div>

      {/* 5. Packet Pickup Panel */}
      <PacketPickupPanel
        packetState={packetState}
        packetTitle={packetTitle}
        onAction={() => navigate(packetState === 'none' ? recommendedDept.path : '/research/export')}
      />

      {/* Knowledge ticker — ambient motion */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2">
          <Rss className="w-3.5 h-3.5" style={{ color: 'hsl(190 60% 50% / 0.6)' }} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Live Knowledge Feed</span>
        </div>
        <div className="rss-shelf">
          <div className="rss-feed-track py-2 px-1">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <div key={idx} className="rss-feed-item">
                <div className="flex items-center gap-2 mb-1">
                  <span className="status-dot status-dot-idle" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{item.sub}</span>
                </div>
                <p className="text-xs font-medium text-foreground/80 truncate">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}