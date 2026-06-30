import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, Filter, Check, ExternalLink, Music, Radio
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ProductionProfileBadge from '@/components/production/ProductionProfileBadge';

export default function MusicResearchCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeProfile, setActiveProfile] = useState(null);
  const [researchModules, setResearchModules] = useState([]);
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongs, setSelectedSongs] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');

  useEffect(() => {
    loadMusicData();
  }, []);

  const loadMusicData = async () => {
    try {
      const stored = sessionStorage.getItem('activeProductionProfile');
      if (!stored) {
        navigate('/select-production-type');
        return;
      }
      
      const profile = JSON.parse(stored);
      setActiveProfile(profile);

      const modules = await base44.entities.ResearchModule.filter({
        profile_type: profile.type,
        is_active: true
      });
      setResearchModules(modules);

      const productionItems = await base44.entities.ProductionItem.filter({
        production_profile_type: profile.type,
        item_type: 'song'
      }, '-created_date', 50);
      setSongs(productionItems);
    } catch (error) {
      console.error('Error loading music research:', error);
      toast({
        title: 'Error',
        description: 'Failed to load music data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSong = async () => {
    if (!importUrl.trim()) return;
    
    setIsImporting(true);
    try {
      const response = await base44.functions.invoke('importStory', { url: importUrl });
      
      if (response.data.success) {
        await base44.entities.ProductionItem.create({
          title: response.data.title || 'Imported Song',
          item_type: 'song',
          production_profile_id: activeProfile.id,
          production_profile_type: activeProfile.type,
          source: 'manual_import',
          source_url: importUrl,
          summary: response.data.summary || '',
          content: response.data.content || '',
          status: 'new'
        });

        toast({
          title: 'Song Imported',
          description: 'Added to your research'
        });

        setImportUrl('');
        loadMusicData();
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectSong = (songId) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const handleAddToPlaylist = async () => {
    if (selectedSongs.size === 0) {
      toast({
        title: 'No Songs Selected',
        description: 'Select songs to add to playlist',
        variant: 'destructive'
      });
      return;
    }

    try {
      const productions = await base44.entities.Production.filter({}, '-created_date', 1);
      let production;
      
      if (productions.length > 0) {
        production = productions[0];
      } else {
        production = await base44.entities.Production.create({
          title: `Music Show - ${new Date().toLocaleDateString()}`,
          brand_profile_id: null,
          show_profile_id: null,
          production_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          story_order: JSON.stringify([]),
          owner_name: 'Current User'
        });
      }

      const selectedIds = Array.from(selectedSongs);
      await Promise.all(
        selectedIds.map(id => 
          base44.entities.ProductionItem.update(id, {
            is_selected: true,
            selected_for_production_id: production.id,
            status: 'selected'
          })
        )
      );

      toast({
        title: 'Added to Playlist',
        description: `${selectedSongs.size} songs added`
      });

      setSelectedSongs(new Set());
      navigate('/workspace');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add songs to playlist',
        variant: 'destructive'
      });
    }
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.summary && song.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
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
              Music Research
            </h1>
            {activeProfile && <ProductionProfileBadge profileType={activeProfile.type} />}
          </div>
          <p className="text-muted-foreground">
            Discover new releases, trending songs, and artist content
          </p>
        </div>
        <Button
          onClick={handleAddToPlaylist}
          disabled={selectedSongs.size === 0}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
        >
          <Check className="w-4 h-4 mr-2" />
          Add to Playlist ({selectedSongs.size})
        </Button>
      </div>

      {/* Quick Import */}
      <Card className="glass-panel border-pink-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-pink-400">
            <ExternalLink className="w-4 h-4" />
            Import Song from URL
          </CardTitle>
          <CardDescription>Add songs from Spotify, Apple Music, YouTube, or any music site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Paste Spotify, Apple Music, or YouTube URL..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImportSong()}
              className="border-pink-500/20 focus:border-pink-500/50"
            />
            <Button onClick={handleImportSong} disabled={isImporting}>
              {isImporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />Import
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Music Research Modules */}
      {researchModules.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-pink-400">
            <Music className="w-4 h-4" />
            Music Sources
          </h2>
          <div className="flex flex-wrap gap-2">
            {researchModules.map(module => (
              <Badge
                key={module.id}
                variant="outline"
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-pink-500/10 hover:border-pink-500/50 border-pink-500/20"
              >
                {module.module_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search songs, artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Songs Grid */}
      {filteredSongs.length === 0 ? (
        <div className="glass-panel p-12 text-center border-pink-500/20">
          <Music className="w-12 h-12 text-pink-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Songs Yet</h3>
          <p className="text-muted-foreground mb-4">
            Import songs or fetch from music research modules to get started
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/sources')}>
              <Radio className="w-4 h-4 mr-2" />
              Manage Music Sources
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map(song => (
            <Card
              key={song.id}
              className={`glass-panel cursor-pointer transition-all hover:scale-105 border-pink-500/20 hover:border-pink-500/50 ${
                selectedSongs.has(song.id) ? 'border-pink-500 ring-2 ring-pink-500/50' : ''
              }`}
              onClick={() => handleSelectSong(song.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2 text-pink-100">{song.title}</CardTitle>
                    {song.category && (
                      <Badge variant="secondary" className="mt-2 text-xs bg-pink-500/10 text-pink-300 border-pink-500/20">
                        {song.category}
                      </Badge>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    selectedSongs.has(song.id)
                      ? 'bg-pink-500 border-pink-500'
                      : 'border-pink-500/20'
                  }`}>
                    {selectedSongs.has(song.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </CardHeader>
              {song.summary && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {song.summary}
                  </p>
                  {song.source_url && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate">{song.source_url}</span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}