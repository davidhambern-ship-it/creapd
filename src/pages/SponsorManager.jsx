import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Radio, Plus, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export default function SponsorManager() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sponsors, setSponsors] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSponsor, setNewSponsor] = useState({
    sponsor_name: '',
    contact_info: '',
    commercial_script: '',
    read_duration: '30 seconds',
    placement_preference: 'Middle of show',
    is_active: true,
    start_date: '',
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    try {
      const sponsorList = await base44.entities.Sponsor.list('-created_date', 50);
      setSponsors(sponsorList);
    } catch (error) {
      console.error('Error loading sponsors:', error);
    }
  };

  const handleAddSponsor = async () => {
    if (!newSponsor.sponsor_name) {
      toast({ title: 'Sponsor Name Required', variant: 'destructive' });
      return;
    }

    try {
      await base44.entities.Sponsor.create(newSponsor);
      toast({ title: 'Sponsor Added', description: `${newSponsor.sponsor_name} added` });
      setNewSponsor({
        sponsor_name: '',
        contact_info: '',
        commercial_script: '',
        read_duration: '30 seconds',
        placement_preference: 'Middle of show',
        is_active: true,
        start_date: '',
        end_date: '',
        notes: ''
      });
      setShowAddModal(false);
      loadSponsors();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add sponsor', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (sponsorId, currentStatus) => {
    try {
      await base44.entities.Sponsor.update(sponsorId, { is_active: !currentStatus });
      loadSponsors();
      toast({ title: 'Sponsor Updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update sponsor', variant: 'destructive' });
    }
  };

  const activeSponsors = sponsors.filter(s => s.is_active);
  const totalReads = activeSponsors.length;

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-background via-background to-emerald-950/20 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-emerald-100">Sponsor Manager</h1>
          <p className="text-muted-foreground">Manage sponsors and commercial reads</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sponsor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sponsors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-100">{activeSponsors.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-100">{totalReads}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commercial Runtime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-100">
              {activeSponsors.reduce((acc, s) => {
                const mins = parseInt(s.read_duration) || 0.5;
                return acc + mins;
              }, 0)} min
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddModal && (
        <Card className="glass-panel border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-emerald-100">Add New Sponsor</CardTitle>
            <CardDescription>Configure sponsor details and commercial read</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sponsor Name *</label>
                <Input
                  value={newSponsor.sponsor_name}
                  onChange={(e) => setNewSponsor({ ...newSponsor, sponsor_name: e.target.value })}
                  placeholder="e.g. Joe's Pizza"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contact Info</label>
                <Input
                  value={newSponsor.contact_info}
                  onChange={(e) => setNewSponsor({ ...newSponsor, contact_info: e.target.value })}
                  placeholder="Phone or email"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Commercial Script</label>
              <Input
                value={newSponsor.commercial_script}
                onChange={(e) => setNewSponsor({ ...newSponsor, commercial_script: e.target.value })}
                placeholder="30-second read script"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Read Duration</label>
                <Input
                  value={newSponsor.read_duration}
                  onChange={(e) => setNewSponsor({ ...newSponsor, read_duration: e.target.value })}
                  placeholder="e.g. 30 seconds"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Placement</label>
                <Input
                  value={newSponsor.placement_preference}
                  onChange={(e) => setNewSponsor({ ...newSponsor, placement_preference: e.target.value })}
                  placeholder="e.g. Middle of show"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={newSponsor.start_date}
                  onChange={(e) => setNewSponsor({ ...newSponsor, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={newSponsor.end_date}
                  onChange={(e) => setNewSponsor({ ...newSponsor, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Input
                value={newSponsor.notes}
                onChange={(e) => setNewSponsor({ ...newSponsor, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddSponsor} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500">
                Add Sponsor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sponsors List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-emerald-100">Active Sponsors</h2>
        {activeSponsors.length === 0 ? (
          <Card className="glass-panel border-emerald-500/20 p-12 text-center">
            <DollarSign className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-emerald-100">No Active Sponsors</h3>
            <p className="text-muted-foreground">Add sponsors to manage commercial reads</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeSponsors.map(sponsor => (
              <Card key={sponsor.id} className="glass-panel border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-emerald-100">{sponsor.sponsor_name}</h3>
                        <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-300">
                          {sponsor.read_duration}
                        </Badge>
                      </div>
                      {sponsor.commercial_script && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {sponsor.commercial_script}
                        </p>
                      )}
                      {sponsor.placement_preference && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Placement: {sponsor.placement_preference}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Switch
                          checked={sponsor.is_active}
                          onCheckedChange={() => handleToggleActive(sponsor.id, sponsor.is_active)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}