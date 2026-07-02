import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, ExternalLink, KeyRound, ShieldCheck, AlertTriangle, FlaskConical, Edit3, Save, X } from 'lucide-react';
import { APPROVAL_STATUS_COLORS, HEALTH_STATUS_COLORS, PROVIDER_TYPES, SOURCE_TYPES, AUTH_TYPES, LICENSE_STATUSES, MONITORING_FREQUENCIES, RECOMMENDED_USES, RELIABILITY_FORECASTS } from '@/lib/smcConstants';

export default function SMCSourceDetail({ sourceId, onBack }) {
  const [source, setSource] = useState(null);
  const [tests, setTests] = useState([]);
  const [events, setEvents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await base44.entities.SMCSource.get(sourceId);
        setSource(s); setForm(s);
        const [t, e, a] = await Promise.all([
          base44.entities.SMCConnectionTest.filter({ source_id: sourceId }, '-created_date', 10).catch(() => []),
          base44.entities.SMCMonitoringEvent.filter({ source_id: sourceId }, '-created_date', 20).catch(() => []),
          base44.entities.SMCProviderAccount.filter({ source_id: sourceId }, '-created_date', 10).catch(() => []),
        ]);
        setTests(t || []); setEvents(e || []); setAccounts(a || []);
      } catch (err) { console.error('Source detail error:', err); }
      finally { setLoading(false); }
    })();
  }, [sourceId]);

  const handleSave = async () => {
    try { await base44.entities.SMCSource.update(sourceId, form); setSource(form); setEditing(false); }
    catch (err) { console.error('Update error:', err); }
  };

  const handleTest = async () => {
    setTesting(true);
    try { await base44.functions.invoke('testSMCConnection', { source_id: sourceId }); const t = await base44.entities.SMCConnectionTest.filter({ source_id: sourceId }, '-created_date', 10); setTests(t || []); }
    catch (err) { console.error('Test error:', err); }
    finally { setTesting(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!source) return <div className="text-center py-12 text-muted-foreground">Source not found</div>;

  const data = editing ? form : source;

  const Section = ({ title, children }) => (
    <div className="glass-panel p-4">
      <h3 className="font-heading font-semibold text-sm mb-3 neon-underline pb-2">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value, field, type = 'text' }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {editing ? (
        type === 'select' ? null :
        <input className="w-full bg-secondary/30 px-2 py-1 rounded text-sm border border-border" value={form[field] ?? ''} onChange={e => setForm({ ...form, [field]: e.target.value })} />
      ) : (
        <p className="text-sm">{value || '—'}</p>
      )}
    </div>
  );

  const SelectField = ({ label, value, field, options }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {editing ? (
        <select className="w-full bg-secondary/30 px-2 py-1 rounded text-sm border border-border" value={form[field] ?? ''} onChange={e => setForm({ ...form, [field]: e.target.value })}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <p className="text-sm">{value || '—'}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Sources
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleTest} disabled={testing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary text-sm hover:bg-primary/30">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Test Connection
          </button>
          {editing ? (
            <>
              <button onClick={() => { setForm(source); setEditing(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-secondary/50"><X className="w-4 h-4" /> Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Save className="w-4 h-4" /> Save</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-secondary/50"><Edit3 className="w-4 h-4" /> Edit</button>
          )}
        </div>
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold">{data.source_name}</h2>
            <p className="text-sm text-muted-foreground">{data.provider_name} · {data.provider_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs ${APPROVAL_STATUS_COLORS[data.approval_status] || ''}`}>{data.approval_status}</span>
            <span className={`px-2.5 py-1 rounded text-xs ${HEALTH_STATUS_COLORS[data.health_status] || ''}`}>{data.health_status}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          <div><p className="text-xs text-muted-foreground">Trust Score</p><p className="text-lg font-bold text-primary">{data.trust_score}</p></div>
          <div><p className="text-xs text-muted-foreground">Confidence</p><p className="text-lg font-bold text-accent">{data.confidence_score}</p></div>
          <div><p className="text-xs text-muted-foreground">Health Score</p><p className="text-lg font-bold text-berna-emerald">{data.health_score}</p></div>
          <div><p className="text-xs text-muted-foreground">Capability Score</p><p className="text-lg font-bold">{data.overall_capability_score}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Provider Information">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider Name" value={data.provider_name} field="provider_name" />
            <SelectField label="Provider Type" value={data.provider_type} field="provider_type" options={PROVIDER_TYPES} />
            <SelectField label="Source Type" value={data.source_type} field="source_type" options={SOURCE_TYPES} />
            <Field label="Website" value={data.website} field="website" />
            <Field label="Documentation" value={data.documentation_url} field="documentation_url" />
            <Field label="Developer Portal" value={data.developer_portal_url} field="developer_portal_url" />
            <Field label="Support Contact" value={data.support_contact} field="support_contact" />
            <Field label="Parent Organization" value={data.parent_organization} field="parent_organization" />
          </div>
        </Section>

        <Section title="Access & Authentication">
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Authentication Type" value={data.authentication_type} field="authentication_type" options={AUTH_TYPES} />
            <SelectField label="Monitoring Frequency" value={data.monitoring_frequency} field="monitoring_frequency" options={MONITORING_FREQUENCIES} />
            <Field label="API Base URL" value={data.api_base_url} field="api_base_url" />
            <Field label="Data Endpoint" value={data.data_endpoint} field="data_data_endpoint" />
            <div><p className="text-xs text-muted-foreground mb-0.5">API Key Required</p><p className="text-sm">{data.api_key_required ? 'Yes' : 'No'}</p></div>
            <div><p className="text-xs text-muted-foreground mb-0.5">Account Required</p><p className="text-sm">{data.account_required ? 'Yes' : 'No'}</p></div>
            <Field label="Rate Limits" value={data.rate_limits} field="rate_limits" />
            <Field label="API Version" value={data.api_version} field="api_version" />
          </div>
        </Section>

        <Section title="License & Usage Rights">
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="License Status" value={data.license_status} field="license_status" options={LICENSE_STATUSES} />
            <SelectField label="Recommended Use" value={data.recommended_use} field="recommended_use" options={RECOMMENDED_USES} />
            <div><p className="text-xs text-muted-foreground mb-0.5">Redistribution</p><p className="text-sm">{data.redistribution_allowed ? 'Allowed' : 'Restricted'}</p></div>
            <div><p className="text-xs text-muted-foreground mb-0.5">Commercial Use</p><p className="text-sm">{data.commercial_use_allowed ? 'Allowed' : 'Restricted'}</p></div>
            <Field label="Usage Rights" value={data.usage_rights} field="usage_rights" />
            <Field label="Citation Requirements" value={data.citation_requirements} field="citation_requirements" />
          </div>
        </Section>

        <Section title="System Compatibility & Health">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><ShieldCheck className={`w-4 h-4 ${data.seeder_compatible ? 'text-berna-emerald' : 'text-muted-foreground'}`} /><span className="text-sm">Seeder Compatible</span></div>
            <div className="flex items-center gap-2"><ShieldCheck className={`w-4 h-4 ${data.cae_compatible ? 'text-berna-emerald' : 'text-muted-foreground'}`} /><span className="text-sm">CAE Compatible</span></div>
            <div className="flex items-center gap-2"><ShieldCheck className={`w-4 h-4 ${data.research_compatible ? 'text-berna-emerald' : 'text-muted-foreground'}`} /><span className="text-sm">Research Compatible</span></div>
            <div className="flex items-center gap-2"><ShieldCheck className={`w-4 h-4 ${data.library_compatible ? 'text-berna-emerald' : 'text-muted-foreground'}`} /><span className="text-sm">Library Compatible</span></div>
            <SelectField label="Reliability Forecast" value={data.reliability_trend} field="reliability_trend" options={RELIABILITY_FORECASTS} />
            <Field label="Avg Response (ms)" value={data.average_response_time_ms} field="average_response_time_ms" />
            <Field label="Last Checked" value={data.last_checked_at ? new Date(data.last_checked_at).toLocaleString() : '—'} />
            <Field label="Last Successful" value={data.last_successful_connection ? new Date(data.last_successful_connection).toLocaleString() : '—'} />
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Connection Tests">
          {tests.length === 0 ? <p className="text-sm text-muted-foreground">No tests yet.</p> : (
            <div className="space-y-2">
              {tests.map(t => (
                <div key={t.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/20">
                  <span className={`w-2 h-2 rounded-full ${t.status === 'Passed' ? 'bg-berna-emerald' : t.status === 'Failed' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <span className="text-xs flex-1">{t.test_type} · {new Date(t.created_date).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{t.response_time_ms}ms</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Monitoring Activity">
          {events.length === 0 ? <p className="text-sm text-muted-foreground">No monitoring events.</p> : (
            <div className="space-y-2">
              {events.map(e => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/20">
                  <AlertTriangle className={`w-3.5 h-3.5 ${e.severity === 'Critical' ? 'text-red-400' : e.severity === 'Warning' ? 'text-amber-400' : 'text-berna-emerald'}`} />
                  <span className="text-xs flex-1">{e.event_type}</span>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Admin Notes">
        {editing ? <textarea className="w-full bg-secondary/30 px-3 py-2 rounded text-sm border border-border min-h-[80px]" value={form.admin_notes ?? ''} onChange={e => setForm({ ...form, admin_notes: e.target.value })} /> : <p className="text-sm">{source.admin_notes || 'No notes'}</p>}
      </Section>
    </div>
  );
}