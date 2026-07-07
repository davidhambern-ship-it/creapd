import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const STATUS_CONFIG = {
  not_started: { color: 'hsl(220 10% 35%)', label: 'Not Started' },
  in_progress: { color: 'hsl(35 90% 55%)', label: 'In Progress' },
  complete: { color: 'hsl(152 60% 50%)', label: 'Complete' },
  needs_review: { color: 'hsl(270 70% 60%)', label: 'Needs Review' },
  blocked: { color: 'hsl(0 72% 51%)', label: 'Blocked' },
};

export default function DepartmentCabinet({ dept, status, count, recommended, index }) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;

  // Build a long scrolling text block for the RSS feed — thorough department description
  const feedText = dept.detailed_description || dept.description;
  const scrollText = Array.from({ length: 4 }, (_, i) => ({
    key: i,
    title: feedText,
    sub: dept.subtitle,
    output: dept.output,
  }));

  return (
    <button
      onClick={() => navigate(dept.path)}
      className="cabinet-screen-container group relative text-left rounded-xl overflow-hidden cc-animate-fade-up transition-all duration-300 hover:scale-[1.02]"
      style={{
        animationDelay: `${index * 0.08}s`,
        background: 'linear-gradient(135deg, hsl(190 40% 14% / 0.25) 0%, hsl(210 40% 8% / 0.4) 50%, hsl(190 30% 6% / 0.3) 100%)',
        border: '1px solid hsl(190 40% 60% / 0.18)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        boxShadow: '0 4px 24px hsl(190 50% 3% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.08), inset 0 -1px 0 hsl(190 40% 20% / 0.1)',
      }}
    >
      {/* Glass top reflection — glossy light streak */}
      <div
        className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none z-0"
        style={{ background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.06) 0%, transparent 100%)' }}
      />
      {/* Diagonal light refraction sweep */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg, transparent 40%, hsl(0 0% 100% / 0.04) 50%, transparent 60%)' }}
      />
      {/* Top accent edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${statusCfg.color} / 0.5, transparent)` }}
      />

      {/* Recommended badge */}
      {recommended && (
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium z-20"
          style={{
            background: 'hsl(35 80% 20% / 0.5)',
            color: 'hsl(35 90% 60%)',
            border: '1px solid hsl(35 50% 30% / 0.5)',
          }}
        >
          <Sparkles className="w-2.5 h-2.5" /> Next
        </div>
      )}

      {/* Header — title only */}
      <div className="p-4 pb-2 text-center">
        <h3 className="font-semibold text-sm text-white" style={{ fontFamily: "'Robotica', sans-serif" }}>{dept.name}</h3>
      </div>

      {/* RSS feed display — vertical scroll */}
      <div
        className="relative mx-4 mb-4 rounded-lg overflow-hidden"
        style={{
        height: '320px',
        background: 'transparent',
        border: '1px solid hsl(190 40% 50% / 0.12)',
        backdropFilter: 'blur(4px)',
        }}
      >
        {/* Fade mask top + bottom */}
        <div className="absolute top-0 left-0 right-0 h-4 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent, transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-4 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(0deg, transparent, transparent)' }} />

        <div className="cabinet-screen-track py-2 text-center">
          {[...scrollText, ...scrollText].map((block, i) => (
            <div key={i} className="px-3 pb-3">
              <p className="text-sm leading-relaxed text-muted-foreground/80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{block.title}</p>
              {block.output && (
                <p className="text-[11px] uppercase tracking-wider mt-1" style={{ color: `${statusCfg.color} / 0.7)` }}>
                  Output: {block.output}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}