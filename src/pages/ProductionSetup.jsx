import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Music, Radio, Mic, Clock, Calendar, Users, Tag, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const GENRES = [
  'Top 40', 'Country', 'Classic Rock', 'Hip-Hop', 'Old School',
  'Adult Contemporary', 'Christian', 'Jazz', 'R&B', 'Latin',
  'Pop', 'Rock', 'Alternative', 'Indie', 'Electronic', 'Dance',
  'Metal', 'Blues', 'Soul', 'Funk', 'Reggae', 'Classical'
];

const MOODS = [
  'Morning Energy', 'Late Night Chill', 'Romantic', 'Party',
  'Throwback', 'Road Trip', 'Workout', 'Relaxed', 'Coffee Shop',
  'Feel Good', 'Emotional', 'High Energy', 'Festival', 'Holiday', 'Seasonal'
];

const DECADES = ['60s', '70s', '80s', '90s', '2000s', '2010s', '2020s'];

const STATION_FORMATS = [
  'Top 40', 'Country', 'Classic Rock', 'Hip-Hop', 'Old School',
  'Adult Contemporary', 'Christian', 'Jazz', 'R&B', 'Latin'
];

export default function ProductionSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shows, setShows] = useState([]);
  const [formData, setFormData] = useState({
    show_name: '',
    station_name: '',
    host_name: '',
    co_host: '',
    show_date: new Date().toISOString().split('T')[0],
    show_time: '09:00',
    total_runtime: '60',
    music_runtime: '45',
    talk_runtime: '10',
    commercial_runtime: '5',
    opening_theme: '',
    closing_theme: '',
    audience: 'General',
    target_age_group: '18-49',
    clean_only: false,
    explicit_allowed: false,
    primary_genres: [],
    secondary_genres: [],
    moods: [],
    decades: [],
    regions: '',
    language: 'English',
    station_format: ''
  });

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      const showList = await base44.entities.ShowProfile.list();
      setShows(showList);
    } catch (error) {
      console.error('Error loading shows:', error);
    }
  };

  const toggleGenre = (genre) => {
    setFormData(prev => {
      const exists = prev.primary_genres.includes(genre);
      if (exists) {
        return { ...prev, primary_genres: prev.primary_genres.filter(g => g !== genre) };
      }
      if (prev.primary_genres.length >= 3) {
        toast({ title: 'Max 3 primary genres', description: 'Remove one to add another' });
        return prev;
      }
      return { ...prev, primary_genres: [...prev.primary_genres, genre] };
    });
  };

  const toggleMood = (mood) => {
    setFormData(prev => {
      const exists = prev.moods.includes(mood);
      if (exists) {
        return { ...prev, moods: prev.moods.filter(m => m !== mood) };
      }
      if (prev.moods.length >= 3) {
        toast({ title: 'Max 3 moods', description: 'Remove one to add another' });
        return prev;
      }
      return { ...prev, moods: [...prev.moods, mood] };
    });
  };

  const toggleDecade = (decade) => {
    setFormData(prev => {
      const exists = prev.decades.includes(decade);
      if (exists) {
        return { ...prev, decades: prev.decades.filter(d => d !== decade) };
      }
      return { ...prev, decades: [...prev.decades, decade] };
    });
  };

  const handleCreate = async () => {
    if (!formData.show_name || !formData.station_name) {
      toast({ title: 'Missing Info', description: 'Show name and station are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const showProfile = await base44.entities.ShowProfile.create({
        show_name: formData.show_name,
        host_names: formData.host_name + (formData.co_host ? `, ${formData.co_host}` : ''),
        audience: formData.audience,
        target_runtime: `${formData.total_runtime} Minutes`,
        preferred_categories: JSON.stringify(formData.primary_genres),
        default_export_format: 'pdf'
      });

      const production = await base44.entities.Production.create({
        title: `${formData.show_name} - ${formData.show_date}`,
        brand_profile_id: null,
        show_profile_id: showProfile.id,
        production_date: formData.show_date,
        status: 'draft',
        story_order: JSON.stringify([]),
        target_runtime: `${formData.total_runtime} Minutes`,
        production_profile_type: 'music_show',
        metadata: JSON.stringify({
          station_name: formData.station_name,
          co_host: formData.co_host,
          show_time: formData.show_time,
          music_runtime: formData.music_runtime,
          talk_runtime: formData.talk_runtime,
          commercial_runtime: formData.commercial_runtime,
          opening_theme: formData.opening_theme,
          closing_theme: formData.closing_theme,
          target_age_group: formData.target_age_group,
          clean_only: formData.clean_only,
          explicit_allowed: formData.explicit_allowed,
          primary_genres: formData.primary_genres,
          secondary_genres: formData.secondary_genres,
          moods: formData.moods,
          decades: formData.decades,
          regions: formData.regions,
          language: formData.language,
          station_format: formData.station_format
        })
      });

      sessionStorage.setItem('activeProduction', JSON.stringify(production));

      toast({ title: 'Show Setup Complete', description: 'Ready to build your playlist' });
      navigate('/playlist-builder');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create show setup', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-background via-background to-pink-950/20 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Music className="w-8 h-8 text-pink-500" />
        <div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
            Production Setup
          </h1>
          <p className="text-muted-foreground">Configure your music show parameters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Show Info */}
        <Card className="glass-panel border-pink-500/20">
          <CardHeader>
            <CardTitle className="text-pink-100 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Show Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Show Name *</Label>
              <Input
                value={formData.show_name}
                onChange={(e) => setFormData({ ...formData, show_name: e.target.value })}
                placeholder="e.g. Morning Mix"
                className="border-pink-500/20"
              />
            </div>
            <div>
              <Label>Station Name *</Label>
              <Input
                value={formData.station_name}
                onChange={(e) => setFormData({ ...formData, station_name: e.target.value })}
                placeholder="e.g. KISS FM"
                className="border-pink-500/20"
              />
            </div>
            <div>
              <Label>Host Name</Label>
              <Input
                value={formData.host_name}
                onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                placeholder="e.g. DJ Mike"
                className="border-pink-500/20"
              />
            </div>
            <div>
              <Label>Co-Host</Label>
              <Input
                value={formData.co_host}
                onChange={(e) => setFormData({ ...formData, co_host: e.target.value })}
                placeholder="Optional"
                className="border-pink-500/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Timing */}
        <Card className="glass-panel border-pink-500/20">
          <CardHeader>
            <CardTitle className="text-pink-100 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Show Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Show Date</Label>
              <Input
                type="date"
                value={formData.show_date}
                onChange={(e) => setFormData({ ...formData, show_date: e.target.value })}
                className="border-pink-500/20"
              />
            </div>
            <div>
              <Label>Show Time</Label>
              <Input
                type="time"
                value={formData.show_time}
                onChange={(e) => setFormData({ ...formData, show_time: e.target.value })}
                className="border-pink-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Total (min)</Label>
                <Input
                  type="number"
                  value={formData.total_runtime}
                  onChange={(e) => setFormData({ ...formData, total_runtime: e.target.value })}
                  className="border-pink-500/20"
                />
              </div>
              <div>
                <Label>Music (min)</Label>
                <Input
                  type="number"
                  value={formData.music_runtime}
                  onChange={(e) => setFormData({ ...formData, music_runtime: e.target.value })}
                  className="border-pink-500/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Talk (min)</Label>
                <Input
                  type="number"
                  value={formData.talk_runtime}
                  onChange={(e) => setFormData({ ...formData, talk_runtime: e.target.value })}
                  className="border-pink-500/20"
                />
              </div>
              <div>
                <Label>Ads (min)</Label>
                <Input
                  type="number"
                  value={formData.commercial_runtime}
                  onChange={(e) => setFormData({ ...formData, commercial_runtime: e.target.value })}
                  className="border-pink-500/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Preferences */}
        <Card className="glass-panel border-pink-500/20">
          <CardHeader>
            <CardTitle className="text-pink-100 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Content Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Audience</Label>
              <Input
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                placeholder="e.g. General Public"
                className="border-pink-500/20"
              />
            </div>
            <div>
              <Label>Target Age Group</Label>
              <Input
                value={formData.target_age_group}
                onChange={(e) => setFormData({ ...formData, target_age_group: e.target.value })}
                placeholder="e.g. 18-49"
                className="border-pink-500/20"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Clean Only</Label>
              <Switch
                checked={formData.clean_only}
                onCheckedChange={(v) => setFormData({ ...formData, clean_only: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Explicit Allowed</Label>
              <Switch
                checked={formData.explicit_allowed}
                onCheckedChange={(v) => setFormData({ ...formData, explicit_allowed: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Genres */}
        <Card className="glass-panel border-pink-500/20 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-pink-100 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Primary Genres (Max 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(genre => (
                <Badge
                  key={genre}
                  variant={formData.primary_genres.includes(genre) ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    formData.primary_genres.includes(genre)
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : 'border-pink-500/20 hover:bg-pink-500/10'
                  }`}
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Moods */}
        <Card className="glass-panel border-pink-500/20 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-pink-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Moods (Max 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(mood => (
                <Badge
                  key={mood}
                  variant={formData.moods.includes(mood) ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    formData.moods.includes(mood)
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : 'border-pink-500/20 hover:bg-pink-500/10'
                  }`}
                  onClick={() => toggleMood(mood)}
                >
                  {mood}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Decades */}
        <Card className="glass-panel border-pink-500/20">
          <CardHeader>
            <CardTitle className="text-pink-100 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Decades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DECADES.map(decade => (
                <Badge
                  key={decade}
                  variant={formData.decades.includes(decade) ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    formData.decades.includes(decade)
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : 'border-pink-500/20 hover:bg-pink-500/10'
                  }`}
                  onClick={() => toggleDecade(decade)}
                >
                  {decade}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={() => navigate('/music-dashboard')} className="border-pink-500/20">
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={loading}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? 'Creating...' : 'Start Building Playlist'}
        </Button>
      </div>
    </div>
  );
}