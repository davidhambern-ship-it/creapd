import React, { useState } from 'react';
import { useCosmoProduction } from '@/hooks/useCosmoProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Users, Plus, Trash2 } from 'lucide-react';

export default function CosmoGuests() {
  const { config, guests, loading, refresh } = useCosmoProduction();
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ guest_name: '', title_role: '', bio: '', talking_points: '', photo_prompt: '' });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newItem.guest_name.trim()) return;
    await base44.entities.CosmoGuest.create({ configuration_id: config.id, ...newItem, status: 'pending' });
    setNewItem({ guest_name: '', title_role: '', bio: '', talking_points: '', photo_prompt: '' });
    setAdding(false);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.CosmoGuest.delete(id);
    refresh();
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'confirmed' ? 'pending' : 'confirmed';
    await base44.entities.CosmoGuest.update(item.id, { status: newStatus });
    refresh();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Guests</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage guest experts, dermatologists, makeup artists, and wellness coaches</p>
        </div>
        <Button onClick={() => setAdding(!adding)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> {adding ? 'Cancel' : 'Add Guest'}
        </Button>
      </div>

      {adding && (
        <div className="glass-panel p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Guest Name *</Label>
              <Input value={newItem.guest_name} onChange={e => setNewItem({ ...newItem, guest_name: e.target.value })} placeholder="Dr. Sarah Lee" />
            </div>
            <div className="space-y-2">
              <Label>Role / Title</Label>
              <Input value={newItem.title_role} onChange={e => setNewItem({ ...newItem, title_role: e.target.value })} placeholder="Dermatologist" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Biography</Label>
            <Textarea value={newItem.bio} onChange={e => setNewItem({ ...newItem, bio: e.target.value })} placeholder="Brief bio..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Talking Points</Label>
            <Textarea value={newItem.talking_points} onChange={e => setNewItem({ ...newItem, talking_points: e.target.value })} placeholder="Suggested talking points..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Photo Prompt</Label>
            <Input value={newItem.photo_prompt} onChange={e => setNewItem({ ...newItem, photo_prompt: e.target.value })} placeholder="AI image prompt for portrait..." />
          </div>
          <Button onClick={handleAdd} disabled={!newItem.guest_name.trim()}>Save Guest</Button>
        </div>
      )}

      {guests.length === 0 && !adding ? (
        <div className="glass-panel p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No guests added yet. Click "Add Guest" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guests.map(item => (
            <div key={item.id} className="glass-panel p-4 space-y-2">
              <div className="!flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{item.guest_name}</h3>
                  {item.title_role && <span className="text-xs text-muted-foreground">{item.title_role}</span>}
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              {item.bio && <p className="text-sm text-muted-foreground">{item.bio}</p>}
              {item.talking_points && <p className="text-xs text-muted-foreground"><span className="font-semibold">Talking Points:</span> {item.talking_points}</p>}
              {item.photo_prompt && <p className="text-xs text-muted-foreground"><span className="font-semibold">Photo Prompt:</span> {item.photo_prompt}</p>}
              <button onClick={() => toggleStatus(item)} className={`text-xs px-2 py-0.5 rounded-md transition-colors ${item.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {item.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}