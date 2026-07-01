import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { REGISTRY_ISSUE_TYPE, REGISTRY_ISSUE_ADMIN_STATUS, getStatusBadge } from '@/lib/registryConstants';

export default function RegistryIssuePanel({ textId }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!textId) return;
    setLoading(true);
    base44.entities.LicensingIssue.filter({ text_id: textId }, '-created_date', 50)
      .then(setIssues).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [textId]);

  const updateStatus = async (issueId, newStatus) => {
    const updates = { admin_status: newStatus };
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    await base44.entities.LicensingIssue.update(issueId, updates);
    load();
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="glass-panel p-5">
      <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" /> Licensing Issues ({issues.length})
      </h3>
      {issues.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-berna-emerald" /> No licensing issues recorded.
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map(issue => {
            const typeBadge = getStatusBadge(REGISTRY_ISSUE_TYPE, issue.issue_type);
            const statusBadge = getStatusBadge(REGISTRY_ISSUE_ADMIN_STATUS, issue.admin_status);
            const priorityBadge = getStatusBadge({ critical: { label: 'Critical', color: 'red' }, high: { label: 'High', color: 'orange' }, medium: { label: 'Medium', color: 'yellow' }, low: { label: 'Low', color: 'muted' } }, issue.estimated_priority);
            return (
              <div key={issue.id} className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${typeBadge.className}`}>{typeBadge.label}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${priorityBadge.className}`}>{priorityBadge.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(issue.created_date).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Requested by: {issue.requested_by_user_name || 'Unknown'} · License: {issue.license_status}
                </p>
                {issue.notes && <p className="text-xs text-muted-foreground mb-2">{issue.notes}</p>}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusBadge.className}`}>{statusBadge.label}</span>
                  <select
                    value={issue.admin_status}
                    onChange={e => updateStatus(issue.id, e.target.value)}
                    className="bg-secondary border border-border rounded px-2 py-1 text-xs"
                  >
                    {Object.entries(REGISTRY_ISSUE_ADMIN_STATUS).map(([val, d]) => (
                      <option key={val} value={val}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}