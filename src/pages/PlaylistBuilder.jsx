import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Music, Sparkles, Clock, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import ProductionProfileBadge from '@/components/production/ProductionProfileBadge';

export default function PlaylistBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeProfile, setActiveProfile] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    show_profile_id: '',
    production_date: new Date().toISOString().split('T')[0],
  });
  const [shows, setShows] = useState([]);

  useEffect(() => {
    loadPlaylistData();
  }, []);

  const loadPlaylistData = async () => {
    try {
      const stored = sessionStorage.getItem('activeProductionProfile');
      if (!stored) {
        navigate('/select-production-type');
        return;
      }
      
      const profile = JSON.parse(stored);
      setActiveProfile(profile);

      const [prods, showList] = await Promise.all([
        base44.entities.Production.filter({ 
          status: { $in: ['draft', 'in_progress'] },
          production_profile_type: 'music_show'
        }, '-created_date', 1),
        base44.entities.ShowProfile.list(),
      ]);

      setShows(showList);

      if (prods.length > 0) {
        const prod = prods[0];
        setPlaylist(prod);
        await loadSongs(prod);
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load playlist data',
        variant: 'destructive'
      });
    }
  };

  const loadSongs = async (prod) => {
    try {
      const order = JSON.parse(prod.story_order || '[]');
      if (order.length === 0) {
        setSongs([]);
        return;
      }

      const allSongs = await base44.entities.ProductionItem.filter({
        selected_for_production_id: prod.id,
        item_type: 'song'
      });

      const sorted = order.map(id => allSongs.find(s => s.id === id)).filter(Boolean);
      setSongs(sorted);
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const handleCreate = async () => {
    if (!newPlaylist.title) return;
    
    setCreating(true);
    try {
      const selectedSongs = await base44.entities.ProductionItem.filter({
        is_selected: true,
        production_profile_type: 'music_show'
      });

      const order = selectedSongs.map(s => s.id);
      
      const created = await base44.entities.Production.create({
        title: newPlaylist.title,
        brand_profile_id: null,
        show_profile_id: newPlaylist.show_profile_id,
        production_date: newPlaylist.production_date,
        status: 'draft',
        story_order: JSON.stringify(order),
        target_runtime: '60 Minutes',
        checklist: JSON.stringify({
          songs_selected: order.length > 0,
          order_finalized: false,
          scripts_approved: false,
          graphics_ready: false,
          producer_review_complete: false,
          export_ready: false,
        }),
        production_profile_type: 'music_show',
      });

      await Promise.all(
        selectedSongs.map(song =>
          base44.entities.ProductionItem.update(song.id, {
            selected_for_production_id: created.id,
            status: 'selected'
          })
        )
      );

      setPlaylist(created);
      setSongs(selectedSongs);
      setShowCreateModal(false);

      toast({
        title: 'Playlist Created',
        description: `${selectedSongs.length} songs added`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create playlist',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveSong = async (songId) => {
    try {
      const newOrder = songs.filter(s => s.id !== songId).map(s => s.id);
      
      await base44.entities.Production.update(playlist.id, {
        story_order: JSON.stringify(newOrder)
      });

      await base44.entities.ProductionItem.update(songId, {
        selected_for_production_id: null,
        status: 'new'
      });

      setSongs(prev => prev.filter(s => s.id !== songId));

      toast({
        title: 'Song Removed',
        description: 'Removed from playlist'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove song',
        variant: 'destructive'
      });
    }
  };

  const handleReorder = (newOrder) => {
    setSongs(newOrder);
  };

  const totalDuration = songs.reduce((total, song) => {
    if (song.duration) {
      const parts = song.duration.split(':').map(Number);
      return total + (parts[0] * 60 + (parts[1] || 0));
    }
    return total;
  }, 0);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="glass-panel p-8 text-center border-pink-500/20">
          <Music className="w-12 h-12 text-pink-500/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-pink-100 mb-2">No Playlist Yet</h2>
          <p className="text-muted-foreground mb-6">
            Create a new playlist to start building your music show
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Create Playlist
          </Button>
        </div>

        {showCreateModal && (
          <Card className="glass-panel border-pink-500/20">
            <CardHeader>
              <CardTitle className="text-pink-100">New Playlist</CardTitle>
              <CardDescription>Set up your music show playlist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Playlist Title</label>
                <Input
                  value={newPlaylist.title}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, title: e.target.value })}
                  placeholder="e.g. Morning Mix - June 30"
                  className="border-pink-500/20 focus:border-pink-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Show Profile</label>
                <Select 
                  value={newPlaylist.show_profile_id} 
                  onValueChange={(v) => setNewPlaylist({ ...newPlaylist, show_profile_id: v })}
                >
                  <SelectTrigger className="border-pink-500/20">
                    <SelectValue placeholder="Select show" />
                  </SelectTrigger>
                  <SelectContent>
                    {shows.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.show_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={newPlaylist.production_date}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, production_date: e.target.value })}
                  className="border-pink-500/20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border-pink-500/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newPlaylist.title}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
                >
                  {creating ? 'Creating...' : 'Create Playlist'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-background via-background to-pink-950/20 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              {playlist.title}
            </h1>
            {activeProfile && <ProductionProfileBadge profileType={activeProfile.type} />}
          </div>
          <p className="text-muted-foreground">
            {songs.length} songs • {formatDuration(totalDuration)} total runtime
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/music-research')}
            className="border-pink-500/20 hover:bg-pink-500/10"
          >
            <Music className="w-4 h-4 mr-2" />
            Add Songs
          </Button>
          <Button
            onClick={() => navigate('/production')}
            className="bg-gradient-to-r from-pink-500 to-rose-500"
          >
            <ListMusic className="w-4 h-4 mr-2" />
            Generate Production
          </Button>
        </div>
      </div>

      {/* Songs List */}
      {songs.length === 0 ? (
        <Card className="glass-panel border-pink-500/20 p-12 text-center">
          <Music className="w-12 h-12 text-pink-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-pink-100">No Songs in Playlist</h3>
          <p className="text-muted-foreground mb-4">
            Go to Music Research to add songs to your playlist
          </p>
          <Button
            onClick={() => navigate('/music-research')}
            className="bg-gradient-to-r from-pink-500 to-rose-500"
          >
            <Music className="w-4 h-4 mr-2" />
            Browse Songs
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {songs.map((song, index) => (
            <Card
              key={song.id}
              className="glass-panel border-pink-500/20 hover:border-pink-500/50 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-pink-100">{song.title}</h4>
                    {song.category && (
                      <Badge variant="secondary" className="mt-1 text-xs bg-pink-500/10 text-pink-300 border-pink-500/20">
                        {song.category}
                      </Badge>
                    )}
                  </div>
                  {song.duration && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{song.duration}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSong(song.id)}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Music className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}