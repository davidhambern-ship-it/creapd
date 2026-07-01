import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, Users, Clock } from 'lucide-react';
import { getStatusBadge, REGISTRY_ACCESS_STATUS, REGISTRY_LICENSE_STATUS } from '@/lib/registryConstants';

export default function RegistryDemandPanel({ textId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!textId) return;
    base44.entities.RegistryDemandEvent.filter({ text_id: textId }, '-created_date', 50)
      .then(setEvents).catch(() => {}).finally(() => setLoading(false));
  }, [textId]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="glass-panel p-5">
      <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-accent" /> Demand History ({events.length})
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No demand events recorded.</p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => {
            const access = getStatusBadge(REGISTRY_ACCESS_STATUS, ev.current_access_status);
            const license = getStatusBadge(REGISTRY_LICENSE_STATUS, ev.current_license_status);
            return (
              <div key={ev.id} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{ev.user_name || 'Unknown user'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Requested: {ev.requested_action}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs ${access.className}`}>{access.label}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(ev.created_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}