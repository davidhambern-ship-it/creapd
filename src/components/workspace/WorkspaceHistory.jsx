import React from 'react';
import { Activity, Clock } from 'lucide-react';

const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  generate: 'Generated',
  export: 'Exported',
  approve: 'Approved',
  reject: 'Rejected',
};

export default function WorkspaceHistory({ history }) {
  return (
    <div className="glass-panel p-4 space-y-2">
      <h3 className="text-sm font-semibold text-white neon-underline">Production History</h3>
      {history.length > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {history.map(entry => (
            <div key={entry.id} className="flex items-start gap-2 p-1.5 rounded-lg bg-white/[0.02]">
              <Activity className="w-3 h-3 text-berna-purple mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/80">{entry.details || ACTION_LABELS[entry.action] || entry.action}</p>
                <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-2 h-2" />
                  {new Date(entry.created_date).toLocaleString()}
                  {entry.user_name && ` · ${entry.user_name}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">No activity yet.</p>
      )}
    </div>
  );
}