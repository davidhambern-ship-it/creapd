import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Scale, Plus, DollarSign, AlertTriangle, CheckCircle2, Clock, TrendingUp, Gift } from 'lucide-react';
import { RIGHTS_CLASSIFICATIONS, OPPORTUNITY_TYPES } from '@/lib/smcConstants';

export default function SMCLicensing() {
  const [licenses, setLicenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLicense, setShowAddLicense] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);

  const load = async () => {
    try {
      const [l, b] = await Promise.all([
        base44.entities.SMCLicenseRecord.list('-created_date', 100),
        base44.entities.SMCBudgetAccount.list('-created_date', 50),
      ]);
      setLicenses(l || []); setBudgets(b || []);
    } catch (err) { console.error('Licensing load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const free = licenses.filter(l => ['Public Domain', 'Creative Commons', 'Open Access', 'Free Redistribution'].includes(l.rights_classification));
  const paid = licenses.filter(l => l.purchase_required);
  const renewals = licenses.filter(l => l.renewal_required && l.renewal_date);
  const opportunities = licenses.filter(l => l.opportunity_type);

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent_amount, 0);
  const totalReserved = budgets.reduce((sum, b) => sum + b.reserved_amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3"><Scale className="w-5 h-5 text-primary mb-1" /><p className="text-xl font-bold">{licenses.length}</p><p className="text-xs text-muted-foreground">License Records</p></div>
        <div className="glass-panel p-3"><CheckCircle2 className="w-5 h-5 text-berna-emerald mb-1" /><p className="text-xl font-bold">{free.length}</p><p className="text-xs text-muted-foreground">Free/Open</p></div>
        <div className="glass-panel p-3"><DollarSign className="w-5 h-5 text-amber-400 mb-1" /><p className="text-xl font-bold">{paid.length}</p><p className="text-xs text-muted-foreground">Paid Required</p></div>
        <div className="glass-panel p-3"><Clock className="w-5 h-5 text-orange-400 mb-1" /><p className="text-xl font-bold">{renewals.length}</p><p className="text-xs text-muted-foreground">Upcoming Renewals</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm">Budget Accounts</h3>
            <button onClick={() => setShowAddBudget(true)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 text-primary text-xs"><Plus className="w-3 h-3" /> Add</button>
          </div>
          <div className="space-y-2">
            {budgets.map(b => {
              const remaining = b.total_budget - b.spent_amount - b.reserved_amount;
              const usedPercent = b.total_budget > 0 ? Math.round((b.spent_amount / b.total_budget) * 100) : 0;
              return (
                <div key={b.id} className="p-3 rounded-md bg-secondary/20">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{b.account_name}</p>
                    <span className="text-xs text-muted-foreground">{b.budget_period}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>${b.spent_amount} / ${b.total_budget}</span>
                    <span className={remaining < 0 ? 'text-red-400' : 'text-berna-emerald'}>${remaining} remaining</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/30 overflow-hidden">
                    <div className={`h-full rounded-full ${usedPercent > 80 ? 'bg-red-400' : usedPercent > 50 ? 'bg-amber-400' : 'bg-berna-emerald'}`} style={{ width: `${usedPercent}%` }} />
                  </div>
                  {b.savings_goals && <p className="text-xs text-primary mt-1">💰 Savings goals configured</p>}
                </div>
              );
            })}
            {budgets.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No budget accounts yet.</p>}
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">Rights Classification</h3>
          <div className="space-y-1.5">
            {RIGHTS_CLASSIFICATIONS.map(r => {
              const count = licenses.filter(l => l.rights_classification === r).length;
              return (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-xs flex-1">{r}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${licenses.length > 0 ? (count / licenses.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {opportunities.length > 0 && (
        <div className="glass-panel p-4 border border-berna-emerald/30">
          <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2"><Gift className="w-4 h-4 text-berna-emerald" /> Acquisition Opportunities</h3>
          <div className="space-y-1.5">
            {opportunities.map(o => (
              <div key={o.id} className="flex items-center gap-2 p-2 rounded-md bg-berna-emerald/5">
                <TrendingUp className="w-3.5 h-3.5 text-berna-emerald shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{o.work_title}</p>
                  <p className="text-xs text-muted-foreground">{o.opportunity_type}: {o.opportunity_details}</p>
                </div>
                {o.opportunity_expires && <span className="text-xs text-orange-400">Expires {new Date(o.opportunity_expires).toLocaleDateString()}</span>}
                {o.purchase_price > 0 && <span className="text-xs font-mono">${o.purchase_price}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">License Records</h3>
        <button onClick={() => setShowAddLicense(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus className="w-4 h-4" /> Add License</button>
      </div>

      <div className="space-y-1.5">
        {licenses.map(l => (
          <div key={l.id} className="glass-panel p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{l.work_title}</p>
                {l.purchase_required && <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">${l.purchase_price}</span>}
                {l.renewal_required && <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">Renewal</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{l.rights_classification} · {l.publisher || 'Unknown publisher'} · {l.acquisition_priority} priority</p>
              {l.renewal_date && <p className="text-xs text-orange-400">Renews: {new Date(l.renewal_date).toLocaleDateString()}</p>}
            </div>
            <span className={`px-2 py-0.5 rounded text-xs ${l.acquisition_status === 'Acquired' || l.acquisition_status === 'Purchased' ? 'bg-berna-emerald/20 text-berna-emerald' : l.acquisition_status === 'Not Needed' ? 'bg-muted/30 text-muted-foreground' : 'bg-amber-500/20 text-amber-400'}`}>{l.acquisition_status}</span>
          </div>
        ))}
        {licenses.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No license records yet.</p>}
      </div>

      {showAddLicense && <AddLicenseModal onClose={() => setShowAddLicense(false)} onSaved={() => { setShowAddLicense(false); load(); }} />}
      {showAddBudget && <AddBudgetModal onClose={() => setShowAddBudget(false)} onSaved={() => { setShowAddBudget(false); load(); }} />}
    </div>
  );
}

function AddLicenseModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ work_title: '', rights_classification: 'Unknown', publisher: '', purchase_required: false, purchase_price: 0, renewal_required: false, renewal_date: '', acquisition_priority: 'Medium' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.work_title) return;
    setSaving(true);
    try { await base44.entities.SMCLicenseRecord.create(form); onSaved(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold">Add License Record</h3>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Work Title *" value={form.work_title} onChange={e => setForm({ ...form, work_title: e.target.value })} />
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.rights_classification} onChange={e => setForm({ ...form, rights_classification: e.target.value })}>
          {RIGHTS_CLASSIFICATIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Publisher" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} />
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm flex-1"><input type="checkbox" checked={form.purchase_required} onChange={e => setForm({ ...form, purchase_required: e.target.checked })} /> Purchase Required</label>
          {form.purchase_required && <input type="number" className="w-24 glass-panel px-3 py-2 text-sm" placeholder="Price" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} />}
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm flex-1"><input type="checkbox" checked={form.renewal_required} onChange={e => setForm({ ...form, renewal_required: e.target.checked })} /> Renewal Required</label>
          {form.renewal_required && <input type="date" className="glass-panel px-3 py-2 text-sm" value={form.renewal_date} onChange={e => setForm({ ...form, renewal_date: e.target.value })} />}
        </div>
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.acquisition_priority} onChange={e => setForm({ ...form, acquisition_priority: e.target.value })}>
          {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.work_title} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function AddBudgetModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ account_name: '', budget_category: 'General', budget_period: 'Monthly', total_budget: 100, max_single_purchase: 100, approval_threshold: 50, allow_automatic_purchases: false, carryover_enabled: false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.account_name) return;
    setSaving(true);
    try { await base44.entities.SMCBudgetAccount.create({ ...form, spent_amount: 0, reserved_amount: 0, emergency_reserve: 0, minimum_balance: 0, carryover_amount: 0, is_active: true }); onSaved(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold">Add Budget Account</h3>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Account Name *" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} />
        <div className="flex gap-2">
          <select className="flex-1 glass-panel px-3 py-2 text-sm" value={form.budget_category} onChange={e => setForm({ ...form, budget_category: e.target.value })}>
            {['Books', 'APIs', 'Subscriptions', 'Archives', 'Academic Journals', 'Language Resources', 'Media Assets', 'General'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="flex-1 glass-panel px-3 py-2 text-sm" value={form.budget_period} onChange={e => setForm({ ...form, budget_period: e.target.value })}>
            {['Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Annual', 'Custom'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <input type="number" className="w-full glass-panel px-3 py-2 text-sm" placeholder="Total Budget" value={form.total_budget} onChange={e => setForm({ ...form, total_budget: parseFloat(e.target.value) || 0 })} />
        <div className="flex gap-2">
          <input type="number" className="flex-1 glass-panel px-3 py-2 text-sm" placeholder="Max Single Purchase" value={form.max_single_purchase} onChange={e => setForm({ ...form, max_single_purchase: parseFloat(e.target.value) || 0 })} />
          <input type="number" className="flex-1 glass-panel px-3 py-2 text-sm" placeholder="Approval Threshold" value={form.approval_threshold} onChange={e => setForm({ ...form, approval_threshold: parseFloat(e.target.value) || 0 })} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_automatic_purchases} onChange={e => setForm({ ...form, allow_automatic_purchases: e.target.checked })} /> Allow Automatic Purchases</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.carryover_enabled} onChange={e => setForm({ ...form, carryover_enabled: e.target.checked })} /> Enable Unused Budget Carryover</label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.account_name} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}