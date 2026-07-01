import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Compass, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MISSION_STATUSES } from '@/lib/caeConstants';

export default function CAEMissions({ config }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadMissions(); }, []);

  const loadMissions = async () => {
    try {
      const data = await base44.entities.CAEMission.list('-created_date', 50);
      setMissions(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreate = async (formData) => {
    try {
      await base44.entities.CAEMission.create({
        ...formData,
        status: 'active',
        started_at: new Date().toISOString(),
        resources_acquired: 0,
        resources_remaining: formData.resources_target || 0
      });
      setShowForm(false);
      loadMissions();
    } catch (err) { console.error(err); }
  };

  const handleActivate = async (mission) => {
    await base44.entities.CAEMission.update(mission.id, { status: 'active' });
    if (config) {
      await base44.entities.CAEEngineConfig.update(config.id, {
        operating_mode: 'expedition',
        current_mission_id: mission.id,
        current_mission_name: mission.name
      });
    }
    loadMissions();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-heading font-semibold">Acquisition Missions</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> New Mission</Button>
      </div>

      {showForm && <MissionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {missions.map(mission => {
          const status = MISSION_STATUSES.find(s => s.value === mission.status) || MISSION_STATUSES[0];
          const pct = mission.resources_target > 0 ? Math.min(100, Math.round((mission.resources_acquired / mission.resources_target) * 100)) : 0;
          const isActive = config?.current_mission_id === mission.id;

          return (
            <div key={mission.id} className={`glass-panel p-4 ${isActive ? 'border-primary/40' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" />
                    {mission.name}
                    {isActive && <span className="text-xs text-primary">● Active</span>}
                  </h3>
                  {mission.description && <p className="text-xs text-muted-foreground mt-1">{mission.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${status.color}/20 text-${status.color} capitalize`}>{status.label}</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div><p className="text-muted-foreground">Target</p><p className="font-bold">{mission.resources_target || 0}</p></div>
                <div><p className="text-muted-foreground">Acquired</p><p className="font-bold text-berna-emerald">{mission.resources_acquired || 0}</p></div>
                <div><p className="text-muted-foreground">Remaining</p><p className="font-bold">{mission.resources_remaining || 0}</p></div>
                <div><p className="text-muted-foreground">Priority</p><p className="font-bold capitalize">{mission.priority}</p></div>
              </div>

              {mission.resources_target > 0 && (
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}

              {mission.status === 'active' && !isActive && (
                <Button size="sm" variant="outline" onClick={() => handleActivate(mission)}>
                  <Target className="w-3 h-3 mr-1" /> Set as Active Mission
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {missions.length === 0 && (
        <div className="glass-panel p-8 text-center text-muted-foreground">
          <Compass className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No acquisition missions yet. Create one to guide the CAE's acquisition strategy.</p>
        </div>
      )}
    </div>
  );
}

function MissionForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState(10);
  const [priority, setPriority] = useState('medium');
  const [traditions, setTraditions] = useState('');
  const [collections, setCollections] = useState('');

  return (
    <div className="glass-panel p-4 space-y-3">
      <input className="w-full bg-transparent border border-input rounded-md px-3 py-2 text-sm" placeholder="Mission name (e.g. Expand Buddhist Canon)" value={name} onChange={e => setName(e.target.value)} />
      <textarea className="w-full bg-transparent border border-input rounded-md px-3 py-2 text-sm" placeholder="Mission description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
      <div className="grid grid-cols-3 gap-2">
        <input type="number" className="bg-transparent border border-input rounded-md px-3 py-2 text-sm" placeholder="Target" value={target} onChange={e => setTarget(parseInt(e.target.value) || 0)} />
        <select className="bg-transparent border border-input rounded-md px-3 py-2 text-sm" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>
      <input className="w-full bg-transparent border border-input rounded-md px-3 py-2 text-sm" placeholder="Target traditions (comma-separated)" value={traditions} onChange={e => setTraditions(e.target.value)} />
      <input className="w-full bg-transparent border border-input rounded-md px-3 py-2 text-sm" placeholder="Target collections (comma-separated)" value={collections} onChange={e => setCollections(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSubmit({ name, description, resources_target: target, priority, target_traditions: JSON.stringify(traditions.split(',').map(s => s.trim()).filter(Boolean)), target_collections: JSON.stringify(collections.split(',').map(s => s.trim()).filter(Boolean)) })}>Create Mission</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}