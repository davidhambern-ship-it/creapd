import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLLECTION_GOAL_TEMPLATES } from '@/lib/caeConstants';

export default function CAECollectionGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    try {
      const data = await base44.entities.CAECollectionGoal.list('-created_date', 50);
      setGoals(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreate = async (name, target) => {
    try {
      await base44.entities.CAECollectionGoal.create({ name, target_count: target, resources_acquired: 0, resources_remaining: target, completion_percentage: 0, status: 'active' });
      setShowForm(false);
      loadGoals();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-heading font-semibold">Collection Goals</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> New Goal</Button>
      </div>

      {showForm && <GoalForm onCreate={handleCreate} onCancel={() => setShowForm(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {goals.map(goal => {
          const pct = goal.completion_percentage || 0;
          const strengthColor = goal.collection_strength === 'comprehensive' ? 'berna-emerald' : goal.collection_strength === 'strong' ? 'primary' : goal.collection_strength === 'developing' ? 'accent' : 'muted-foreground';
          return (
            <div key={goal.id} className="glass-panel p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary shrink-0" /> {goal.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 capitalize">{goal.status}</span>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{goal.resources_acquired || 0} / {goal.target_count || 0} resources</span>
                  <span className="font-bold">{pct}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-muted-foreground">Known</p><p className="font-medium">{goal.known_resources || 0}</p></div>
                <div><p className="text-muted-foreground">PD Opps</p><p className="font-medium text-berna-emerald">{goal.public_domain_opportunities || 0}</p></div>
                <div><p className="text-muted-foreground">Pending Lic.</p><p className="font-medium text-accent">{goal.pending_licenses || 0}</p></div>
                <div><p className="text-muted-foreground">Strength</p><p className={`font-medium text-${strengthColor} capitalize`}>{goal.collection_strength}</p></div>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="glass-panel p-8 text-center text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No collection goals yet. Create goals to track long-term library development.</p>
        </div>
      )}
    </div>
  );
}

function GoalForm({ onCreate, onCancel }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState(50);

  return (
    <div className="glass-panel p-4 space-y-3">
      <select className="w-full bg-transparent border border-input rounded-md px-3 py-2 text-sm" value={name} onChange={e => setName(e.target.value)}>
        <option value="">Select a collection goal template...</option>
        {COLLECTION_GOAL_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
        <option value="custom">Custom Goal</option>
      </select>
      {name === 'custom' && <input className="w-full bg-transparent border border-input rounded-md px-3 py-2 text-sm" placeholder="Custom goal name" onChange={e => setName(e.target.value)} />}
      <input type="number" className="bg-transparent border border-input rounded-md px-3 py-2 text-sm" placeholder="Target resource count" value={target} onChange={e => setTarget(parseInt(e.target.value) || 0)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => name && onCreate(name, target)}>Create Goal</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}