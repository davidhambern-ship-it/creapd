import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, Settings, Copy, Trash2, Edit, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const PROFILE_COLORS = {
  'berna-purple': 'from-berna-purple to-purple-600',
  'berna-orange': 'from-berna-orange to-orange-500',
  'berna-emerald': 'from-berna-emerald to-emerald-500',
  'berna-navy': 'from-berna-navy to-blue-600',
};

const ICON_MAP = {
  'newspaper': '📰',
  'mic': '🎙️',
  'radio': '📻',
  'music': '🎵',
  'chef-hat': '👨‍🍳',
  'trophy': '🏆',
  'message-circle': '💬',
  'video': '📹',
  'church': '⛪',
  'graduation-cap': '🎓',
  'briefcase': '💼',
  'gamepad-2': '🎮',
  'settings': '⚙️',
};

export default function ProductionProfiles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingProfile, setEditingProfile] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProfile, setNewProfile] = useState({
    profile_name: '',
    profile_type: '',
    description: '',
    icon: 'settings',
    color: 'berna-purple',
    item_type_label: 'Item',
    item_type_label_plural: 'Items',
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.ProductionProfile.list('sort_order', 100);
      setProfiles(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load production profiles' });
    } finally {
      setLoading(false);
    }
  };

  const handleReseed = async () => {
    try {
      await base44.functions.invoke('seedProductionProfiles', {});
      await loadProfiles();
      toast({ title: 'Profiles refreshed', description: 'All production profiles reloaded from defaults' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reseed profiles' });
    }
  };

  const handleDuplicate = async (profile) => {
    try {
      await base44.entities.ProductionProfile.create({
        ...profile,
        profile_name: `${profile.profile_name} (Copy)`,
        is_custom: true,
      });
      await loadProfiles();
      toast({ title: 'Profile duplicated', description: `${profile.profile_name} has been copied` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to duplicate profile' });
    }
  };

  const handleDelete = async (profileId, profileName) => {
    if (!confirm(`Delete "${profileName}"? This cannot be undone.`)) return;
    try {
      await base44.entities.ProductionProfile.delete(profileId);
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      toast({ title: 'Profile deleted', description: `${profileName} has been removed` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete profile' });
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (editingProfile.id) {
        await base44.entities.ProductionProfile.update(editingProfile.id, editingProfile);
      } else {
        await base44.entities.ProductionProfile.create(editingProfile);
      }
      await loadProfiles();
      setEditingProfile(null);
      toast({ title: 'Profile saved', description: 'Your changes have been saved' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save profile' });
    }
  };

  const handleCreateProfile = async () => {
    try {
      await base44.entities.ProductionProfile.create({
        ...newProfile,
        research_modules: 'custom',
        production_modules: 'custom',
        output_modules: 'custom',
        is_custom: true,
        sort_order: profiles.length + 1,
      });
      await loadProfiles();
      setShowCreateDialog(false);
      setNewProfile({
        profile_name: '',
        profile_type: '',
        description: '',
        icon: 'settings',
        color: 'berna-purple',
        item_type_label: 'Item',
        item_type_label_plural: 'Items',
      });
      toast({ title: 'Profile created', description: 'Your custom production profile is ready' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create profile' });
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.profile_name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Production Profiles</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure production types, research modules, and output settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReseed} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Defaults
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white gap-2">
                <Plus className="w-3.5 h-3.5" />
                New Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Custom Production Profile</DialogTitle>
                <DialogDescription>Define a new production type with custom modules and settings</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Profile Name</Label>
                  <Input
                    value={newProfile.profile_name}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, profile_name: e.target.value }))}
                    placeholder="e.g., Documentary, Webinar..."
                    className="bg-white/[0.03] border-white/[0.08]"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newProfile.description}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this production type"
                    className="bg-white/[0.03] border-white/[0.08]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Icon</Label>
                    <select
                      value={newProfile.icon}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    >
                      {Object.keys(ICON_MAP).map(icon => (
                        <option key={icon} value={icon}>{ICON_MAP[icon]} {icon.replace('-', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <select
                      value={newProfile.color}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="berna-purple">Purple</option>
                      <option value="berna-orange">Orange</option>
                      <option value="berna-emerald">Emerald</option>
                      <option value="berna-navy">Navy</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Item Label (Singular)</Label>
                    <Input
                      value={newProfile.item_type_label}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, item_type_label: e.target.value }))}
                      placeholder="e.g., Episode, Segment"
                      className="bg-white/[0.03] border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <Label>Item Label (Plural)</Label>
                    <Input
                      value={newProfile.item_type_label_plural}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, item_type_label_plural: e.target.value }))}
                      placeholder="e.g., Episodes, Segments"
                      className="bg-white/[0.03] border-white/[0.08]"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateProfile} disabled={!newProfile.profile_name}>Create Profile</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search profiles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map(profile => (
          <div
            key={profile.id}
            className="glass-panel p-5 hover:bg-white/[0.08] transition-all group cursor-pointer"
            onClick={() => navigate(`/production/new?profile=${profile.profile_type || profile.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${PROFILE_COLORS[profile.color] || PROFILE_COLORS['berna-purple']} flex items-center justify-center text-xl`}>
                {ICON_MAP[profile.icon] || '⚙️'}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(profile); }}
                  className="p-1.5 rounded-lg hover:bg-white/10"
                  title="Duplicate"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {profile.is_custom && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(profile.id, profile.profile_name); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{profile.profile_name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{profile.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                {profile.item_type_label_plural || 'Items'}
              </span>
              {profile.is_custom && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-berna-purple/20 border border-berna-purple/30 text-berna-purple">
                  Custom
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingProfile && (
        <DialogContent className="bg-card border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Production Profile</DialogTitle>
            <DialogDescription>Configure research, production, and output modules</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Profile Name</Label>
                <Input
                  value={editingProfile.profile_name}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, profile_name: e.target.value }))}
                  className="bg-white/[0.03] border-white/[0.08]"
                />
              </div>
              <div>
                <Label>Item Type Label (Plural)</Label>
                <Input
                  value={editingProfile.item_type_label_plural}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, item_type_label_plural: e.target.value }))}
                  className="bg-white/[0.03] border-white/[0.08]"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editingProfile.description}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/[0.03] border-white/[0.08]"
              />
            </div>
            <div>
              <Label>Research Modules</Label>
              <Input
                value={editingProfile.research_modules || ''}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, research_modules: e.target.value }))}
                placeholder="Comma-separated list of research modules"
                className="bg-white/[0.03] border-white/[0.08] font-mono text-xs"
              />
            </div>
            <div>
              <Label>Production Modules</Label>
              <Input
                value={editingProfile.production_modules || ''}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, production_modules: e.target.value }))}
                placeholder="Comma-separated list of production modules"
                className="bg-white/[0.03] border-white/[0.08] font-mono text-xs"
              />
            </div>
            <div>
              <Label>Output Modules</Label>
              <Input
                value={editingProfile.output_modules || ''}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, output_modules: e.target.value }))}
                placeholder="Comma-separated list of output modules"
                className="bg-white/[0.03] border-white/[0.08] font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Templates</Label>
                <Input
                  value={editingProfile.default_templates || ''}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, default_templates: e.target.value }))}
                  placeholder="Template IDs"
                  className="bg-white/[0.03] border-white/[0.08] font-mono text-xs"
                />
              </div>
              <div>
                <Label>Default Export Format</Label>
                <select
                  value={editingProfile.default_export_format || 'pdf'}
                  onChange={(e) => setEditingProfile(prev => ({ ...prev, default_export_format: e.target.value }))}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="markdown">Markdown</option>
                  <option value="text">Text</option>
                  <option value="html">HTML</option>
                </select>
              </div>
            </div>
            <div>
              <Label>AI Preferences (JSON)</Label>
              <Input
                value={editingProfile.ai_preferences || '{}'}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, ai_preferences: e.target.value }))}
                placeholder='{"model":"automatic","tone":"professional"}'
                className="bg-white/[0.03] border-white/[0.08] font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </div>
  );
}