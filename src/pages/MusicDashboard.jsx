import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Music, Clock, CheckCircle, TrendingUp, Star, Sparkles,
  CalendarDays, Radio, Mic, Disc, Headphones, Play,
  Lock, Unlock, Shuffle, ListMusic, BarChart3, Download,
  Search, FileText, ArrowRight, HelpCircle, ImageIcon, Share2, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import ProductionProfileBadge from '@/components/production/ProductionProfileBadge';

export default function MusicDashboard() {
  const [playlist, setPlaylist] = useState([]);
  const [songs, setSongs] = useState([]);
  const [showInfo, setShowInfo] = useState(null);
  const [recentPackages, setRecentPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => {
    const storedProfile = sessionStorage.getItem('activeProductionProfile');
    if (storedProfile) {
      setActiveProfile(JSON.parse(storedProfile));
    }

    Promise.all([
      base44.entities.ProductionItem.filter({ item_type: 'song', status: 'selected' }, '-order', 20),
      base44.entities.ProductionItem.filter({ item_type: 'song' }, '-created_date', 50),
      base44.entities.ProductionPackage.list('-created_date', 5),
    ]).then(([selected, all, pkgs]) => {
      setPlaylist(selected);
      setSongs(all);
      setRecentPackages(pkgs);
    }).finally(() => setLoading(false));
  }, []);

  const totalRuntime = playlist.reduce((acc, song) => {
    const duration = song.duration || '0:00';
    const [mins, secs] = duration.split(':').map(Number);
    return acc + (mins * 60) + secs;
  }, 0);

  const formatRuntime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const musicRuntime = formatRuntime(totalRuntime);
  const lockedCount = playlist.filter(s => s.metadata?.locked).length;

  const newReleases = songs.filter(s => s.metadata?.is_new_release).slice(0, 5);
  const trendingSongs = songs.filter(s => (s.metadata?.trend_score || 0) >= 4).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel glow-purple p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-500/10 to-transparent rounded-full -mr-20 -mt-20" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <ProductionProfileBadge profileType="music_show" size="lg" />
            <div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-white">
                Music Show <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Dashboard</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {showInfo ? `${showInfo.show_name} • ${showInfo.station_name}` : 'Configure your show in Production Setup'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/workspace">
              <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
                <Music className="w-4 h-4 mr-2" />
                Open Playlist Builder
              </Button>
            </Link>
            <Link to="/research">
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
                <Search className="w-4 h-4 mr-2" />
                Music Research
              </Button>
            </Link>
            <Link to="/select-production-type">
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
                Change Production Type
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Today's Playlist, Show Clock, Music Research */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Today's Playlist */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white neon-underline flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-pink-500" />
              Today's Playlist
            </h2>
            <Link to="/queue" className="text-[10px] text-pink-500 hover:text-pink-400">View All</Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Disc className="w-3 h-3 text-pink-500" />
                <span className="text-[10px] text-muted-foreground uppercase">Total Songs</span>
              </div>
              <p className="text-2xl font-bold text-white">{playlist.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-rose-500/10 to-orange-500/10 border border-rose-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-rose-500" />
                <span className="text-[10px] text-muted-foreground uppercase">Total Runtime</span>
              </div>
              <p className="text-2xl font-bold text-white">{musicRuntime}</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-muted-foreground uppercase">Locked Songs</span>
              </div>
              <p className="text-2xl font-bold text-white">{lockedCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground uppercase">Status</span>
              </div>
              <p className="text-sm font-bold text-white">{playlist.length > 0 ? 'In Progress' : 'Empty'}</p>
            </div>
          </div>

          {playlist.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {playlist.slice(0, 5).map((song, i) => (
                <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] font-mono text-pink-500 w-4">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{song.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{song.category || song.metadata?.artist}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{song.duration || '--:--'}</span>
                  {song.metadata?.locked && <Lock className="w-3 h-3 text-blue-400" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No songs in playlist. Add songs from the Item Queue.</p>
          )}
        </div>

        {/* Show Clock */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white neon-underline flex items-center gap-2">
            <Clock className="w-4 h-4 text-pink-500" />
            Show Clock
          </h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase">Total Show Length</span>
                <Clock className="w-3 h-3 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-white mt-1">60:00</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <p className="text-[9px] text-muted-foreground uppercase">Music</p>
                <p className="text-lg font-bold text-pink-400">{musicRuntime}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-[9px] text-muted-foreground uppercase">Talk</p>
                <p className="text-lg font-bold text-blue-400">10:00</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-[9px] text-muted-foreground uppercase">Commercial</p>
                <p className="text-lg font-bold text-orange-400">5:00</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[9px] text-muted-foreground uppercase">Remaining</p>
                <p className="text-lg font-bold text-emerald-400">45:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Music Research */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white neon-underline flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-500" />
            Music Research
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pink-500" />
                New Releases
              </p>
              {newReleases.length > 0 ? (
                <div className="space-y-1.5">
                  {newReleases.map(song => (
                    <Link key={song.id} to={`/story/${song.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                      <Star className="w-3 h-3 text-pink-500 fill-pink-500 flex-shrink-0" />
                      <span className="text-xs text-white/80 group-hover:text-white truncate">{song.title}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No new releases yet.</p>
              )}
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-rose-500" />
                Trending Songs
              </p>
              {trendingSongs.length > 0 ? (
                <div className="space-y-1.5">
                  {trendingSongs.map(song => (
                    <Link key={song.id} to={`/story/${song.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                      <TrendingUp className="w-3 h-3 text-rose-500 flex-shrink-0" />
                      <span className="text-xs text-white/80 group-hover:text-white truncate">{song.title}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No trending songs yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Production Progress & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Production Progress */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white neon-underline flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-pink-500" />
            Production Progress
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Playlist', icon: ListMusic, status: playlist.length > 0 ? 'complete' : 'pending' },
              { label: 'Host Script', icon: FileText, status: 'pending' },
              { label: 'Transitions', icon: ArrowRight, status: 'pending' },
              { label: 'Trivia', icon: HelpCircle, status: 'pending' },
              { label: 'Sponsor Reads', icon: Mic, status: 'pending' },
              { label: 'Graphics', icon: ImageIcon, status: 'pending' },
              { label: 'Social Package', icon: Share2, status: 'pending' },
              { label: 'Thumbnail', icon: ImageIcon, status: 'pending' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <item.icon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-white/80">{item.label}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  item.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Studio Quick Actions */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white neon-underline flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500" />
            AI Studio
          </h2>
          <div className="space-y-2">
            {[
              { icon: ListMusic, label: 'Generate Playlist', path: '/workspace' },
              { icon: Mic, label: 'Generate Host Banter', path: '/workspace' },
              { icon: Star, label: 'Generate Artist Facts', path: '/research' },
              { icon: ArrowRight, label: 'Generate Transitions', path: '/workspace' },
              { icon: Share2, label: 'Generate Social Package', path: '/export' },
              { icon: ImageIcon, label: 'Generate Thumbnail', path: '/images' },
            ].map(action => (
              <Link
                key={action.label}
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
              >
                <action.icon className="w-4 h-4 text-pink-500" />
                <span className="text-sm text-white/80 group-hover:text-white">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Productions */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white neon-underline flex items-center gap-2">
              <Package className="w-4 h-4 text-pink-500" />
              Recent Productions
            </h2>
            <Link to="/production" className="text-[10px] text-pink-500 hover:text-pink-400">View All</Link>
          </div>
          {recentPackages.length > 0 ? (
            <div className="space-y-2">
              {recentPackages.slice(0, 4).map(pkg => (
                <Link key={pkg.id} to="/production" className="block p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-all">
                  <p className="text-xs text-white font-medium line-clamp-1 mb-2">{pkg.story_summary || 'Untitled Package'}</p>
                  <div className="flex items-center gap-2">
                    <Music className="w-3 h-3 text-pink-500" />
                    <span className="text-[10px] text-muted-foreground">{pkg.status?.replace(/_/g, ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No productions yet. Generate from Production page.</p>
          )}
        </div>
      </div>
    </div>
  );
}