import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Loader2, ArrowLeft, Save, Shield, ExternalLink, Download, KeyRound,
  ShieldCheck, Archive, Plus, BookOpen, Lock
} from 'lucide-react';
import {
  getStatusBadge, REGISTRY_ACCESS_STATUS, REGISTRY_LICENSE_STATUS,
  REGISTRY_IMPORT_STATUS, REGISTRY_PRIORITY, REGISTRY_VERIFICATION_STATUS,
  REGISTRY_COPYRIGHT_STATUS, REGISTRY_LICENSE_REQUEST_STATUS,
  REGISTRY_COLLECTIONS, REGISTRY_SOURCE_TYPES
} from '@/lib/registryConstants';
import RegistryRecordForm from '@/components/admin/RegistryRecordForm';
import RegistryDemandPanel from '@/components/admin/RegistryDemandPanel';
import RegistryIssuePanel from '@/components/admin/RegistryIssuePanel';
import RegistryConnections from '@/components/admin/RegistryConnections';

function safeJsonParse(str, fallback) {
  if (str == null) return fallback;
  try { const val = JSON.parse(str); return val == null ? fallback : val; } catch { return fallback; }
}

function MetaRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

function BadgeRow({ label, statusMap, statusKey }) {
  const badge = getStatusBadge(statusMap, statusKey);
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`inline-block px-2 py-0.5 rounded text-xs w-fit ${badge.className}`}>{badge.label}</span>
    </div>
  );
}

export default function WorldScriptureRegistryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(id === 'new' || searchParams.get('mode') === 'edit');
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [newSource, setNewSource] = useState({ url: '', provider: '', access_type: '' });
  const [relatedRecords, setRelatedRecords] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (id === 'new') { setLoading(false); return; }
    base44.entities.WorldScriptureRegistry.get(id)
      .then(r => { setRecord(r); setAdminNotes(r.admin_notes || ''); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (record?.tradition && id !== 'new') {
      base44.entities.WorldScriptureRegistry.filter({ tradition: record.tradition }, '-updated_date', 5)
        .then(recs => setRelatedRecords((recs || []).filter(r => r.id !== id)))
        .catch(() => {});
    }
  }, [record, id]);

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Lock className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold mb-2">Admin Access Required</h2>
          <Button asChild className="mt-4"><Link to="/spiritual/library">Back to Library</Link></Button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // CREATE / EDIT MODE
  if (editMode) {
    return (
      <div className="min-h-screen p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" className="text-berna-orange hover:text-berna-orange/80 hover:bg-berna-orange/10" onClick={() => navigate('/admin/world-scripture-registry')}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-2xl font-heading font-bold">{id === 'new' ? 'New Registry Record' : 'Edit Record'}</h1>
          </div>
          <RegistryRecordForm
            initialData={record}
            onSave={async (data) => {
              if (id === 'new') {
                const created = await base44.entities.WorldScriptureRegistry.create(data);
                navigate(`/admin/world-scripture-registry/${created.id}`);
              } else {
                await base44.entities.WorldScriptureRegistry.update(id, data);
                setRecord({ ...record, ...data });
                setEditMode(false);
              }
            }}
            onCancel={() => {
              if (id === 'new') navigate('/admin/world-scripture-registry');
              else setEditMode(false);
            }}
          />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Record not found.</p>
          <Button asChild><Link to="/admin/world-scripture-registry">Back to Registry</Link></Button>
        </div>
      </div>
    );
  }

  // VIEW MODE
  const themes = safeJsonParse(record.themes, []);
  const translations = safeJsonParse(record.available_translations, []);
  const editions = safeJsonParse(record.available_editions, []);
  const sources = safeJsonParse(record.known_digital_sources, []);
  const relatedTexts = safeJsonParse(record.related_texts, []);

  const handleAction = async (action) => {
    switch (action) {
      case 'open_source': if (record.source_url) window.open(record.source_url, '_blank'); break;
      case 'queue_import':
        await base44.entities.WorldScriptureRegistry.update(id, { import_status: 'import_queued' });
        setRecord({ ...record, import_status: 'import_queued' }); break;
      case 'request_license':
        await base44.entities.WorldScriptureRegistry.update(id, { license_request_status: 'requested', license_status: 'license_needed' });
        await base44.entities.LicensingIssue.create({
          text_id: id, title: record.title, issue_type: 'license_needed',
          requested_by_user_id: user.id, requested_by_user_name: user.full_name,
          access_attempt_date: new Date().toISOString(), source_url: record.source_url || '',
          license_status: record.license_status, estimated_priority: 'high', admin_status: 'open'
        });
        setRecord({ ...record, license_request_status: 'requested', license_status: 'license_needed' }); break;
      case 'mark_licensed':
        await base44.entities.WorldScriptureRegistry.update(id, { license_status: 'licensed', access_status: 'available_in_producer', license_request_status: 'approved' });
        setRecord({ ...record, license_status: 'licensed', access_status: 'available_in_producer', license_request_status: 'approved' }); break;
      case 'verify':
        const now = new Date().toISOString();
        await base44.entities.WorldScriptureRegistry.update(id, { verification_status: 'admin_verified', last_verified_at: now, confidence_level: 'high' });
        setRecord({ ...record, verification_status: 'admin_verified', last_verified_at: now, confidence_level: 'high' }); break;
      case 'archive':
        await base44.entities.WorldScriptureRegistry.update(id, { is_archived: true });
        navigate('/admin/world-scripture-registry'); break;
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await base44.entities.WorldScriptureRegistry.update(id, { admin_notes: adminNotes });
    setRecord({ ...record, admin_notes: adminNotes });
    setSavingNotes(false);
  };

  const handleAddSource = async () => {
    if (!newSource.url) return;
    const updated = [...sources, newSource];
    await base44.entities.WorldScriptureRegistry.update(id, { known_digital_sources: JSON.stringify(updated) });
    setRecord({ ...record, known_digital_sources: JSON.stringify(updated) });
    setNewSource({ url: '', provider: '', access_type: '' });
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-berna-orange hover:text-berna-orange/80 hover:bg-berna-orange/10" onClick={() => navigate('/admin/world-scripture-registry')}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-2xl font-heading font-bold">{record.title}</h1>
              <p className="text-sm text-muted-foreground">{record.tradition} · {REGISTRY_COLLECTIONS[record.collection] || record.collection}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditMode(true)}><Shield className="w-4 h-4 mr-2" /> Edit Metadata</Button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {record.source_url && <Button variant="outline" size="sm" onClick={() => handleAction('open_source')}><ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Source</Button>}
          <Button variant="outline" size="sm" onClick={() => handleAction('queue_import')}><Download className="w-3.5 h-3.5 mr-1.5" /> Queue Import</Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('request_license')}><KeyRound className="w-3.5 h-3.5 mr-1.5" /> Request License</Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('mark_licensed')}><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Mark as Licensed</Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('verify')}><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Verify Source</Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleAction('archive')}><Archive className="w-3.5 h-3.5 mr-1.5" /> Archive</Button>
        </div>

        {/* Overview */}
        {record.description && (
          <div className="glass-panel p-5">
            <h3 className="font-heading font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{record.description}</p>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-4">Full Metadata</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetaRow label="Original Language" value={record.original_language} />
            <MetaRow label="Writing System" value={record.writing_system} />
            <MetaRow label="Author" value={record.author} />
            <MetaRow label="Traditional Attribution" value={record.traditional_attribution} />
            <MetaRow label="Historical Date" value={record.historical_date} />
            <MetaRow label="Scholarly Date Range" value={record.scholarly_date_range} />
            <MetaRow label="Region" value={record.region} />
            <MetaRow label="Category" value={record.category} />
            <MetaRow label="Source Type" value={REGISTRY_SOURCE_TYPES[record.source_type]?.label || record.source_type} />
            <MetaRow label="Source Provider" value={record.source_provider} />
            <MetaRow label="Source URL" value={record.source_url} />
            <MetaRow label="Alternate Titles" value={record.alternate_titles} />
          </div>
          {themes.length > 0 && (
            <div className="mt-4">
              <span className="text-xs text-muted-foreground">Themes:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {themes.map((t, i) => <span key={i} className="px-2 py-0.5 rounded text-xs bg-secondary/40">{t}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* Access & Licensing */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-4">Access & Licensing</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <BadgeRow label="Access Status" statusMap={REGISTRY_ACCESS_STATUS} statusKey={record.access_status} />
            <BadgeRow label="License Status" statusMap={REGISTRY_LICENSE_STATUS} statusKey={record.license_status} />
            <BadgeRow label="Copyright Status" statusMap={REGISTRY_COPYRIGHT_STATUS} statusKey={record.copyright_status} />
            <BadgeRow label="Import Status" statusMap={REGISTRY_IMPORT_STATUS} statusKey={record.import_status} />
            <BadgeRow label="Verification Status" statusMap={REGISTRY_VERIFICATION_STATUS} statusKey={record.verification_status} />
            <BadgeRow label="Priority" statusMap={REGISTRY_PRIORITY} statusKey={record.acquisition_priority} />
            <BadgeRow label="License Request" statusMap={REGISTRY_LICENSE_REQUEST_STATUS} statusKey={record.license_request_status} />
            <MetaRow label="Confidence Level" value={record.confidence_level} />
            <MetaRow label="User Demand Count" value={record.user_demand_count} />
            <MetaRow label="Last Verified" value={record.last_verified_at ? new Date(record.last_verified_at).toLocaleString() : 'Never'} />
            <MetaRow label="API Available" value={record.api_available ? 'Yes' : 'No'} />
            <MetaRow label="Full Text Available" value={record.full_text_available ? 'Yes' : 'No'} />
            <MetaRow label="Search Indexed" value={record.search_indexed ? 'Yes' : 'No'} />
            <MetaRow label="Study Workspace" value={record.study_workspace_enabled ? 'Enabled' : 'Disabled'} />
            <MetaRow label="Language Learning" value={record.language_learning_enabled ? 'Enabled' : 'Disabled'} />
            <MetaRow label="Comparison" value={record.comparison_enabled ? 'Enabled' : 'Disabled'} />
          </div>
        </div>

        {/* Known Digital Sources */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-3">Known Digital Sources</h3>
          {sources.length > 0 && (
            <div className="space-y-2 mb-4">
              {sources.map((s, i) => (
                <div key={i} className="p-2 rounded-lg bg-secondary/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.provider || 'Unknown provider'}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.url}</p>
                  </div>
                  {s.access_type && <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground shrink-0">{s.access_type}</span>}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[150px]"><Input placeholder="URL" value={newSource.url} onChange={e => setNewSource({ ...newSource, url: e.target.value })} /></div>
            <div className="flex-1 min-w-[120px]"><Input placeholder="Provider" value={newSource.provider} onChange={e => setNewSource({ ...newSource, provider: e.target.value })} /></div>
            <div className="flex-1 min-w-[120px]"><Input placeholder="Access Type" value={newSource.access_type} onChange={e => setNewSource({ ...newSource, access_type: e.target.value })} /></div>
            <Button size="sm" onClick={handleAddSource}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
          </div>
        </div>

        {/* Translations & Editions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-5">
            <h3 className="font-heading font-semibold mb-3">Available Translations</h3>
            {translations.length === 0 ? <p className="text-sm text-muted-foreground">No translations recorded.</p> : (
              <div className="space-y-1">
                {translations.map((t, i) => (
                  <div key={i} className="text-sm p-2 rounded bg-secondary/30">
                    {typeof t === 'string' ? t : `${t.name || t.language || 'Unknown'}${t.publisher ? ` — ${t.publisher}` : ''}`}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-panel p-5">
            <h3 className="font-heading font-semibold mb-3">Available Editions</h3>
            {editions.length === 0 ? <p className="text-sm text-muted-foreground">No editions recorded.</p> : (
              <div className="space-y-1">
                {editions.map((e, i) => (
                  <div key={i} className="text-sm p-2 rounded bg-secondary/30">
                    {typeof e === 'string' ? e : `${e.name || 'Unknown'}${e.publisher ? ` — ${e.publisher}` : ''}${e.year ? ` (${e.year})` : ''}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Demand & Issues */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RegistryDemandPanel textId={id} />
          <RegistryIssuePanel textId={id} />
        </div>

        {/* Admin Notes */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-3">Admin Notes</h3>
          <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={4} className="bg-secondary border border-border rounded-md" />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />} Save Notes
            </Button>
          </div>
        </div>

        {/* Related Records */}
        {relatedRecords.length > 0 && (
          <div className="glass-panel p-5">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Related Registry Records</h3>
            <div className="space-y-1.5">
              {relatedRecords.map(r => (
                <Link key={r.id} to={`/admin/world-scripture-registry/${r.id}`} className="block p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.tradition} · {REGISTRY_ACCESS_STATUS[r.access_status]?.label || r.access_status}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Connections */}
        <RegistryConnections tradition={record.tradition} />
      </div>
    </div>
  );
}