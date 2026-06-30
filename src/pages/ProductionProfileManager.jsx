import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Sparkles, Layers, Search, Package, Download, Settings,
  Plus, Trash2, Edit, Save, X, Check
} from 'lucide-react';

const MODULE_TYPES = {
  research: [
    'news_sources', 'government_sources', 'press_releases', 'business_finance',
    'technology', 'science', 'agriculture', 'local_news', 'creator_economy',
    'small_business', 'topic_research', 'guest_research', 'industry_news',
    'audience_questions', 'trending_discussions', 'user_links', 'music_charts',
    'weather', 'local_events', 'news_headlines', 'artist_updates',
    'community_announcements', 'traffic_reports', 'new_releases', 'music_history',
    'artist_birthdays', 'concert_announcements', 'genre_trends', 'recipes',
    'ingredients', 'seasonal_foods', 'nutrition_facts', 'food_history',
    'kitchen_tips', 'grocery_info', 'scores', 'schedules', 'standings',
    'player_stats', 'team_news', 'injury_reports', 'historical_matchups',
    'guest_background', 'current_events', 'platform_trends', 'audience_prompts',
    'game_info', 'community_updates', 'scripture', 'sermon_research',
    'historical_context', 'devotionals', 'announcements', 'prayer_topics',
    'learning_objectives', 'reference_materials', 'examples', 'exercises',
    'company_updates', 'market_data', 'competitor_news', 'internal_notes',
    'game_updates', 'patch_notes', 'esports_news', 'developer_posts',
    'upcoming_releases', 'custom_rss', 'youtube_channels', 'podcasts', 'blogs', 'websites'
  ],
  production: [
    'teleprompter_script', 'story_cards', 'lower_thirds', 'ai_images',
    'headline_graphics', 'talking_points', 'fact_check_notes', 'source_attribution',
    'social_captions', 'broll_suggestions', 'episode_outline', 'intro_script',
    'segment_breakdown', 'host_talking_points', 'guest_questions', 'ad_reads',
    'outro_script', 'episode_title_ideas', 'show_notes', 'thumbnail',
    'show_clock', 'segment_rundown', 'host_banter', 'playlist', 'station_breaks',
    'sponsor_reads', 'caller_prompts', 'trivia', 'transition_scripts',
    'artist_facts', 'song_introductions', 'music_trivia', 'segment_scripts',
    'transition_banter', 'recipe_cards', 'ingredient_list', 'shopping_list',
    'cooking_rundown', 'host_script', 'food_facts', 'step_by_step',
    'plating_notes', 'ai_food_images', 'game_recap', 'player_profiles',
    'debate_questions', 'prediction_segments', 'ai_graphics', 'guest_intro',
    'interview_questions', 'segment_transitions', 'monologue', 'audience_prompts',
    'stream_outline', 'opening_script', 'segment_list', 'chat_prompts',
    'poll_questions', 'donation_prompts', 'closing_script', 'sermon_outline',
    'scripture_references', 'discussion_questions', 'prayer_points',
    'announcement_script', 'service_rundown', 'slide_text', 'ai_graphics',
    'lesson_plan', 'teaching_script', 'key_terms', 'quiz_questions',
    'slide_outline', 'student_handout', 'executive_summary', 'presentation_outline',
    'slide_text', 'team_update_script', 'charts', 'email_summary',
    'game_summary', 'segment_ideas', 'challenge_ideas'
  ],
  output: [
    'full_package', 'teleprompter', 'pdf', 'markdown', 'docx', 'html',
    'show_notes', 'social_package', 'recipe_sheet', 'shopping_list',
    'rundown', 'playlist', 'sermon_outline', 'slide_outline',
    'handout', 'presentation', 'email', 'outline'
  ]
};

export default function ProductionProfileManager() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    profile_name: '',
    profile_type: 'custom',
    description: '',
    research_modules: [],
    production_modules: [],
    output_modules: [],
    is_active: true
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await base44.entities.ProductionProfile.list();
      setProfiles(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profiles',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile.id);
    setFormData({
      profile_name: profile.profile_name,
      profile_type: profile.profile_type,
      description: profile.description || '',
      research_modules: profile.research_modules ? JSON.parse(profile.research_modules) : [],
      production_modules: profile.production_modules ? JSON.parse(profile.production_modules) : [],
      output_modules: profile.output_modules ? JSON.parse(profile.output_modules) : [],
      is_active: profile.is_active !== false
    });
  };

  const handleSave = async () => {
    try {
      if (editingProfile) {
        await base44.entities.ProductionProfile.update(editingProfile, {
          ...formData,
          research_modules: JSON.stringify(formData.research_modules),
          production_modules: JSON.stringify(formData.production_modules),
          output_modules: JSON.stringify(formData.output_modules)
        });
        toast({ title: 'Profile Updated', description: 'Changes saved successfully' });
      } else {
        await base44.entities.ProductionProfile.create({
          ...formData,
          research_modules: JSON.stringify(formData.research_modules),
          production_modules: JSON.stringify(formData.production_modules),
          output_modules: JSON.stringify(formData.output_modules)
        });
        toast({ title: 'Profile Created', description: 'New profile ready to use' });
      }
      setEditingProfile(null);
      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this production profile?')) return;
    try {
      await base44.entities.ProductionProfile.delete(id);
      toast({ title: 'Deleted', description: 'Profile removed' });
      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete profile',
        variant: 'destructive'
      });
    }
  };

  const toggleModule = (category, module) => {
    const key = `${category}_modules`;
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].includes(module)
        ? prev[key].filter(m => m !== module)
        : [...prev[key], module]
    }));
  };

  if (editingProfile) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">
              {editingProfile === 'new' ? 'Create Production Profile' : 'Edit Profile'}
            </h1>
            <p className="text-muted-foreground">Configure modules and workflows</p>
          </div>
          <Button variant="outline" onClick={() => setEditingProfile(null)}>
            <X className="w-4 h-4 mr-2" />Cancel
          </Button>
        </div>

        <div className="glass-panel p-6 space-y-6">
          <div className="grid gap-4">
            <div>
              <Label>Profile Name</Label>
              <Input
                value={formData.profile_name}
                onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                placeholder="e.g., Morning News Show"
              />
            </div>
            <div>
              <Label>Profile Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={formData.profile_type}
                onChange={(e) => setFormData({ ...formData, profile_type: e.target.value })}
              >
                <option value="news">News</option>
                <option value="podcast">Podcast</option>
                <option value="radio_show">Radio Show</option>
                <option value="music_show">Music Show</option>
                <option value="cooking_show">Cooking Show</option>
                <option value="sports_show">Sports Show</option>
                <option value="talk_show">Talk Show</option>
                <option value="livestream">Livestream</option>
                <option value="church_service">Church Service</option>
                <option value="educational_content">Educational</option>
                <option value="business_briefing">Business Briefing</option>
                <option value="gaming_stream">Gaming Stream</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this production type"
              />
            </div>
          </div>

          {/* Research Modules */}
          <div>
            <Label className="mb-3 block">Research Modules</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg border">
              {MODULE_TYPES.research.map(module => (
                <label key={module} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-white/[0.02] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.research_modules.includes(module)}
                    onChange={() => toggleModule('research', module)}
                    className="rounded"
                  />
                  <span className="truncate">{module.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {formData.research_modules.length} modules
            </p>
          </div>

          {/* Production Modules */}
          <div>
            <Label className="mb-3 block">Production Modules</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg border">
              {MODULE_TYPES.production.map(module => (
                <label key={module} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-white/[0.02] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.production_modules.includes(module)}
                    onChange={() => toggleModule('production', module)}
                    className="rounded"
                  />
                  <span className="truncate">{module.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {formData.production_modules.length} modules
            </p>
          </div>

          {/* Output Modules */}
          <div>
            <Label className="mb-3 block">Output Modules</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 rounded-lg border">
              {MODULE_TYPES.output.map(module => (
                <label key={module} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-white/[0.02] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.output_modules.includes(module)}
                    onChange={() => toggleModule('output', module)}
                    className="rounded"
                  />
                  <span className="truncate">{module.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {formData.output_modules.length} modules
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>Active</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />Save Profile
            </Button>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Production Profiles</h1>
          <p className="text-muted-foreground">Manage production workflows and configurations</p>
        </div>
        <Button onClick={() => setEditingProfile('new')}>
          <Plus className="w-4 h-4 mr-2" />New Profile
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <Card key={profile.id} className="glass-panel">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{profile.profile_name}</CardTitle>
                    <CardDescription>{profile.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(profile)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(profile.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-berna-purple/10 text-berna-purple">
                    {profile.profile_type.replace(/_/g, ' ')}
                  </span>
                  {profile.is_default && (
                    <span className="text-xs px-2 py-1 rounded bg-berna-orange/10 text-berna-orange">
                      Default
                    </span>
                  )}
                  {!profile.is_active && (
                    <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 rounded bg-white/[0.02]">
                    <div className="font-bold text-berna-purple">
                      {profile.research_modules ? JSON.parse(profile.research_modules).length : 0}
                    </div>
                    <div className="text-muted-foreground">Research</div>
                  </div>
                  <div className="text-center p-2 rounded bg-white/[0.02]">
                    <div className="font-bold text-berna-orange">
                      {profile.production_modules ? JSON.parse(profile.production_modules).length : 0}
                    </div>
                    <div className="text-muted-foreground">Production</div>
                  </div>
                  <div className="text-center p-2 rounded bg-white/[0.02]">
                    <div className="font-bold text-berna-emerald">
                      {profile.output_modules ? JSON.parse(profile.output_modules).length : 0}
                    </div>
                    <div className="text-muted-foreground">Output</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    sessionStorage.setItem('activeProductionProfile', JSON.stringify({
                      id: profile.id,
                      type: profile.profile_type,
                      name: profile.profile_name
                    }));
                    toast({
                      title: 'Profile Activated',
                      description: `${profile.profile_name} is now active`
                    });
                  }}
                >
                  <Check className="w-3 h-3 mr-2" />Use This Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}