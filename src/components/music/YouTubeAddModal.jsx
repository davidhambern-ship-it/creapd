import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Loader2, Plus, Youtube, CheckCircle2 } from 'lucide-react';

export default function YouTubeAddModal({ open, onClose, onAdd, configurationId, targetType = 'playlist' }) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setError('');
    setMetadata(null);
    try {
      const response = await base44.functions.invoke('fetchYoutubeMetadata', { url: url.trim() });
      setMetadata(response.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not fetch video info. Check the URL and try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = async () => {
    if (!metadata || !configurationId) return;
    setSaving(true);
    try {
      await onAdd({
        configuration_id: configurationId,
        youtube_video_id: metadata.video_id,
        title: metadata.title,
        thumbnail_url: metadata.thumbnail_url,
        channel_name: metadata.channel_name,
      });
      // Reset and close
      setUrl('');
      setMetadata(null);
      setError('');
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setMetadata(null);
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="w-full max-w-lg cp-glass rounded-2xl overflow-hidden"
            style={{ borderColor: 'rgba(255,0,255,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Youtube className="w-5 h-5" style={{ color: '#FF0000' }} />
                <h3 className="text-lg font-bold text-white">
                  Add {targetType === 'top10' ? 'to Top 10' : 'Track to Playlist'}
                </h3>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={handleClose}>
                <X className="w-4 h-4 text-gray-400" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* URL input */}
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 mb-1.5 block">
                  Paste YouTube URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetch()}
                    placeholder="https://youtube.com/watch?v=... or youtu.be/..."
                    className="bg-black/40 border-[#FF00FF]/30 focus:border-[#FF00FF]/60 text-white placeholder:text-gray-600"
                  />
                  <Button
                    onClick={handleFetch}
                    disabled={fetching || !url.trim()}
                    className="cp-btn-gradient border-0 text-white shrink-0"
                  >
                    {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Tip: Find a song on YouTube, copy the URL from the address bar, and paste it here.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Metadata preview */}
              {metadata && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 p-3 rounded-xl bg-black/40 border border-[#00FFFF]/20"
                >
                  <img
                    src={metadata.thumbnail_url}
                    alt={metadata.title}
                    className="w-32 h-20 object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-2">{metadata.title}</p>
                      <p className="text-xs text-gray-400 truncate">{metadata.channel_name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#00FF88' }}>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready to add</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {metadata && (
              <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                <Button variant="ghost" onClick={handleClose} className="text-gray-400 hover:text-white">
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={saving}
                  className="cp-btn-gradient border-0 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
                  Add {targetType === 'top10' ? 'to Top 10' : 'Track'}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}