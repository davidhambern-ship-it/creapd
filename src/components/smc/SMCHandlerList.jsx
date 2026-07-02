import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Loader2, Search, Plus, Pencil, Trash2, Play, ChevronDown, ChevronUp,
  Zap, ShieldCheck, AlertTriangle, Clock, Activity, X, CheckCircle, XCircle,
  Server, FileCode, Settings
} from 'lucide-react';

export const HANDLER_TYPES = [
  'Generic REST API', 'Bible API', 'Quran API', 'SuttaCentral API', 'Open Scripture API',
  'Project Gutenberg', 'Internet Archive', 'Wikisource', 'GitHub Repository',
  'Bulk Download', 'ZIP Archive', 'EPUB Source', 'PDF Source',
  'XML Feed', 'JSON Feed', 'CSV Feed', 'RSS Feed',
  'OAI-PMH', 'IIIF', 'HTML Page', 'Manual Upload', 'Future Custom Handler'
];

const STATUS_OPTIONS = ['Active', 'Beta', 'Experimental', 'Deprecated', 'Retired', 'Disabled', 'Needs Update'];
const HEALTH_META = {
  'Healthy': { color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', icon: CheckCircle },
  'Warning': { color: 'text-accent', bg: 'bg-accent/10', icon: AlertTriangle },
  'Failing': { color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  'Deprecated': { color: 'text-muted-foreground', bg: 'bg-muted', icon: AlertTriangle },
  'Disabled': { color: 'text-muted-foreground', bg: 'bg-muted', icon: XCircle },
  'Needs Update': { color: 'text-accent', bg: 'bg-accent/10', icon: AlertTriangle },
  'Unknown': { color: 'text-muted-foreground', bg: 'bg-secondary', icon: Activity },
};

function parseJsonArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return []; }
}

function arrayToText(arr) {
  const parsed = parseJsonArray(arr);
  return parsed.join(', ');
}

function textToJsonArray(text) {
  if (!text || !text.trim()) return JSON.stringify([]);
  return JSON.stringify(text.split(',').map(s => s.trim()).filter(Boolean));
}

const EMPTY_FORM = {
  handler_name: '', handler_type: 'Generic REST API', status: 'Active',
  description: '', supported_providers: '', supported_formats: '',
  compatible_parsers: '', timeout_rules: '{"default_ms":15000,"max_ms":30000}',
  retry_rules: '{"max_retries":3,"backoff_ms":1000}',
  rate_limit_rules: '{"requests_per_minute":60}', admin_notes: ''
};

export default function SMCHandlerList({ handlers, onRefresh, sources }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(null);
  const [testSourceId, setTestSourceId] = useState('');
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(() => {
    return (handlers || [])
      .filter(h => {
        if (typeFilter !== 'all' && h.handler_type !== typeFilter) return false;
        if (statusFilter !== 'all' && h.status !== statusFilter) return false;
        if (healthFilter !== 'all' && h.health_status !== healthFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (h.handler_name || '').toLowerCase().includes(q) ||
            (h.description || '').toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (a.handler_name || '').localeCompare(b.handler_name || ''));
  }, [handlers, search, typeFilter, statusFilter, healthFilter]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const handleOpenEdit = (handler) => {
    setEditing(handler);
    setForm({
      handler_name: handler.handler_name || '',
      handler_type: handler.handler_type || 'Generic REST API',
      status: handler.status || 'Active',
      description: handler.description || '',
      supported_providers: arrayToText(handler.supported_providers),
      supported_formats: arrayToText(handler.supported_formats),
      compatible_parsers: arrayToText(handler.compatible_parsers),
      timeout_rules: handler.timeout_rules || '{"default_ms":15000,"max_ms":30000}',
      retry_rules: handler.retry_rules || '{"max_retries":3,"backoff_ms":1000}',
      rate_limit_rules: handler.rate_limit_rules || '{"requests_per_minute":60}',
      admin_notes: handler.admin_notes || ''
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.handler_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        handler_name: form.handler_name,
        handler_type: form.handler_type,
        status: form.status,
        description: form.description,
        supported_providers: textToJsonArray(form.supported_providers),
        supported_formats: textToJsonArray(form.supported_formats),
        compatible_parsers: textToJsonArray(form.compatible_parsers),
        timeout_rules: form.timeout_rules,
        retry_rules: form.retry_rules,
        rate_limit_rules: form.rate_limit_rules,
        admin_notes: form.admin_notes
      };
      if (editing) {
        await base44.entities.SMCHandler.update(editing.id, payload);
      } else {
        await base44.entities.SMCHandler.create(payload);
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      console.error('Save error:', err);
    }
    setSaving(false);
  };

  const handleTest = async (handler) => {
    setTesting(handler.id);
    setTestResult(null);
    try {
      const resp = await base44.functions.invoke('testSMCHandler', {
        handler_id: handler.id,
        source_id: testSourceId || undefined
      });
      setTestResult({ handler, package: (resp.data || resp).response_package, stats: (resp.data || resp).handler_stats });
      await onRefresh();
    } catch (err) {
      setTestResult({ handler, error: err.message || 'Test failed' });
    }
    setTesting(null);
  };

  const handleDelete = async (handler) => {
    if (!confirm(`Delete handler "${handler.handler_name}"?`)) return;
    setDeleting(handler.id);
    try {
      await base44.entities.SMCHandler.delete(handler.id);
      await onRefresh();
    } catch (err) { console.error(err); }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="glass-panel p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search handlers by name or description..."
              className="w-full glass-panel pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
            <option value="all">All Types</option>
            {HANDLER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
            <option value="all">All Health</option>
            {Object.keys(HEALTH_META).map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <Button size="sm" onClick={handleOpenCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> New Handler
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} of {handlers?.length || 0} handlers shown</p>
      </div>

      {/* Handler List */}
      <div className="space-y-2">
        {filtered.map(handler => {
          const health = HEALTH_META[handler.health_status] || HEALTH_META['Unknown'];
          const HealthIcon = health.icon;
          const isExpanded = expandedId === handler.id;
          const providers = parseJsonArray(handler.supported_providers);
          const formats = parseJsonArray(handler.supported_formats);
          const parsers = parseJsonArray(handler.compatible_parsers);
          const isTesting = testing === handler.id;
          const isDeleting = deleting === handler.id;

          return (
            <div key={handler.id} className="glass-panel overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : handler.id)}
                className="flex items-center gap-3 w-full p-4 hover:bg-secondary/20 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-lg ${health.bg} flex items-center justify-center shrink-0`}>
                  <HealthIcon className={`w-4 h-4 ${health.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{handler.handler_name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/40 text-muted-foreground shrink-0">{handler.handler_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded ${handler.status === 'Active' ? 'bg-berna-emerald/10 text-berna-emerald' : 'bg-muted'}`}>{handler.status}</span>
                    {handler.version && <span>v{handler.version}</span>}
                    {handler.total_runs > 0 && <><span>·</span><span>{handler.total_runs} runs</span></>}
                    {handler.success_rate > 0 && <><span>·</span><span>{handler.success_rate}% success</span></>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${health.bg} ${health.color}`}>{handler.health_status}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50">
                  {handler.description && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{handler.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                    {handler.average_runtime_ms > 0 && (
                      <div><span className="text-muted-foreground text-xs">Avg Runtime:</span> <span className="font-medium">{handler.average_runtime_ms}ms</span></div>
                    )}
                    {handler.failed_runs > 0 && (
                      <div><span className="text-muted-foreground text-xs">Failed Runs:</span> <span className="font-medium text-destructive">{handler.failed_runs}</span></div>
                    )}
                    {handler.rate_limit_events > 0 && (
                      <div><span className="text-muted-foreground text-xs">Rate Limits:</span> <span className="font-medium text-accent">{handler.rate_limit_events}</span></div>
                    )}
                    {handler.timeout_events > 0 && (
                      <div><span className="text-muted-foreground text-xs">Timeouts:</span> <span className="font-medium text-accent">{handler.timeout_events}</span></div>
                    )}
                  </div>

                  {providers.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-muted-foreground">Supported Providers:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {providers.map((p, i) => <span key={i} className="px-2 py-0.5 rounded text-xs bg-secondary/40">{p}</span>)}
                      </div>
                    </div>
                  )}

                  {formats.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Supported Formats:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formats.map((f, i) => <span key={i} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">{f}</span>)}
                      </div>
                    </div>
                  )}

                  {parsers.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Compatible Parsers:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parsers.map((p, i) => <span key={i} className="px-2 py-0.5 rounded text-xs bg-accent/10 text-accent">{p}</span>)}
                      </div>
                    </div>
                  )}

                  {handler.last_tested_at && (
                    <p className="text-xs text-muted-foreground mt-2">Last tested: {new Date(handler.last_tested_at).toLocaleString()}</p>
                  )}

                  {handler.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{handler.admin_notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <div className="flex items-center gap-1 mr-2">
                      <select
                        value={testSourceId}
                        onChange={e => setTestSourceId(e.target.value)}
                        className="glass-panel px-2 py-1.5 text-xs rounded-lg"
                      >
                        <option value="">No source (default URL)</option>
                        {(sources || []).map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
                      </select>
                      <Button size="sm" onClick={() => handleTest(handler)} disabled={isTesting}>
                        {isTesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                        Test
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(handler)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(handler)} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="glass-panel p-8 text-center">
            <Server className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No handlers found. Create one or adjust your filters.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Handler' : 'New Handler'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Handler Name *</label>
              <input
                value={form.handler_name}
                onChange={e => setForm(f => ({ ...f, handler_name: e.target.value }))}
                className="w-full glass-panel px-3 py-2 text-sm mt-1"
                placeholder="e.g. Al Quran Cloud Handler"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Handler Type</label>
                <select
                  value={form.handler_type}
                  onChange={e => setForm(f => ({ ...f, handler_type: e.target.value }))}
                  className="w-full glass-panel px-3 py-2 text-sm mt-1"
                >
                  {HANDLER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full glass-panel px-3 py-2 text-sm mt-1"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full glass-panel px-3 py-2 text-sm mt-1"
                rows={2}
                placeholder="What this handler does and how it retrieves data"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Supported Providers (comma-separated)</label>
              <input
                value={form.supported_providers}
                onChange={e => setForm(f => ({ ...f, supported_providers: e.target.value }))}
                className="w-full glass-panel px-3 py-2 text-sm mt-1"
                placeholder="e.g. Al Quran Cloud, API.Bible"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Supported Formats (comma-separated)</label>
              <input
                value={form.supported_formats}
                onChange={e => setForm(f => ({ ...f, supported_formats: e.target.value }))}
                className="w-full glass-panel px-3 py-2 text-sm mt-1"
                placeholder="e.g. JSON, XML, CSV"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Compatible Parsers (comma-separated)</label>
              <input
                value={form.compatible_parsers}
                onChange={e => setForm(f => ({ ...f, compatible_parsers: e.target.value }))}
                className="w-full glass-panel px-3 py-2 text-sm mt-1"
                placeholder="e.g. Bible Parser, Quran Parser"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Timeout Rules (JSON)</label>
                <input
                  value={form.timeout_rules}
                  onChange={e => setForm(f => ({ ...f, timeout_rules: e.target.value }))}
                  className="w-full glass-panel px-3 py-2 text-sm mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Retry Rules (JSON)</label>
                <input
                  value={form.retry_rules}
                  onChange={e => setForm(f => ({ ...f, retry_rules: e.target.value }))}
                  className="w-full glass-panel px-3 py-2 text-sm mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rate Limit (JSON)</label>
                <input
                  value={form.rate_limit_rules}
                  onChange={e => setForm(f => ({ ...f, rate_limit_rules: e.target.value }))}
                  className="w-full glass-panel px-3 py-2 text-sm mt-1 font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Admin Notes</label>
              <textarea
                value={form.admin_notes}
                onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
                className="w-full glass-panel px-3 py-2 text-sm mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.handler_name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Handler'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Result Modal */}
      <Dialog open={!!testResult} onOpenChange={(open) => !open && setTestResult(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Handler Test: {testResult?.handler?.handler_name}
            </DialogTitle>
          </DialogHeader>
          {testResult?.error ? (
            <div className="p-4 rounded-lg bg-destructive/10 text-sm text-destructive">{testResult.error}</div>
          ) : testResult?.package ? (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult.package.retrievalStatus === 'success'
                  ? 'bg-berna-emerald/10 text-berna-emerald'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {testResult.package.retrievalStatus === 'success'
                  ? <CheckCircle className="w-5 h-5" />
                  : <XCircle className="w-5 h-5" />}
                <span className="font-medium capitalize">{testResult.package.retrievalStatus}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Source URL" value={testResult.package.sourceUrl} />
                <Field label="Detected Format" value={testResult.package.detectedFormat} />
                <Field label="Detected Language" value={testResult.package.detectedLanguage || 'N/A'} />
                <Field label="Suggested Parser" value={testResult.package.suggestedParser || 'N/A'} />
                <Field label="Checksum" value={testResult.package.checksum || 'N/A'} />
                <Field label="Response Time" value={`${testResult.package.metadata?.response_time_ms || 0}ms`} />
              </div>

              {testResult.package.errors?.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10">
                  <p className="text-xs font-medium text-destructive mb-1">Errors:</p>
                  {testResult.package.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive">• [{e.type}] {e.message}</p>
                  ))}
                </div>
              )}

              {testResult.package.warnings?.length > 0 && (
                <div className="p-3 rounded-lg bg-accent/10">
                  <p className="text-xs font-medium text-accent mb-1">Warnings:</p>
                  {testResult.package.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-accent">• [{w.type}] {w.message}</p>
                  ))}
                </div>
              )}

              {testResult.package.rawData && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Raw Data Sample:</p>
                  <pre className="p-3 rounded-lg bg-secondary/30 text-xs font-mono overflow-x-auto max-h-32">{testResult.package.rawData}</pre>
                </div>
              )}

              {testResult.stats && (
                <div className="p-3 rounded-lg bg-secondary/20 text-xs">
                  <p className="font-medium mb-1">Updated Handler Stats:</p>
                  <div className="flex gap-4 text-muted-foreground">
                    <span>Total: {testResult.stats.total_runs}</span>
                    <span>Success: {testResult.stats.success_rate}%</span>
                    <span>Health: {testResult.stats.health_status}</span>
                    <span>Avg: {testResult.stats.average_runtime_ms}ms</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-all">{value}</p>
    </div>
  );
}