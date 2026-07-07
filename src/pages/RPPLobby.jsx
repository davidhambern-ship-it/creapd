import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import { base44 } from '@/api/base44Client';
import { Loader2, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import DepartmentCabinet from '@/components/rpp/lobby/DepartmentCabinet';
import NerveCenterBackground from '@/components/rpp/lobby/NerveCenterBackground';
import NerveCenterTopBar from '@/components/rpp/lobby/NerveCenterTopBar';
import NerveCenterSideRail from '@/components/rpp/lobby/NerveCenterSideRail';
import NerveCenterBottomConsole from '@/components/rpp/lobby/NerveCenterBottomConsole';

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
  const { config, topics, points, packages, dossiers, loading } = researchData;
  const [userName, setUserName] = useState('');

  const researchingTopics = topics.filter(t => t.status === 'researching');
  const approvedPackages = packages.filter(p => p.status === 'approved' || p.status === 'finalized');

  const checklist = [
    { label: 'Configuration Saved', done: !!config?.production_name },
    { label: 'Research Assignment', done: topics.length > 0 },
    { label: 'Research Complete', done: topics.some(t => t.status === 'researched' || t.status === 'in_review') },
    { label: 'Points Extracted', done: points.length > 0 },
    { label: 'Packages Generated', done: packages.length > 0 },
  ];
  const completedItems = checklist.filter(c => c.done).length;
  const readinessPercent = Math.round((completedItems / checklist.length) * 100);

  const recommendedDeptId = getRecommendedDeptId(topics, points, packages, approvedPackages, dossiers);
  const recommendedDept = RPP_DEPARTMENTS.find(d => d.id === recommendedDeptId) || RPP_DEPARTMENTS[1];

  const departments = RPP_DEPARTMENTS.filter(d => d.id !== 'lobby').map((d, i) => ({
    dept: d,
    status: getDeptStatus(d.id, topics, points, packages, dossiers),
    count: { topics: topics.length, research: points.length, dossier: (dossiers || []).length, develop: packages.length, packet: approvedPackages.length }[d.id] || 0,
    recommended: d.id === recommendedDeptId,
    index: i,
  }));

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

  const ctaLabel = topics.length === 0 ? 'Start New Topic' : approvedPackages.length > 0 ? 'Collect Packet' : 'Continue Project';

  useEffect(() => {
    base44.auth.me().then(u => { if (u?.full_name) setUserName(u.full_name.split(' ')[0]); }).catch(() => {});
  }, []);

  if (loading) {
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

  const firstName = userName || 'there';

  return (
    <div className="nc-shell">
      <NerveCenterBackground />
      <NerveCenterTopBar readiness={readinessPercent} />
      <div className="nc-body">
        <NerveCenterSideRail side="left" />
        <div className="nc-viewport">
          <div className="max-w-5xl mx-auto relative" style={{ zIndex: 1 }}>
            {/* ═══ Hero ═══ */}
            <div className="text-center mb-8 md:mb-10 cc-animate-fade-up">
              <div className="flex items-center justify-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5" style={{ color: 'hsl(35 80% 55%)' }} />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Research Production Profile
                </span>
              </div>
              <h1
                className="text-3xl md:text-4xl font-heading font-bold mb-2"
                style={{ textShadow: '0 0 24px hsl(190 80% 60% / 0.15)' }}
              >
                Welcome back, {firstName}.
              </h1>
              <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
                {config?.production_name
                  ? <>Your <span style={{ color: 'hsl(35 80% 58%)' }}>{config.production_name}</span> project is <span style={{ color: 'hsl(152 55% 50%)' }}>{readinessPercent}% ready</span>.</>
                  : 'No active research project configured yet.'}
              </p>

              {/* Recommendation + CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {recommendation && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(190 70% 55%)' }}>
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>{recommendation}</span>
                  </div>
                )}
                <button
                  onClick={() => navigate(recommendedDept.path)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:gap-3 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, hsl(190 50% 18% / 0.5), hsl(270 50% 18% / 0.3))',
                    border: '1px solid hsl(190 50% 35% / 0.5)',
                    color: 'hsl(190 80% 65%)',
                    boxShadow: '0 0 20px hsl(190 50% 30% / 0.1)',
                  }}
                >
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ═══ Department Cabinets ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {departments.map((d) => (
                <DepartmentCabinet
                  key={d.dept.id}
                  dept={d.dept}
                  status={d.status}
                  count={d.count}
                  recommended={d.recommended}
                  index={d.index}
                />
              ))}
            </div>

            {/* ═══ Readiness bar ═══ */}
            <div className="mt-8 flex items-center gap-3 px-4 py-3 rounded-xl cc-animate-fade-up cc-stagger-5"
              style={{
                background: 'hsl(210 40% 7% / 0.5)',
                border: '1px solid hsl(190 30% 20% / 0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 shrink-0">Readiness</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 12% / 0.5)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${readinessPercent}%`,
                    background: 'linear-gradient(90deg, hsl(190 60% 45%), hsl(152 55% 50%))',
                  }}
                />
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: 'hsl(190 70% 55%)' }}>{readinessPercent}%</span>
            </div>
          </div>
        </div>
        <NerveCenterSideRail side="right" />
      </div>
      <NerveCenterBottomConsole />
    </div>
  );
}