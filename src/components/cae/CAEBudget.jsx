import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Wallet, TrendingUp, TrendingDown, Plus, Target, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUDGET_TRANSACTION_LABELS, APPROVAL_STATUS_LABELS } from '@/lib/caeConstants';

export default function CAEBudget({ config, onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [txns, queue] = await Promise.all([
        base44.entities.CAEBudgetTransaction.list('-created_date', 20),
        base44.entities.CAEPurchaseQueueItem.list('-priority_score', 20)
      ]);
      setTransactions(txns);
      setPurchases(queue);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeposit = async (amount) => {
    try {
      const newBalance = (config?.wallet_balance || 0) + amount;
      await base44.entities.CAEBudgetTransaction.create({
        transaction_type: 'manual_deposit',
        amount,
        description: 'Manual wallet deposit',
        balance_after: newBalance,
        status: 'completed'
      });
      await base44.entities.CAEEngineConfig.update(config.id, { wallet_balance: newBalance });
      setShowDeposit(false);
      onUpdate();
      loadData();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const balance = config?.wallet_balance || 0;
  const reserved = config?.reserved_funds || 0;
  const available = balance - reserved;
  let savingsGoals = [];
  try { savingsGoals = JSON.parse(config?.savings_goals || '[]'); } catch {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-berna-emerald" /><span className="text-xs text-muted-foreground">Wallet Balance</span></div>
          <p className="text-2xl font-heading font-bold text-berna-emerald">${balance.toFixed(2)}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowDeposit(!showDeposit)}><Plus className="w-3 h-3 mr-1" /> Deposit</Button>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-accent" /><span className="text-xs text-muted-foreground">Reserved Funds</span></div>
          <p className="text-2xl font-heading font-bold text-accent">${reserved.toFixed(2)}</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Available</span></div>
          <p className="text-2xl font-heading font-bold text-primary">${available.toFixed(2)}</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2"><ShoppingCart className="w-4 h-4 text-chart-4" /><span className="text-xs text-muted-foreground">Purchase Queue</span></div>
          <p className="text-2xl font-heading font-bold">{purchases.filter(p => p.approval_status === 'pending').length}</p>
          <p className="text-xs text-muted-foreground">{purchases.length} total items</p>
        </div>
      </div>

      {showDeposit && <DepositForm onDeposit={handleDeposit} onCancel={() => setShowDeposit(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map(txn => {
              const label = BUDGET_TRANSACTION_LABELS[txn.transaction_type] || BUDGET_TRANSACTION_LABELS.deposit;
              const isPositive = ['deposit', 'manual_deposit', 'refund'].includes(txn.transaction_type);
              return (
                <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div>
                    <p className="text-sm font-medium">{label.label}</p>
                    <p className="text-xs text-muted-foreground">{txn.description || txn.resource_title || '—'}</p>
                  </div>
                  <p className={`text-sm font-bold ${isPositive ? 'text-berna-emerald' : 'text-destructive'}`}>
                    {isPositive ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
                  </p>
                </div>
              );
            })}
            {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No transactions yet.</p>}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-4">Purchase Queue</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {purchases.map(item => {
              const approval = APPROVAL_STATUS_LABELS[item.approval_status] || APPROVAL_STATUS_LABELS.pending;
              return (
                <div key={item.id} className="p-3 rounded-lg bg-secondary/20">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${approval.color}/20 text-${approval.color}`}>{approval.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.publisher || '—'}</span>
                    <span className="font-bold">${item.cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.savings_progress || 0}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.savings_progress || 0}%</span>
                  </div>
                  {item.recommended_action && <p className="text-xs text-accent mt-1">Recommended: {item.recommended_action.replace(/_/g, ' ')}</p>}
                </div>
              );
            })}
            {purchases.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items in purchase queue.</p>}
          </div>
        </div>
      </div>

      {savingsGoals.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-4">Savings Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {savingsGoals.map((goal, i) => {
              const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
              return (
                <div key={i} className="p-3 rounded-lg bg-secondary/20">
                  <p className="text-sm font-medium">{goal.name || goal.target_resource}</p>
                  <p className="text-xs text-muted-foreground">${(goal.current_amount || 0).toFixed(2)} / ${(goal.target_amount || 0).toFixed(2)}</p>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DepositForm({ onDeposit, onCancel }) {
  const [amount, setAmount] = useState(50);
  return (
    <div className="glass-panel p-4 flex items-center gap-3">
      <input type="number" className="bg-transparent border border-input rounded-md px-3 py-2 text-sm w-32" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} />
      <Button size="sm" onClick={() => onDeposit(amount)}>Deposit</Button>
      <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
    </div>
  );
}