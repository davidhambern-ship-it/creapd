import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Sparkles, Check, Loader2, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductionProfileSelector from '@/components/production/ProductionProfileSelector';
import { useToast } from '@/components/ui/use-toast';

// Profile configurations
const PROFILE_CONFIGS = {
  news: {
    profile_type: 'news',
    profile_name: 'News Production',
    description: 'Daily news briefings, breaking news, and news segments',
    icon: 'newspaper',
    color: 'berna-purple',
    item_type_label: 'Story',
    item_type_label_plural: 'Stories',
    research_label: 'News Research',
    rundown_label: 'News Rundown',
  },
  music_show: {
    profile_type: 'music_show',
    profile_name: 'Music Show',
    description: 'Radio shows, music programs, and playlist-based content',
    icon: 'music',
    color: 'berna-orange',
    item_type_label: 'Song',
    item_type_label_plural: 'Playlist',
    research_label: 'Music Research',
    rundown_label: 'Show Clock',
  },
  cooking_show: {
    profile_type: 'cooking_show',
    profile_name: 'Cooking Show',
    description: 'Recipe demonstrations, cooking segments, and food content',
    icon: 'chef-hat',
    color: 'berna-emerald',
    item_type_label: 'Recipe',
    item_type_label_plural: 'Recipes',
    research_label: 'Recipe Research',
    rundown_label: 'Cooking Rundown',
  },
  podcast: {
    profile_type: 'podcast',
    profile_name: 'Podcast',
    description: 'Podcast episodes, interviews, and audio content',
    icon: 'mic',
    color: 'berna-purple',
    item_type_label: 'Topic',
    item_type_label_plural: 'Topics',
    research_label: 'Topic Research',
    rundown_label: 'Episode Rundown',
  },
  sports_show: {
    profile_type: 'sports_show',
    profile_name: 'Sports Show',
    description: 'Sports coverage, game analysis, and sports commentary',
    icon: 'trophy',
    color: 'berna-navy',
    item_type_label: 'Game',
    item_type_label_plural: 'Games',
    research_label: 'Sports Research',
    rundown_label: 'Sports Rundown',
  },
  talk_show: {
    profile_type: 'talk_show',
    profile_name: 'Talk Show',
    description: 'Interview shows, panel discussions, and talk formats',
    icon: 'message-circle',
    color: 'berna-purple',
    item_type_label: 'Segment',
    item_type_label_plural: 'Segments',
    research_label: 'Topic Research',
    rundown_label: 'Show Rundown',
  },
  livestream: {
    profile_type: 'livestream',
    profile_name: 'Livestream',
    description: 'Live streaming content, webinars, and live events',
    icon: 'video',
    color: 'berna-orange',
    item_type_label: 'Segment',
    item_type_label_plural: 'Segments',
    research_label: 'Content Research',
    rundown_label: 'Stream Rundown',
  },
};

const ICON_MAP = {
  newspaper: '📰',
  mic: '🎙️',
  radio: '📻',
  music: '🎵',
  'chef-hat': '👨‍🍳',
  trophy: '🏆',
  'message-circle': '💬',
  video: '📹',
  church: '⛪',
  'graduation-cap': '🎓',
  briefcase: '💼',
  'gamepad-2': '🎮',
  settings: '⚙️',
};

export default function ProductionSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [profiles, setProfiles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [shows, setShows] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    brand_profile_id: '',
    show_profile_id: '',
    production_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  // Check for profile parameter in URL
  useEffect(() => {
    const profileParam = searchParams.get('profile');
    if (profileParam && PROFILE_CONFIGS[profileParam]) {
      setSelectedProfile(PROFILE_CONFIGS[profileParam]);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [profileList, brandList, showList] = await Promise.all([
        base44.entities.ProductionProfile.filter({ is_active: true }, 'sort_order', 50),
        base44.entities.BrandProfile.list(),
        base44.entities.ShowProfile.list(),
      ]);
      setProfiles(profileList);
      setBrands(brandList);
      setShows(showList);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load production data' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    setShowProfileSelector(false);
  };

  const handleCreate = async () => {
    if (!formData.title || !selectedProfile) return;
    
    setCreating(true);
    try {
      const selectedStoryIds = JSON.parse(localStorage.getItem('selectedStoryIds') || '[]');
      
      // Create production
      const production = await base44.entities.Production.create({
        title: formData.title,
        brand_profile_id: formData.brand_profile_id,
        show_profile_id: formData.show_profile_id,
        production_profile_id: selectedProfile.id,
        production_date: formData.production_date,
        status: 'in_progress',
        story_order: JSON.stringify(selectedStoryIds),
        target_runtime: '30 Minutes',
        checklist: JSON.stringify({
          briefing_complete: false,
          stories_selected: selectedStoryIds.length > 0,
          story_order_finalized: false,
          scripts_approved: false,
          graphics_ready: false,
          fact_check_complete: false,
          producer_review_complete: false,
          export_ready: false,
        }),
      });

      // Update selected stories
      if (selectedStoryIds.length > 0) {
        const allArticles = await base44.entities.Article.filter({ id: { $in: selectedStoryIds } });
        await Promise.all(
          allArticles.map(article =>
            base44.entities.Article.update(article.id, {
              production_id: production.id,
              production_status: 'selected',
            })
          )
        );
      }

      // Log activity
      await base44.entities.ActivityLog.create({
        action: 'create',
        entity_type: 'Production',
        entity_id: production.id,
        entity_name: production.title,
        details: `Production created with ${selectedStoryIds.length} stories using ${selectedProfile.profile_name} profile`,
      });

      const toastId = toast({
        title: 'Production created',
        description: `${production.title} is ready`,
      });

      // Navigate to Story Manager (workspace)
      navigate('/workspace');
      
      // Auto-dismiss toast after 3 seconds
      setTimeout(() => {
        toast.dismiss(toastId);
      }, 3000);
    } catch (error) {
      console.error('Failed to create production:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create production',
      });
    } finally {
      setCreating(false);
    }
  };

  // Get labels from selected profile
  const labels = selectedProfile
    ? {
        item: selectedProfile.item_type_label || 'Item',
        items: selectedProfile.item_type_label_plural || 'Items',
        research: selectedProfile.research_label || 'Research',
        rundown: selectedProfile.rundown_label || 'Rundown',
      }
    : { item: 'Item', items: 'Items', research: 'Research', rundown: 'Rundown' };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Create Production</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your {selectedProfile?.profile_name || 'production'} workspace
          </p>
        </div>
      </div>

      {/* Profile Selection */}
      {!selectedProfile ? (
        <div className="glass-panel p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Select Production Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                className="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-berna-purple/30 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {ICON_MAP[profile.icon] || '📺'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{profile.profile_name}</p>
                    <p className="text-xs text-muted-foreground">{profile.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setShowProfileSelector(true)}
          >
            View All Profiles
          </Button>
        </div>
      ) : (
        <>
          {/* Selected Profile Card */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-berna-purple to-purple-600 flex items-center justify-center text-2xl`}>
                {ICON_MAP[selectedProfile.icon] || '📺'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{selectedProfile.profile_name}</h2>
                <p className="text-sm text-muted-foreground">{selectedProfile.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white">
                {labels.items}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white">
                {labels.research}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white">
                {labels.rundown}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => setSelectedProfile(null)}
            >
              Change Profile
            </Button>
          </div>

          {/* Production Details Form */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Production Details</h2>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Production Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    selectedProfile.profile_type === 'news' ? 'TNN Morning Brief - June 29' :
                    selectedProfile.profile_type === 'music' ? 'The Morning Show - June 29' :
                    selectedProfile.profile_type === 'cooking' ? 'Cooking with Style - Episode 5' :
                    'Production Title'
                  }
                  className="bg-white/[0.03] border-white/[0.08]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="brand">Brand Profile</Label>
                  <select
                    id="brand"
                    value={formData.brand_profile_id}
                    onChange={(e) => setFormData({ ...formData, brand_profile_id: e.target.value })}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">Select brand</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.brand_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="show">Show Profile</Label>
                  <select
                    id="show"
                    value={formData.show_profile_id}
                    onChange={(e) => setFormData({ ...formData, show_profile_id: e.target.value })}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">Select show</option>
                    {shows.map(s => (
                      <option key={s.id} value={s.id}>{s.show_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="date">Production Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  className="bg-white/[0.03] border-white/[0.08]"
                />
              </div>
            </div>
          </div>

          {/* Selected Stories Info */}
          {(() => {
            const selectedCount = JSON.parse(localStorage.getItem('selectedStoryIds') || '[]').length;
            return selectedCount > 0 ? (
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-berna-emerald" />
                  <p className="text-sm text-white">
                    <span className="font-semibold">{selectedCount}</span> {labels.items.toLowerCase()} selected from queue
                  </p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 text-white"
              onClick={handleCreate}
              disabled={creating || !formData.title}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Production
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Profile Selector Modal */}
      {showProfileSelector && (
        <ProductionProfileSelector
          profiles={profiles}
          onSelect={handleProfileSelect}
          onClose={() => setShowProfileSelector(false)}
        />
      )}
    </div>
  );
}