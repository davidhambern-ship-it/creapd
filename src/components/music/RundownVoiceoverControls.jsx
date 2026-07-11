import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Crown, Loader2, Volume2, Square } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RundownVoiceoverControls({ item, isPro, onUpgradeNeeded, onAudioGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const hasProAudio = item.audio_url && item.audio_provider === 'elevenlabs';
  const script = item.script_content || item.notes || item.title || '';

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleProGenerate = async () => {
    if (!isPro) {
      onUpgradeNeeded?.();
      return;
    }
    if (!script) return;

    setGenerating(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('generateCreapSpeech', {
        text: script,
        voice: 'daniel',
      });
      const audioUrl = response.data?.url;
      if (audioUrl) {
        await base44.entities.ShowRundownItem.update(item.id, {
          audio_url: audioUrl,
          audio_provider: 'elevenlabs',
        });
        onAudioGenerated?.(item.id, audioUrl);
      }
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Pro audio playback — only if ElevenLabs audio exists */}
      {hasProAudio && (
        <>
          <audio
            ref={audioRef}
            src={item.audio_url}
            onEnded={() => setPlaying(false)}
            preload="none"
          />
          <button
            onClick={togglePlayback}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all"
            style={{
              background: 'rgba(168,85,247,0.12)',
              borderColor: 'rgba(168,85,247,0.4)',
              boxShadow: '0 0 8px rgba(168,85,247,0.15)',
            }}
          >
            {playing ? (
              <Pause className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Pro</span>
          </button>
        </>
      )}

      {/* ElevenLabs Generate Button — visible to all, locked for free users */}
      {!hasProAudio && (
        <button
          onClick={handleProGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all relative group"
          style={{
            background: isPro ? 'rgba(168,85,247,0.10)' : 'rgba(100,100,100,0.08)',
            borderColor: isPro ? 'rgba(168,85,247,0.35)' : 'rgba(100,100,100,0.25)',
          }}
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          ) : isPro ? (
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <Crown className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: isPro ? '#c084fc' : '#f59e0b' }}
          >
            {generating ? 'Gen...' : isPro ? 'ElevenLabs' : 'Pro'}
          </span>
        </button>
      )}

      {/* Regenerate button if pro audio already exists */}
      {hasProAudio && isPro && (
        <button
          onClick={handleProGenerate}
          disabled={generating}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-all"
          style={{
            background: 'rgba(100,100,100,0.08)',
            borderColor: 'rgba(100,100,100,0.25)',
          }}
        >
          {generating ? (
            <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
          ) : (
            <Volume2 className="w-3 h-3 text-gray-400" />
          )}
        </button>
      )}

      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-red-400"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}