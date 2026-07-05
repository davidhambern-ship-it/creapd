import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const NOTIF_COLORS = {
  info: 'text-blue-400',
  success: 'text-berna-emerald',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  briefing_ready: 'text-berna-purple',
  production_update: 'text-berna-orange',
  system: 'text-muted-foreground',
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.AppNotification.list('-created_date', 10);
      setNotifications(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) loadNotifications();
  }, [open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      try { await base44.entities.AppNotification.update(n.id, { read: true }); }
      catch (err) { console.error(err); }
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = (new Date() - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white h-8 w-8 relative" onClick={() => setOpen(!open)}>
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-berna-orange text-white text-[8px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 w-80 glass-panel-navy border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[10px] text-berna-purple hover:underline flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-5 h-5 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map(notif => (
                <div key={notif.id} className={`px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${!notif.read ? 'bg-berna-purple/[0.04]' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${notif.read ? 'bg-transparent' : 'bg-berna-purple'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{notif.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] ${NOTIF_COLORS[notif.type] || 'text-muted-foreground'}`}>{notif.type?.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] text-muted-foreground">{formatDate(notif.created_date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications</p>
              </div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-white/[0.06]">
            <Link to="/news/activitycenter" onClick={() => setOpen(false)} className="text-[10px] text-berna-purple hover:underline block text-center">
              View all in Activity Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}