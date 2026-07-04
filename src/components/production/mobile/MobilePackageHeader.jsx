import React from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { STATUS_STYLES } from './stageConfig';

export default function MobilePackageHeader({ article, pkg, onBack, status }) {
  const st = STATUS_STYLES[status] || STATUS_STYLES.not_started;
  return (
    <div className="glass-panel px-3 py-2 flex items-center gap-2">
      <button onClick={onBack} className="text-berna-orange hover:text-berna-orange/80 flex-shrink-0 p-1 -ml-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-berna-orange rounded" aria-label="Back to stories">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-xs font-bold text-white truncate leading-tight">{article?.title}</h2>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} flex-shrink-0`} />
          <span className={`text-[9px] uppercase tracking-wider ${st.color}`}>{st.label}</span>
          {pkg?.estimated_runtime && (
            <span className="text-[9px] text-berna-emerald flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{pkg.estimated_runtime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}