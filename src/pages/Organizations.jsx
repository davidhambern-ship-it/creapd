import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Users, Plus, Loader2, Trash2, UserPlus, Crown, X, Check, Palette, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BrandProfileEditor from '@/components/profiles/BrandProfileEditor';
import ShowProfileEditor from '@/components/profiles/ShowProfileEditor';

export default function Organizations() {
  const [orgs, setOrgs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [newOrg, setNewOrg] = useState({ name: '', description: '', website: '', industry: '' });
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState('organizations');
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgRes, teamRes] = await Promise.all([
        base44.entities.Organization.list('-created_date', 50),
        base44.entities.Team.list('-created_date', 50),
      ]);
      setOrgs(orgRes);
      setTeams(teamRes);
      if (orgRes.length > 0 && !selectedOrg) setSelectedOrg(orgRes[0]);
      try {
        const userRes = await base44.entities.User.list('-created_date', 100);
        setUsers(userRes);
      } catch (e) { /* admin-only */ }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateOrg = async () => {
    if (!newOrg.name) return;
    try {
      const me = await base44.auth.me();
      const created = await base44.entities.Organization.create({
        ...newOrg,
        owner_id: me.id,
        owner_name: me.full_name,
        member_ids: me.id,
      });
      setOrgs(prev => [created, ...prev]);
      setSelectedOrg(created);
      setNewOrg({ name: '', description: '', website: '', industry: '' });
      setShowCreate(false);
      toast({ title: 'Organization created', description: `${created.name} is ready.` });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name || !selectedOrg) return;
    try {
      const me = await base44.auth.me();
      const created = await base44.entities.Team.create({
        organization_id: selectedOrg.id,
        organization_name: selectedOrg.name,
        name: newTeam.name,
        description: newTeam.description,
        team_lead_id: me.id,
        team_lead_name: me.full_name,
        member_ids: me.id,
      });
      setTeams(prev => [created, ...prev]);
      setNewTeam({ name: '', description: '' });
      toast({ title: 'Team created', description: `${created.name} added to ${selectedOrg.name}.` });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !selectedOrg) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, 'user');
      toast({ title: 'Invitation sent', description: `${inviteEmail} has been invited.` });
      setInviteEmail('');
    } catch (err) {
      toast({ title: 'Invite failed', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteOrg = async (org) => {
    if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Organization.delete(org.id);
      setOrgs(prev => prev.filter(o => o.id !== org.id));
      if (selectedOrg?.id === org.id) setSelectedOrg(null);
      toast({ title: 'Organization deleted', description: `${org.name} has been removed.` });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Network Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage organizations, brands, and shows</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/[0.04] border border-white/10">
          <TabsTrigger value="organizations" className="data-[state=active]:bg-berna-purple/20">
            <Building2 className="w-4 h-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="brands" className="data-[state=active]:bg-berna-purple/20">
            <Palette className="w-4 h-4 mr-2" />
            Brand Profiles
          </TabsTrigger>
          <TabsTrigger value="shows" className="data-[state=active]:bg-berna-purple/20">
            <Tv className="w-4 h-4 mr-2" />
            Show Profiles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-panel p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Organizations</h3>
                <div className="space-y-2">
                  {orgs.map(org => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrg(org)}
                      className={`w-full text-left p-2 rounded-lg transition-all ${
                        selectedOrg?.id === org.id
                          ? 'bg-berna-purple/20 border border-berna-purple/30'
                          : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06]'
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{org.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{org.owner_name}</p>
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="w-4 h-4" />
                  New Organization
                </Button>
              </div>

              {selectedOrg && (
                <div className="glass-panel p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{selectedOrg.name}</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteOrg(selectedOrg)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p><span className="text-white">Website:</span> {selectedOrg.website || '—'}</p>
                    <p><span className="text-white">Industry:</span> {selectedOrg.industry || '—'}</p>
                    <p><span className="text-white">Description:</span> {selectedOrg.description || '—'}</p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs font-semibold text-white mb-2">Invite Member</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={handleInvite}
                        disabled={inviting || !inviteEmail}
                      >
                        {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="glass-panel p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Teams</h3>
                <div className="space-y-3">
                  {teams.filter(t => !selectedOrg || t.organization_id === selectedOrg.id).map(team => (
                    <div key={team.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{team.description || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Crown className="w-3 h-3 text-berna-orange" />
                          <span className="text-xs text-muted-foreground">{team.team_lead_name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No teams yet</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-xs font-semibold text-white mb-2">Create New Team</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Team name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Description"
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateTeam}
                      disabled={!newTeam.name || !selectedOrg}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brands">
          <BrandProfileEditor />
        </TabsContent>

        <TabsContent value="shows">
          <ShowProfileEditor />
        </TabsContent>
      </Tabs>

      {/* Create Organization Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Create Organization</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <Input
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="Organization name"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Textarea
                  value={newOrg.description}
                  onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                  placeholder="Brief description"
                  className="min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Website</label>
                  <Input
                    value={newOrg.website}
                    onChange={(e) => setNewOrg({ ...newOrg, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
                  <Input
                    value={newOrg.industry}
                    onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                    placeholder="e.g. Media"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreateOrg} disabled={!newOrg.name}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}