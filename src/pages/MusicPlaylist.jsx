import React, { useState } from 'react';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatRuntime } from '@/lib/musicConstants';
import { Loader2, Lock, Unlock, ArrowUp, ArrowDown, Trash2, Music, RefreshCw } from 'lucide-react';

export default function MusicPlaylist() {
  const { config, playlist, loading, refresh } = useMusicProduction();
  const [regenerating, setRegenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [noteText, setNoteText] = useState('');

  const handleToggleLock = async (song) => {
    await base44.entities.PlaylistItem.update(song.id, {
      status: song.status === 'locked' ? 'suggested' : 'locked'
    });
    refresh();
  };

  const handleRemove = async (song) => {
    await base44.entities.PlaylistItem.update(song.id, { status: 'removed' });
    refresh();
  };

  const handleMove = async (song, direction) => {
    const idx = playlist.findIndex(s => s.id === song.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= playlist.length) return;
    const swapSong = playlist[swapIdx];
    await base44.entities.PlaylistItem.update(song.id, { order: swapSong.order });
    await base44.entities.PlaylistItem.update(swapSong.id, { order: song.order });
    refresh();
  };

  const handleSaveNote = async (song) => {
    await base44.entities.PlaylistItem.update(song.id, { note: noteText });
    setEditingId(null);
    refresh();
  };

  const handleRegenerate = async () => {
    if (!config?.id) return;
    setRegenerating(true);
    try {
      await base44.functions.invoke('buildMusicProduction', { configuration_id: config.id });
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const activePlaylist = playlist.filter(s => s.status !== 'removed');
  const totalSeconds = activePlaylist.reduce((sum, s) => sum + (s.length_seconds || 0), 0);
  const requiredSeconds = (config?.required_music_runtime || 0) * 60;
  const remaining = requiredSeconds - totalSeconds;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Music className="w-6 h-6 text-primary" /> Playlist Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">{config?.production_name || 'Music Production'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Regenerate Playlist
        </Button>
      </div>

      {/* Runtime Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Songs</p>
          <p className="text-xl font-heading font-bold">{activePlaylist.length}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Playlist Runtime</p>
          <p className="text-xl font-heading font-bold">{formatRuntime(totalSeconds)}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">Required Runtime</p>
          <p className="text-xl font-heading font-bold text-primary">{formatRuntime(requiredSeconds)}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-1">{remaining >= 0 ? 'Remaining' : 'Overage'}</p>
          <p className={`text-xl font-heading font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
            {formatRuntime(Math.abs(remaining))}
          </p>
        </div>
      </div>

      {/* Playlist Table */}
      {activePlaylist.length > 0 ? (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Song</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Artist</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Length</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Genre</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Mood</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activePlaylist.map((song, i) => (
                  <React.Fragment key={song.id}>
                    <tr className="border-b border-border/50 hover:bg-white/5">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-medium">{song.song_title}</td>
                      <td className="p-3 text-muted-foreground">{song.artist}</td>
                      <td className="p-3">{formatRuntime(song.length_seconds)}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{song.genre}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{song.mood}</td>
                      <td className="p-3 text-center">
                        {song.status === 'locked' && <Lock className="w-4 h-4 text-primary mx-auto" />}
                        {song.status === 'suggested' && <div className="w-2 h-2 rounded-full bg-muted-foreground/40 mx-auto" />}
                        {song.status === 'approved' && <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto" />}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMove(song, 'up')} disabled={i === 0}>
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMove(song, 'down')} disabled={i === activePlaylist.length - 1}>
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleLock(song)}>
                            {song.status === 'locked' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(editingId === song.id ? null : song.id); setNoteText(song.note || ''); }}>
                            <Music className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemove(song)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {editingId === song.id && (
                      <tr className="bg-white/5">
                        <td colSpan={8} className="p-3">
                          <div className="flex gap-2">
                            <Textarea
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              placeholder="Add a note for this song..."
                              rows={2}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleSaveNote(song)}>Save</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <Music className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No playlist has been generated yet. Generate your playlist plan now.</p>
          <Button onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Generate Playlist
          </Button>
        </div>
      )}
    </div>
  );
}