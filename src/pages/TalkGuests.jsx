import React, { useState } from 'react';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic2, Users, Plus, Trash2, UserCircle } from 'lucide-react';

export default function TalkGuests() {
  const { config, guests, loading, refresh } = useTalkProduction();
  const [adding, setAdding] = useState(false);
  const [newGuest, setNewGuest] = useState({ guest_name: '', title_role: '', bio: '', talking_points: '' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <Mic2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const handleAddGuest = async () => {
    if (!newGuest.guest_name.trim()) return;
    await base44.entities.TalkGuest.create({
      configuration_id: config.id,
      ...newGuest,
      status: 'pending'
    });
    setNewGuest({ guest_name: '', title_role: '', bio: '', talking_points: '' });
    setAdding(false);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.TalkGuest.delete(id);
    refresh();
  };

  const toggleStatus = async (guest) => {
    const newStatus = guest.status === 'confirmed' ? 'pending' : 'confirmed';
    await base44.entities.TalkGuest.update(guest.id, { status: newStatus });
    refresh();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="!flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Guests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage guests, bios, and talking points</p>
        </div>
        <Button onClick={() => setAdding(!adding)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {adding ? 'Cancel' : 'Add Guest'}
        </Button>
      </div>

      {adding && (
        <div className="glass-panel p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Guest Name *</Label>
              <Input value={newGuest.guest_name} onChange={e => setNewGuest({ ...newGuest, guest_name: e.target.value })} placeholder="Dr. Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Title / Role</Label>
              <Input value={newGuest.title_role} onChange={e => setNewGuest({ ...newGuest, title_role: e.target.value })} placeholder="Technology Analyst" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Biography</Label>
            <Textarea value={newGuest.bio} onChange={e => setNewGuest({ ...newGuest, bio: e.target.value })} placeholder="Guest bio..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Talking Points</Label>
            <Textarea value={newGuest.talking_points} onChange={e => setNewGuest({ ...newGuest, talking_points: e.target.value })} placeholder="Suggested talking points..." rows={3} />
          </div>
          <Button onClick={handleAddGuest} disabled={!newGuest.guest_name.trim()}>
            Save Guest
          </Button>
        </div>
      )}

      {guests.length === 0 && !adding ? (
        <div className="glass-panel p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No guests added yet. Click "Add Guest" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guests.map(guest => (
            <div key={guest.id} className="glass-panel p-4 space-y-2">
              <div className="!flex items-start justify-between gap-2">
                <div className="!flex items-center gap-2">
                  <UserCircle className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{guest.guest_name}</h3>
                    {guest.title_role && <p className="text-xs text-muted-foreground">{guest.title_role}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(guest.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {guest.bio && <p className="text-sm text-muted-foreground">{guest.bio}</p>}
              {guest.talking_points && (
                <div className="p-2 rounded bg-secondary/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Talking Points</p>
                  <p className="text-sm whitespace-pre-line">{guest.talking_points}</p>
                </div>
              )}
              <button
                onClick={() => toggleStatus(guest)}
                className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                  guest.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
                }`}
              >
                {guest.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}