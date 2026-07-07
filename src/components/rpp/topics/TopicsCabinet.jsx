import React from 'react';

const ACCENT_COLORS = {
  purple: 'hsl(270 80% 60%)',
  cyan: 'hsl(190 80% 55%)',
  amber: 'hsl(35 90% 55%)',
  emerald: 'hsl(152 60% 50%)',
  orange: 'hsl(25 95% 55%)',
  pink: 'hsl(330 75% 60%)',
};

export default function TopicsCabinet({
  title,
  subtitle,
  icon: Icon,
  accent = 'cyan',
  index = 0,
  status,
  children,
  height = 'auto',
  span,
}) {
  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.cyan;

  const statusBadge = {
    not_started: { label: 'Empty', color: 'hsl(220 10% 35%)' },
    in_progress: { label: 'Active', color: 'hsl(35 90% 55%)' },
    complete: { label: 'Ready', color: 'hsl(152 60% 50%)' },
    needs_review: { label: 'Review', color: 'hsl(270 70% 60%)' },
  }[status];

  return (
    <div
      className="cabinet-screen-container group relative text-left rounded-xl overflow-hidden cc-animate-fade-up transition-all duration-300 hover:scale-[1.01] flex flex-col"
      style={{
        animationDelay: `${index * 0.08}s`,
        background: `linear-gradient(135deg, hsl(210 40% 8% / 0.5) 0%, hsl(210 40% 6% / 0.6) 50%, hsl(210 35% 5% / 0.5) 100%)`,
        border: `1px solid ${color}22`,
        backdropFilter: 'blur(16px) saturate(1.2)',
        boxShadow: `0 4px 24px hsl(210 50% 3% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.06), 0 0 20px ${color}08`,
        height: height !== 'auto' ? height : undefined,
        gridColumn: span === 2 ? 'span 2' : undefined,
      }}
    >
      {/* Glass top reflection */}
      <div
        className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none z-0"
        style={{ background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.04) 0%, transparent 100%)' }}
      />
      {/* Diagonal light refraction sweep on hover */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg, transparent 40%, hsl(0 0% 100% / 0.03) 50%, transparent 60%)' }}
      />
      {/* Top accent edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }}
      />
      {/* Pulsating glow border on hover */}
      <div
        className="absolute inset-0 pointer-events-none z-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: `inset 0 0 30px ${color}10, 0 0 24px ${color}12` }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
          <div>
            <h3 className="font-semibold text-sm text-white leading-tight" style={{ fontFamily: "'Ethnocentric', sans-serif" }}>{title}</h3>
            {subtitle && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {statusBadge && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0"
            style={{ background: `${statusBadge.color}1a`, color: statusBadge.color, border: `1px solid ${statusBadge.color}40` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusBadge.color, boxShadow: `0 0 4px ${statusBadge.color}` }} />
            {statusBadge.label}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}