import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Pause, Check, Volume2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ElevenLabsVoicePicker({ open, onClose, onSelect }) {
  const [voices, setVoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [playingUrl, setPlayingUrl] = useState(null);
  const [audio, setAudio] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setError('');
    base44.functions.invoke('listElevenLabsVoices', {})
      .then(res => setVoices(res.data?.voices || []))
      .catch(err => setError(err.message || 'Failed to load voices'))
      .finally(() => setIsLoading(false));
  }, [open]);

  useEffect(() => {
    return () => { if (audio) audio.pause(); };
  }, [audio]);

  const togglePlay = (url) => {
    if (audio) {
      audio.pause();
      if (playingUrl === url) {
        setPlayingUrl(null);
        return;
      }
    }
    const newAudio = new Audio(url);
    newAudio.play();
    newAudio.onended = () => setPlayingUrl(null);
    setAudio(newAudio);
    setPlayingUrl(url);
  };

  const filtered = voices.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-berna-purple" />
            ElevenLabs Voice Library
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search voices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white/[0.03] border-white/[0.08] pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No voices found</p>
          ) : (
            filtered.map(voice => (
              <div key={voice.voice_id}
                className="flex items-center gap-3 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                <button onClick={() => voice.preview_url && togglePlay(voice.preview_url)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] disabled:opacity-30"
                  disabled={!voice.preview_url}>
                  {playingUrl === voice.preview_url ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{voice.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {voice.category || 'custom'}
                    {voice.labels?.gender && ` · ${voice.labels.gender}`}
                    {voice.labels?.accent && ` · ${voice.labels.accent}`}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => { onSelect(voice); onClose(); }}>
                  <Check className="w-3 h-3 mr-1" /> Select
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}