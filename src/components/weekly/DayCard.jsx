import React from 'react';
import { Edit, Eye, Clock, Sparkles } from 'lucide-react';
import { DAY_STATUSES, DAY_LABELS, parseJSON } from '@/lib/weeklyConstants';

export default function DayCard({ dayPlan, date, dayName, isPlanningDay, isToday, onClick, onPreview }) {
  const status = dayPlan?.status || 'not_planned';
  const statusConfig = DAY_STATUSES[status] || DAY_STATUSES.not_planned;
  const categories = parseJSON(dayPlan?.selected_categories, []);
  const enabled = dayPlan?.enabled !== false;

  return (
    <div
      onClick={() => onClick(dayPlan, dayName, date)}
      className={`glass-panel p-4 cursor-pointer transition-all hover:border-white/[0.15] relative group ${
        isPlanningDay ? 'border-berna-orange/30 glow-orange' : ''
      } ${isToday ? 'border-berna-purple/40 glow-purple' : ''} ${
        !enabled ? 'opacity-50' : ''
      }`}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">{DAY_LABELS[dayName]}</h3>
            {isPlanningDay && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-berna-orange/10 border border-berna-orange/20 text-[9px] text-berna-orange font-semibold uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                Planning
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
          </p>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.dot} ${status === 'generating' ? 'pulse-glow' : ''}`} />
      </div>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${statusConfig.bg} border ${statusConfig.border} mb-3`}>
        <span className={`text-[10px] font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
      </div>

      {/* Theme */}
      {dayPlan?.theme && (
        <p className="text-xs text-white/80 font-medium mb-1 line-clamp-1">{dayPlan.theme}</p>
      )}
      {dayPlan?.energy && (
        <p className="text-[10px] text-muted-foreground mb-2">{dayPlan.energy}</p>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.slice(0, 4).map(cat => (
            <span key={cat} className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] text-white/60">
              {cat.replace(/_/g, ' ')}
            </span>
          ))}
          {categories.length > 4 && (
            <span className="px-1.5 py-0.5 text-[9px] text-muted-foreground">+{categories.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{dayPlan?.automation_time || '06:00'}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview?.(dayPlan); }}
            className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white"
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(dayPlan, dayName, date); }}
            className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-berna-purple"
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!dayPlan && (
        <p className="text-[10px] text-muted-foreground italic text-center py-2">Click to plan this day</p>
      )}
    </div>
  );
}