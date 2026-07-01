import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, X } from 'lucide-react';
import {
  REGISTRY_ACCESS_STATUS, REGISTRY_LICENSE_STATUS, REGISTRY_IMPORT_STATUS,
  REGISTRY_PRIORITY, REGISTRY_VERIFICATION_STATUS, REGISTRY_COPYRIGHT_STATUS,
  REGISTRY_LICENSE_REQUEST_STATUS, REGISTRY_COLLECTIONS, REGISTRY_SOURCE_TYPES
} from '@/lib/registryConstants';

const toOpts = (obj) => Object.entries(obj).map(([value, d]) => ({ value, label: d.label }));
const CONFIDENCE_OPTS = [
  { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }, { value: 'unknown', label: 'Unknown' }
];

const BOOL_FIELDS = [
  { key: 'api_available', label: 'API Available' },
  { key: 'full_text_available', label: 'Full Text Available' },
  { key: 'search_indexed', label: 'Search Indexed' },
  { key: 'study_workspace_enabled', label: 'Study Workspace Enabled' },
  { key: 'language_learning_enabled', label: 'Language Learning Enabled' },
  { key: 'comparison_enabled', label: 'Comparison Enabled' }
];

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm">
        <option value="">— Select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export default function RegistryRecordForm({ initialData, onSave, onCancel }) {
  const [data, setData] = useState(initialData || {});
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setData(d => ({ ...d, [field]: value }));

  const handleSubmit = async () => {
    if (!data.title || !data.tradition || !data.collection) return;
    setSaving(true);
    try { await onSave(data); } finally { setSaving(false); }
  };

  const inputCls = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title *"><Input value={data.title || ''} onChange={e => update('title', e.target.value)} placeholder="e.g. Gospel of John" className={inputCls} /></Field>
          <Field label="Alternate Titles"><Input value={data.alternate_titles || ''} onChange={e => update('alternate_titles', e.target.value)} placeholder="Comma-separated" className={inputCls} /></Field>
          <Field label="Tradition *"><Input value={data.tradition || ''} onChange={e => update('tradition', e.target.value)} placeholder="e.g. Christianity" className={inputCls} /></Field>
          <Field label="Category"><Input value={data.category || ''} onChange={e => update('category', e.target.value)} placeholder="e.g. Canonical" className={inputCls} /></Field>
          <SelectField label="Collection *" value={data.collection} onChange={v => update('collection', v)} options={toOpts(REGISTRY_COLLECTIONS)} />
          <SelectField label="Source Type" value={data.source_type} onChange={v => update('source_type', v)} options={toOpts(REGISTRY_SOURCE_TYPES)} />
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Language & Authorship</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Original Language"><Input value={data.original_language || ''} onChange={e => update('original_language', e.target.value)} className={inputCls} /></Field>
          <Field label="Writing System"><Input value={data.writing_system || ''} onChange={e => update('writing_system', e.target.value)} className={inputCls} /></Field>
          <Field label="Author"><Input value={data.author || ''} onChange={e => update('author', e.target.value)} className={inputCls} /></Field>
          <Field label="Traditional Attribution"><Input value={data.traditional_attribution || ''} onChange={e => update('traditional_attribution', e.target.value)} className={inputCls} /></Field>
          <Field label="Historical Date"><Input value={data.historical_date || ''} onChange={e => update('historical_date', e.target.value)} className={inputCls} /></Field>
          <Field label="Scholarly Date Range"><Input value={data.scholarly_date_range || ''} onChange={e => update('scholarly_date_range', e.target.value)} className={inputCls} /></Field>
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Description & Themes</h3>
        <Field label="Description"><Textarea value={data.description || ''} onChange={e => update('description', e.target.value)} rows={3} className={inputCls} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Themes (comma-separated)"><Input value={data.themes || ''} onChange={e => update('themes', e.target.value)} className={inputCls} /></Field>
          <Field label="Region"><Input value={data.region || ''} onChange={e => update('region', e.target.value)} className={inputCls} /></Field>
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Access & Licensing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Access Status" value={data.access_status} onChange={v => update('access_status', v)} options={toOpts(REGISTRY_ACCESS_STATUS)} />
          <SelectField label="License Status" value={data.license_status} onChange={v => update('license_status', v)} options={toOpts(REGISTRY_LICENSE_STATUS)} />
          <SelectField label="Copyright Status" value={data.copyright_status} onChange={v => update('copyright_status', v)} options={toOpts(REGISTRY_COPYRIGHT_STATUS)} />
          <SelectField label="License Request Status" value={data.license_request_status} onChange={v => update('license_request_status', v)} options={toOpts(REGISTRY_LICENSE_REQUEST_STATUS)} />
          <Field label="Source Provider"><Input value={data.source_provider || ''} onChange={e => update('source_provider', e.target.value)} className={inputCls} /></Field>
          <Field label="Source URL"><Input value={data.source_url || ''} onChange={e => update('source_url', e.target.value)} className={inputCls} /></Field>
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Import & Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Import Status" value={data.import_status} onChange={v => update('import_status', v)} options={toOpts(REGISTRY_IMPORT_STATUS)} />
          <SelectField label="Acquisition Priority" value={data.acquisition_priority} onChange={v => update('acquisition_priority', v)} options={toOpts(REGISTRY_PRIORITY)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BOOL_FIELDS.map(f => (
            <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={data[f.key] || false} onChange={e => update(f.key, e.target.checked)} className="rounded border-border" />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Verification & Admin</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Verification Status" value={data.verification_status} onChange={v => update('verification_status', v)} options={toOpts(REGISTRY_VERIFICATION_STATUS)} />
          <SelectField label="Confidence Level" value={data.confidence_level} onChange={v => update('confidence_level', v)} options={CONFIDENCE_OPTS} />
        </div>
        <Field label="Admin Notes"><Textarea value={data.admin_notes || ''} onChange={e => update('admin_notes', e.target.value)} rows={3} className={inputCls} /></Field>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" /> Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving || !data.title || !data.tradition || !data.collection}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Record
        </Button>
      </div>
    </div>
  );
}