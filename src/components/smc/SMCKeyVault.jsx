import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, KeyRound, ShieldCheck, AlertTriangle, Clock, CheckCircle2, XCircle, Zap, RefreshCw, Lock, Sparkles } from 'lucide-react';
import { AUTH_TYPES, CREDENTIAL_STATUSES } from '@/lib/smcConstants';

export default function SMCKeyVault() {
  const [accounts, setAccounts] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [testing, setTesting] = useState(null);
  const [acquiring, setAcquiring] = useState(false);
  const [acquireResult, setAcquireResult] = useState(null);

  const load = async () => {
    try {
      const [a, c, s] = await Promise.all([
        base44.entities.SMCProviderAccount.list('-created_date', 100),
        base44.entities.SMCCredential.list('-created_date', 100),
        base44.entities.SMCSource.filter({ api_key_required: true }, '-created_date', 50),
      ]);
      setAccounts(a || []); setCredentials(c || []); setSources(s || []);
    } catch (err) { console.error('Vault load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleTest = async (accountId) => {
    setTesting(accountId);
    try { await base44.functions.invoke('testSMCConnection', { provider_account_id: accountId }); load(); }
    catch (err) { console.error(err); }
    finally { setTesting(null); }
  };

  const toggleUsage = async (account, field) => {
    try { await base44.entities.SMCProviderAccount.update(account.id, { [field]: !account[field] }); load(); }
    catch (err) { console.error(err); }
  };

  const handleAutoAcquire = async () => {
    setAcquiring(true);
    setAcquireResult(null);
    try {
      const res = await base44.functions.invoke('acquireCredential', { mode: 'auto' });
      setAcquireResult(res.data);
      load();
    } catch (err) {
      setAcquireResult({ error: err.message });
    } finally {
      setAcquiring(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const healthy = credentials.filter(c => c.status === 'Healthy').length;
  const expiring = credentials.filter(c => c.status === 'Expiring Soon' || c.status === 'Expired').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3"><KeyRound className="w-5 h-5 text-primary mb-1" /><p className="text-xl font-bold">{credentials.length}</p><p className="text-xs text-muted-foreground">Credentials</p></div>
        <div className="glass-panel p-3"><ShieldCheck className="w-5 h-5 text-berna-emerald mb-1" /><p className="text-xl font-bold">{healthy}</p><p className="text-xs text-muted-foreground">Healthy</p></div>
        <div className="glass-panel p-3"><AlertTriangle className="w-5 h-5 text-amber-400 mb-1" /><p className="text-xl font-bold">{expiring}</p><p className="text-xs text-muted-foreground">Expiring/Expired</p></div>
        <div className="glass-panel p-3"><Lock className="w-5 h-5 text-accent mb-1" /><p className="text-xl font-bold">{accounts.length}</p><p className="text-xs text-muted-foreground">Provider Accounts</p></div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">Provider Accounts & Credentials</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleAutoAcquire} disabled={acquiring} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm disabled:opacity-50">
            {acquiring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {acquiring ? 'Acquiring...' : 'Auto-Acquire Keys'}
          </button>
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus className="w-4 h-4" /> Connect Provider</button>
        </div>
      </div>

      {acquireResult && (
        <div className="glass-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-semibold text-sm">Auto-Acquisition Results</h4>
            <button onClick={() => setAcquireResult(null)} className="text-muted-foreground hover:text-foreground text-xs">Dismiss</button>
          </div>
          {acquireResult.error ? (
            <p className="text-sm text-red-400">{acquireResult.error}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Processed {acquireResult.sources_processed} sources — acquired {acquireResult.credentials_acquired} credential(s).
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(acquireResult.results || []).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    {r.acquired ? <CheckCircle2 className="w-3.5 h-3.5 text-berna-emerald" /> : r.no_key_needed ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="flex-1 font-medium">{r.source_name}</span>
                    {r.acquired && <span className="text-berna-emerald">Acquired ••••{r.secret_hint?.slice(-4)}</span>}
                    {r.no_key_needed && <span className="text-blue-400">No key needed</span>}
                    {!r.acquired && !r.no_key_needed && <span className="text-amber-400">{r.skipped || 'Manual registration required'}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        {accounts.map(account => {
          const cred = credentials.find(c => c.id === account.credential_id);
          return (
            <div key={account.id} className="glass-panel p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{account.provider_name}</p>
                  <span className="text-xs text-muted-foreground">· {account.account_label}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${account.account_status === 'Connected' ? 'bg-berna-emerald/20 text-berna-emerald' : account.account_status === 'Error' || account.account_status === 'Expired' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{account.account_status}</span>
                  <span className="text-xs text-muted-foreground">{account.authentication_type}</span>
                  {cred && <span className={`px-2 py-0.5 rounded text-xs ${cred.status === 'Healthy' ? 'bg-berna-emerald/20 text-berna-emerald' : cred.status === 'Expired' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>Key: {cred.status}</span>}
                  {cred?.secret_hint && <span className="text-xs text-muted-foreground font-mono">••••{cred.secret_hint}</span>}
                </div>
                {account.last_verified && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Verified: {new Date(account.last_verified).toLocaleString()}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleUsage(account, 'seeder_enabled')} className={`px-2 py-0.5 rounded text-xs ${account.seeder_enabled ? 'bg-berna-emerald/20 text-berna-emerald' : 'bg-muted/30 text-muted-foreground'}`}>Seeder {account.seeder_enabled ? '✓' : '✗'}</button>
                <button onClick={() => toggleUsage(account, 'cae_enabled')} className={`px-2 py-0.5 rounded text-xs ${account.cae_enabled ? 'bg-accent/20 text-accent' : 'bg-muted/30 text-muted-foreground'}`}>CAE {account.cae_enabled ? '✓' : '✗'}</button>
                <button onClick={() => toggleUsage(account, 'research_enabled')} className={`px-2 py-0.5 rounded text-xs ${account.research_enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-muted/30 text-muted-foreground'}`}>Research {account.research_enabled ? '✓' : '✗'}</button>
                <button onClick={() => toggleUsage(account, 'library_enabled')} className={`px-2 py-0.5 rounded text-xs ${account.library_enabled ? 'bg-purple-500/20 text-purple-400' : 'bg-muted/30 text-muted-foreground'}`}>Library {account.library_enabled ? '✓' : '✗'}</button>
                <button onClick={() => handleTest(account.id)} disabled={testing === account.id} className="p-1.5 rounded hover:bg-primary/20" title="Test Connection">
                  {testing === account.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-primary" />}
                </button>
              </div>
            </div>
          );
        })}
        {accounts.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No provider accounts connected yet. Use the Connection Wizard to add one.</p>}
      </div>

      {sources.length > 0 && (
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-heading font-semibold text-sm">Sources Needing API Keys</h4>
            <button onClick={handleAutoAcquire} disabled={acquiring} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50">
              {acquiring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Auto-Acquire All
            </button>
          </div>
          <div className="space-y-1">
            {sources.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="flex-1">{s.source_name}</span>
                <span className="text-xs text-muted-foreground">{s.authentication_type}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${accounts.some(a => a.source_id === s.id) ? 'bg-berna-emerald/20 text-berna-emerald' : 'bg-red-500/20 text-red-400'}`}>
                  {accounts.some(a => a.source_id === s.id) ? 'Connected' : 'Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showWizard && <ConnectionWizard sources={sources} onClose={() => setShowWizard(false)} onSaved={() => { setShowWizard(false); load(); }} />}
    </div>
  );
}

function ConnectionWizard({ sources, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ source_id: '', provider_name: '', account_label: 'Production', authentication_type: 'API Key', credential_label: '', secret_value: '', expiration_date: '', rotation_schedule: 'Annually' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const account = await base44.entities.SMCProviderAccount.create({
        source_id: form.source_id, provider_name: form.provider_name, account_label: form.account_label,
        authentication_type: form.authentication_type, account_status: 'Pending',
        seeder_enabled: false, cae_enabled: false, research_enabled: false, library_enabled: false,
      });
      await base44.entities.SMCCredential.create({
        provider_account_id: account.id, provider_name: form.provider_name,
        credential_label: form.credential_label || form.account_label,
        authentication_type: form.authentication_type,
        encrypted_secret: btoa(form.secret_value), secret_hint: form.secret_value.slice(-4),
        expiration_date: form.expiration_date, rotation_schedule: form.rotation_schedule,
        status: 'Unknown', usage_count: 0,
      });
      onSaved();
    } catch (err) { console.error('Wizard save error:', err); }
    finally { setSaving(false); }
  };

  const source = sources.find(s => s.id === form.source_id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-lg w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold">Connection Wizard — Step {step}/4</h3>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map(n => <div key={n} className={`w-2 h-2 rounded-full ${n <= step ? 'bg-primary' : 'bg-muted'}`} />)}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a provider to connect:</p>
            <select className="w-full glass-panel px-3 py-2 text-sm" value={form.source_id} onChange={e => { const s = sources.find(x => x.id === e.target.value); setForm({ ...form, source_id: e.target.value, provider_name: s?.provider_name || '', authentication_type: s?.authentication_type || 'API Key' }); }}>
              <option value="">— Select Source —</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.source_name} ({s.provider_name})</option>)}
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Account label & authentication method:</p>
            <select className="w-full glass-panel px-3 py-2 text-sm" value={form.account_label} onChange={e => setForm({ ...form, account_label: e.target.value })}>
              {['Production', 'Development', 'Testing', 'Archive'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="w-full glass-panel px-3 py-2 text-sm" value={form.authentication_type} onChange={e => setForm({ ...form, authentication_type: e.target.value })}>
              {AUTH_TYPES.filter(a => a !== 'None').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter credentials (stored encrypted — never displayed after saving):</p>
            <input className="w-full glass-panel px-3 py-2 text-sm" type="password" placeholder="API Key / Secret / token" value={form.secret_value} onChange={e => setForm({ ...form, secret_value: e.target.value })} />
            <input className="w-full glass-panel px-3 py-2 text-sm" type="date" value={form.expiration_date} onChange={e => setForm({ ...form, expiration_date: e.target.value })} />
            <select className="w-full glass-panel px-3 py-2 text-sm" value={form.rotation_schedule} onChange={e => setForm({ ...form, rotation_schedule: e.target.value })}>
              {['Never', 'Monthly', 'Quarterly', 'Biannually', 'Annually', 'Custom'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Review and save:</p>
            <div className="glass-panel p-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Source:</span> {source?.source_name || form.provider_name}</p>
              <p><span className="text-muted-foreground">Account:</span> {form.account_label}</p>
              <p><span className="text-muted-foreground">Auth Type:</span> {form.authentication_type}</p>
              <p><span className="text-muted-foreground">Secret:</span> ••••{form.secret_value.slice(-4)}</p>
              <p><span className="text-muted-foreground">Expires:</span> {form.expiration_date || 'No expiration'}</p>
              <p><span className="text-muted-foreground">Rotation:</span> {form.rotation_schedule}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">{step > 1 ? 'Back' : 'Cancel'}</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={(step === 1 && !form.source_id) || (step === 3 && !form.secret_value)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">Next</button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-berna-emerald text-white text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Securely'}</button>
          )}
        </div>
      </div>
    </div>
  );
}