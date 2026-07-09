import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Search, Music, Download, Play, ShieldCheck, ShieldAlert,
  Disc3, Activity, Database, Library, Filter, Clock, Heart, Plus
} from 'lucide-react';

const SEARCH_TYPES = [
  { id: 'all', label: 'All', icon: Music },
  { id: 'playable', label: 'Playable Audio', icon: Play },
  { id: 'metadata', label: 'Metadata Only', icon: Database },
  { id: 'sound_effects', label: 'Sound Effects', icon: Activity },
];

const LICENSE_COLORS = {
  public_domain: 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10',
  creative_commons: 'text-cyan-400 border-cyan-400/30 bg-cyan-500/10',
  royalty_free: 'text-purple-400 border-purple-400/30 bg-purple-500/10',
  unknown: 'text-gray-400 border-gray-400/30 bg-gray-500/10',
};

export default function MusicLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [providerLogs, setProviderLogs] = useState([]);
  const [libraryEntries, setLibraryEntries] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');
  const [importing, setImporting] = useState(null);
  const [libraryFilter, setLibraryFilter] = useState('');

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const res = await base44.functions.invoke('musicConnectors', {
        action: 'browse_music_library',
        payload: { limit: 50, query: libraryFilter || undefined },
      });
      setLibraryEntries(res.data?.results || []);
    } catch (err) {
      console.error('Library load failed:', err);
    } finally {
      setLoadingLibrary(false);
    }
  }, [libraryFilter]);

  useEffect(() => {
    if (activeTab === 'library') loadLibrary();
  }, [activeTab, loadLibrary]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await base44.functions.invoke('musicConnectors', {
        action: 'search_music',
        payload: { query: searchQuery, search_type: searchType, limit: 5 },
      });
      setSearchResults(res.data?.results || []);
      setProviderLogs(res.data?.provider_logs || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (asset) => {
    setImporting(asset.provider_asset_id);
    try {
      await base44.functions.invoke('musicConnectors', {
        action: 'import_to_music_library',
        payload: { asset_data: asset },
      });
      setSearchResults(prev => prev.map(r =>
        r.provider_asset_id === asset.provider_asset_id
          ? { ...r, already_imported: true }
          : r
      ));
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(null);
    }
  };

  const handleToggleFavorite = async (entry) => {
    await base44.entities.MusicLibraryEntry.update(entry.id, { is_favorite: !entry.is_favorite });
    loadLibrary();
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Disc3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Music Library</h1>
          <p className="text-sm text-muted-foreground">Discover, import, and manage music assets across all providers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {[
          { id: 'discover', label: 'Discover', icon: Search },
          { id: 'library', label: 'My Library', icon: Library },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Discover Tab */}
      {activeTab === 'discover' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search for music, artists, songs, sound effects..."
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              Search
            </Button>
          </div>

          {/* Search type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="w-3 h-3" /> Type:</span>
            {SEARCH_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSearchType(type.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  searchType === type.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <type.icon className="w-3 h-3" />
                {type.label}
              </button>
            ))}
          </div>

          {/* Provider logs */}
          {providerLogs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {providerLogs.map((log, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={
                    log.status === 'success' ? 'border-emerald-400/30 text-emerald-400' :
                    log.status === 'failed' ? 'border-red-400/30 text-red-400' :
                    'border-gray-400/30 text-gray-400'
                  }
                >
                  {log.provider}: {log.status === 'success' ? `${log.count} results` : log.status}
                </Badge>
              ))}
            </div>
          )}

          {/* Results */}
          {searching && (
            <div className="glass-panel p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Querying music providers in priority order...</p>
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((asset, i) => (
                <MusicResultCard
                  key={`${asset.provider}-${asset.provider_asset_id}-${i}`}
                  asset={asset}
                  onImport={() => handleImport(asset)}
                  importing={importing === asset.provider_asset_id}
                />
              ))}
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery && (
            <div className="glass-panel p-8 text-center">
              <Music className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No results found. Try a different query.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Library Tab */}
      {activeTab === 'library' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={libraryFilter}
              onChange={e => setLibraryFilter(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadLibrary()}
              placeholder="Filter library by title, artist, album..."
              className="flex-1"
            />
            <Button variant="outline" onClick={loadLibrary} disabled={loadingLibrary}>
              {loadingLibrary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {loadingLibrary ? (
            <div className="glass-panel p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your music library...</p>
            </div>
          ) : libraryEntries.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <Library className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-4">Your music library is empty.</p>
              <Button onClick={() => setActiveTab('discover')}>
                <Search className="w-4 h-4 mr-1.5" />
                Discover Music
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{libraryEntries.length} assets in your library</p>
              {libraryEntries.map((entry, i) => (
                <LibraryEntryCard
                  key={entry.id}
                  entry={entry}
                  onToggleFavorite={() => handleToggleFavorite(entry)}
                  index={i}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function MusicResultCard({ asset, onImport, importing }) {
  const licClass = LICENSE_COLORS[asset.license_type] || LICENSE_COLORS.unknown;
  const isPlayable = asset.playback_allowed && asset.playback_url;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel p-4 flex items-center gap-4"
    >
      {/* Artwork / Play indicator */}
      <div className="relative w-14 h-14 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {asset.artwork_url ? (
          <img src={asset.artwork_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music className="w-5 h-5 text-muted-foreground" />
        )}
        {isPlayable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{asset.title}</p>
        <p className="text-xs text-muted-foreground truncate">{asset.artist}{asset.album ? ` — ${asset.album}` : ''}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">{asset.provider}</Badge>
          <Badge variant="outline" className={`text-xs ${licClass}`}>{asset.license_type}</Badge>
          {asset.duration_seconds > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatDuration(asset.duration_seconds)}
            </span>
          )}
          {asset.playback_allowed ? (
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
              <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Playable
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">
              <ShieldAlert className="w-2.5 h-2.5 mr-0.5" /> Metadata Only
            </Badge>
          )}
          {asset.attribution_required && (
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">Attribution</Badge>
          )}
        </div>
      </div>

      {/* Import button */}
      <div className="flex-shrink-0">
        {asset.already_imported ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-400/30">
            <ShieldCheck className="w-3 h-3 mr-1" /> In Library
          </Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={onImport} disabled={importing}>
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Import
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function LibraryEntryCard({ entry, onToggleFavorite, index }) {
  const isPlayable = entry.playback_allowed && entry.playback_url;
  const licClass = LICENSE_COLORS[entry.license_type] || LICENSE_COLORS.unknown;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="glass-panel p-4 flex items-center gap-4"
    >
      <div className="relative w-14 h-14 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {entry.artwork_url ? (
          <img src={entry.artwork_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{entry.title}</p>
        <p className="text-xs text-muted-foreground truncate">{entry.artist}{entry.album ? ` — ${entry.album}` : ''}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">{entry.provider}</Badge>
          <Badge variant="outline" className={`text-xs ${licClass}`}>{entry.license_type}</Badge>
          {entry.genre && <Badge variant="outline" className="text-xs">{entry.genre}</Badge>}
          {entry.duration_seconds > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatDuration(entry.duration_seconds)}
            </span>
          )}
          {entry.license_review_status === 'approved' ? (
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
              <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Approved
            </Badge>
          ) : entry.license_review_status === 'pending' ? (
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">Pending Review</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isPlayable && entry.preview_url && (
          <audio controls src={entry.preview_url} className="h-8 w-32 md:w-40" />
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleFavorite}>
          <Heart className={`w-4 h-4 ${entry.is_favorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
        </Button>
      </div>
    </motion.div>
  );
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}