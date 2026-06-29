import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Bell, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ACTION_ICONS = {
  create: '✨',
  update: '✏️',
  delete: '🗑️',
  generate: '⚡',
  export: '📤',
  approve: '✅',
  reject: '❌',
  login: '🔑',
  share: '🔗',
  invite: '✉️',
};

const ACTION_COLORS = {
  create: 'text-berna-emerald',
  update: 'text-blue-400',
  delete: 'text-red-400',
  generate: 'text-berna-purple',
  export: 'text-berna-orange',
  approve: 'text-berna-emerald',
  reject: 'text-red-400',
  login: 'text-muted-foreground',
  share: 'text-blue-400',
  invite: 'text-berna-orange',
};

const NOTIF_COLORS = {
  info: 'text-blue-400',
  success: 'text-berna-emerald',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  briefing_ready: 'text-berna-purple',
  production_update: 'text-berna-orange',
  system: 'text-muted-foreground',
};

export default function ActivityCenter() {
  const [tab, setTab] = useState('activity');
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logRes, notifRes] = await Promise.all([
        base44.entities.ActivityLog.list('-created_date', 100),
        base44.entities.AppNotification.list('-created_date', 50),
      ]);
      setLogs(logRes);
      setNotifications(notifRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      try {
        await base44.entities.AppNotification.update(n.id, { read: true });
      } catch (err) { console.error(err); }
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotif = async (id) => {
    try {
      await base44.entities.AppNotification.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Activity Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Track actions and manage notifications</p>
        </div>
        {tab === 'notifications' && unreadCount > 0 && (
          <Button size="sm" variant="outline" className="border-white/10 text-white text-xs h-8 hover:bg-white/[0.04]" onClick={handleMarkAllRead}>
            <CheckCheck className="w-3 h-3 mr-1" />Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 glass-panel p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('activity')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'activity' ? 'bg-berna-purple/20 text-berna-purple' : 'text-muted-foreground hover:text-white'}`}
        >
          <Activity className="w-3.5 h-3.5" />Activity Log
        </button>
        <button
          onClick={() => setTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'notifications' ? 'bg-berna-purple/20 text-berna-purple' : 'text-muted-foreground hover:text-white'}`}
        >
          <Bell className="w-3.5 h-3.5" />Notifications
          {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-berna-orange text-white text-[9px] font-bold">{unreadCount}</span>}
        </button>
      </div>

      {/* Activity Log */}
      {tab === 'activity' && (
        <div className="space-y-2">
          {logs.length > 0 ? logs.map(log => (
            <div key={log.id} className="glass-panel p-3 flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{ACTION_ICONS[log.action] || '•'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white">
                  <span className={`font-semibold ${ACTION_COLORS[log.action] || 'text-white'}`}>{log.action}</span>
                  {log.entity_type && <span className="text-muted-foreground"> · {log.entity_type}</span>}
                  {log.entity_name && <span className="text-white/80"> · {log.entity_name}</span>}
                </p>
                {log.details && <p className="text-[10px] text-muted-foreground mt-0.5">{log.details}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {log.user_name && <span className="text-[10px] text-muted-foreground">{log.user_name}</span>}
                  <span className="text-[10px] text-muted-foreground">{formatDate(log.created_date)}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="glass-panel p-12 text-center">
              <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="space-y-2">
          {notifications.length > 0 ? notifications.map(notif => (
            <div key={notif.id} className={`glass-panel p-3 flex items-start gap-3 ${!notif.read ? 'border-berna-purple/20' : ''}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${notif.read ? 'bg-transparent' : 'bg-berna-purple pulse-glow'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">{notif.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{notif.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] ${NOTIF_COLORS[notif.type] || 'text-muted-foreground'}`}>{notif.type?.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(notif.created_date)}</span>
                  {notif.link && <Link to={notif.link} className="text-[10px] text-berna-purple hover:underline">View →</Link>}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400" onClick={() => handleDeleteNotif(notif.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )) : (
            <div className="glass-panel p-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}