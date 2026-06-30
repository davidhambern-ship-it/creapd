import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Music, Plus, Search, Filter, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

export default function ArtistLibrary() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newArtist, setNewArtist] = useState({
    artist_name: '',
    genre: '',
    biography: '',
    interesting_facts: '',
    birthday: '',
    social_links: '',
    is_favorite: false
  });

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      const artistList = await base44.entities.Artist.list('-created_date', 50);
      setArtists(artistList);
    } catch (error) {
      console.error('Error loading artists:', error);
    }
  };

  const handleAddArtist = async () => {
    if (!newArtist.artist_name) {
      toast({ title: 'Artist Name Required', variant: 'destructive' });
      return;
    }

    try {
      await base44.entities.Artist.create(newArtist);
      toast({ title: 'Artist Added', description: `${newArtist.artist_name} added to library` });
      setNewArtist({
        artist_name: '',
        genre: '',
        biography: '',
        interesting_facts: '',
        birthday: '',
        social_links: '',
        is_favorite: false
      });
      setShowAddModal(false);
      loadArtists();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add artist', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (artistId, currentStatus) => {
    try {
      await base44.entities.Artist.update(artistId, { is_favorite: !currentStatus });
      loadArtists();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update artist', variant: 'destructive' });
    }
  };

  const filteredArtists = artists.filter(artist =>
    artist.artist_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (artist.genre && artist.genre.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-background via-background to-purple-950/20 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-purple-100">Artist Library</h1>
          <p className="text-muted-foreground">Manage artist profiles and information</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Artist
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {showAddModal && (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-purple-100">Add New Artist</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Artist Name *</label>
                <Input
                  value={newArtist.artist_name}
                  onChange={(e) => setNewArtist({ ...newArtist, artist_name: e.target.value })}
                  placeholder="e.g. The Weeknd"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
                <Input
                  value={newArtist.genre}
                  onChange={(e) => setNewArtist({ ...newArtist, genre: e.target.value })}
                  placeholder="e.g. R&B"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Biography</label>
              <Input
                value={newArtist.biography}
                onChange={(e) => setNewArtist({ ...newArtist, biography: e.target.value })}
                placeholder="Brief artist bio"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Interesting Facts</label>
              <Input
                value={newArtist.interesting_facts}
                onChange={(e) => setNewArtist({ ...newArtist, interesting_facts: e.target.value })}
                placeholder="Fun facts for on-air trivia"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Birthday</label>
                <Input
                  type="date"
                  value={newArtist.birthday}
                  onChange={(e) => setNewArtist({ ...newArtist, birthday: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Social Links</label>
                <Input
                  value={newArtist.social_links}
                  onChange={(e) => setNewArtist({ ...newArtist, social_links: e.target.value })}
                  placeholder="@handle or URLs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddArtist} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
                Add Artist
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArtists.map(artist => (
          <Card key={artist.id} className="glass-panel border-purple-500/20 hover:border-purple-500/50 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-purple-100">{artist.artist_name}</h3>
                  {artist.genre && (
                    <Badge variant="secondary" className="mt-1 text-xs bg-purple-500/10 text-purple-300">
                      {artist.genre}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleFavorite(artist.id, artist.is_favorite)}
                  className={artist.is_favorite ? 'text-yellow-500' : 'text-muted-foreground'}
                >
                  <Music className="w-4 h-4" />
                </Button>
              </div>
              {artist.biography && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{artist.biography}</p>
              )}
              {artist.birthday && (
                <p className="text-xs text-muted-foreground">
                  Birthday: {new Date(artist.birthday).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredArtists.length === 0 && (
        <div className="glass-panel p-12 text-center border-purple-500/20">
          <Music className="w-12 h-12 text-purple-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-purple-100">No Artists Found</h3>
          <p className="text-muted-foreground">Add artists to build your library</p>
        </div>
      )}
    </div>
  );
}