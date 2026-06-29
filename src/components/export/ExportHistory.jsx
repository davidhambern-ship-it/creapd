import React from 'react';
import { History, CheckCircle2, XCircle } from 'lucide-react';

export default function ExportHistory({ logs }) {
  if (logs.length === 0) {
    return (
      <div className="glass-panel p-6 text-center">
        <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No exports yet</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-berna-purple" />
        <h3 className="text-sm font-semibold text-white">Export History</h3>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/[0.03] text-xs">
            {log.status === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-berna-emerald flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            )}
            <span className="text-white/70 truncate flex-1">{log.file_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{log.format}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(log.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}