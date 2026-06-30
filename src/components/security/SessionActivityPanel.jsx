import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Loader2, Monitor, LogIn } from 'lucide-react';

export default function SessionActivityPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.ActivityLog.filter({ action: 'login' }, '-created_date', 20);
        setLogs(items);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-berna-purple" />
        <h3 className="text-sm font-semibold text-white">Session Management</h3>
      </div>
      <p className="text-xs text-muted-foreground">Review your recent login activity. Sessions automatically expire after extended periods of inactivity.</p>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center gap-2">
          <LogIn className="w-3.5 h-3.5 text-berna-purple" />
          <h4 className="text-xs font-semibold text-white">Login History</h4>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-berna-purple animate-spin" /></div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No login activity recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between bg-white/[0.03] rounded-md p-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-white">{log.user_name || 'Unknown'}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">{log.details || 'Login'}</p>
                  <p className="text-[10px] text-muted-foreground/70">{log.created_date ? new Date(log.created_date).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel p-3">
        <p className="text-[10px] text-muted-foreground">
          <span className="text-berna-purple font-medium">Session Security:</span> Active sessions are managed securely. To terminate all sessions, use the logout function from your profile. Password reset and email verification are handled through the authentication system.
        </p>
      </div>
    </div>
  );
}