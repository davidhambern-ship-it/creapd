import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Users, Plus, Loader2, Trash2, UserPlus, Crown, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

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
      toast({ title: 'Organization deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const orgTeams = teams.filter(t => t.organization_id === selectedOrg?.id);
  const memberIds = selectedOrg?.member_ids ? selectedOrg.member_ids.split(',').filter(Boolean) : [];
  const orgMembers = users.filter(u => memberIds.includes(u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Organizations</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage collaborative workspaces, teams, and members</p>
        </div>
        <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3 h-3 mr-1" />New Organization
        </Button>
      </div>

      {orgs.length === 0 && !showCreate && (
        <div className="glass-panel p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No organizations yet. Create one to start collaborating.</p>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white" onClick={() => setShowCreate(true)}>
            <Plus className="w-3 h-3 mr-1" />Create Organization
          </Button>
        </div>
      )}

      {showCreate && (
        <div className="glass-panel p-5 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">New Organization</h3>
            <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" onClick={() => setShowCreate(false)}><X className="w-3 h-3" /></Button>
          </div>
          <Input placeholder="Organization name" value={newOrg.name} onChange={e => setNewOrg(prev => ({ ...prev, name: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          <Textarea placeholder="Description (optional)" value={newOrg.description} onChange={e => setNewOrg(prev => ({ ...prev, description: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm min-h-16" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Website (optional)" value={newOrg.website} onChange={e => setNewOrg(prev => ({ ...prev, website: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
            <Input placeholder="Industry (optional)" value={newOrg.industry} onChange={e => setNewOrg(prev => ({ ...prev, industry: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          </div>
          <Button size="sm" className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs" onClick={handleCreateOrg}>
            <Check className="w-3 h-3 mr-1" />Create
          </Button>
        </div>
      )}

      {orgs.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Org list */}
          <div className="w-full lg:w-64 space-y-2">
            {orgs.map(org => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`w-full text-left glass-panel p-3 transition-all ${selectedOrg?.id === org.id ? 'border-berna-purple/40 glow-purple' : 'hover:border-white/[0.12]'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-berna-purple/30 to-berna-orange/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-berna-purple" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate">{org.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{org.member_ids ? org.member_ids.split(',').length : 0} members</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Org detail */}
          {selectedOrg && (
            <div className="flex-1 space-y-4">
              {/* Org header */}
              <div className="glass-panel p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedOrg.name}</h2>
                    {selectedOrg.description && <p className="text-xs text-muted-foreground mt-1">{selectedOrg.description}</p>}
                    {selectedOrg.website && <a href={selectedOrg.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-berna-purple hover:underline mt-1 block">{selectedOrg.website}</a>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8" onClick={() => handleDeleteOrg(selectedOrg)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                  <Crown className="w-3 h-3 text-berna-orange" />
                  Owner: {selectedOrg.owner_name || 'Unknown'}
                </div>
              </div>

              {/* Members */}
              <div className="glass-panel p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-berna-purple" />Members</h3>
                <div className="space-y-2 mb-4">
                  {orgMembers.length > 0 ? orgMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-berna-purple/40 to-berna-orange/30 flex items-center justify-center text-xs font-bold text-white">
                        {(member.full_name || member.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{member.full_name || 'Unnamed'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-white/[0.04]">{member.role || 'user'}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground">No members loaded. Invite users to join.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Invite by email..." value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm flex-1 h-8" />
                  <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                    {inviting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
                    Invite
                  </Button>
                </div>
              </div>

              {/* Teams */}
              <div className="glass-panel p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-berna-orange" />Teams</h3>
                <div className="space-y-2 mb-4">
                  {orgTeams.length > 0 ? orgTeams.map(team => (
                    <div key={team.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-xs font-semibold text-white">{team.name}</p>
                      {team.description && <p className="text-[10px] text-muted-foreground mt-0.5">{team.description}</p>}
                      {team.team_lead_name && <p className="text-[10px] text-berna-orange mt-1">Lead: {team.team_lead_name}</p>}
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground">No teams yet.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Team name..." value={newTeam.name} onChange={e => setNewTeam(prev => ({ ...prev, name: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm flex-1 h-8" />
                  <Button size="sm" variant="outline" className="border-white/10 text-white text-xs h-8 hover:bg-white/[0.04]" onClick={handleCreateTeam} disabled={!newTeam.name}>
                    <Plus className="w-3 h-3 mr-1" />Add Team
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}