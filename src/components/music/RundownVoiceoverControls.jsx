import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Crown, Loader2, Volume2, Square } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RundownVoiceoverControls({ item, isPro, onUpgradeNeeded, onAudioGenerated, script: scriptOverride }) {
  const [generating, setGenerating] = useState(false);
  const [generatingPro, setGeneratingPro] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const hasAudio = !!item.audio_url;
  const hasProAudio = item.audio_url && item.audio_provider === 'elevenlabs';
  const script = scriptOverride || item.script_content || item.notes || item.title || '';

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

  const handleGenerateVoice = async () => {
    if (!script) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.GenerateSpeech({
        text: script,
        voice: 'river',
      });
      const audioUrl = result?.url;
      if (audioUrl) {
        await base44.entities.ShowRundownItem.update(item.id, {
          audio_url: audioUrl,
          audio_provider: 'native',
        });
        onAudioGenerated?.(item.id, audioUrl);
      }
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleProGenerate = async () => {
    if (!isPro) {
      onUpgradeNeeded?.();
      return;
    }
    if (!script) return;

    setGeneratingPro(true);
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
      setGeneratingPro(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Audio playback — if any generated audio exists */}
      {hasAudio && (
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
              background: hasProAudio ? 'rgba(168,85,247,0.12)' : 'rgba(0,255,136,0.10)',
              borderColor: hasProAudio ? 'rgba(168,85,247,0.4)' : 'rgba(0,255,136,0.3)',
              boxShadow: hasProAudio ? '0 0 8px rgba(168,85,247,0.15)' : '0 0 8px rgba(0,255,136,0.1)',
            }}
          >
            {playing ? (
              <Pause className="w-3.5 h-3.5" style={{ color: hasProAudio ? '#c084fc' : '#00ff88' }} />
            ) : (
              <Play className="w-3.5 h-3.5" style={{ color: hasProAudio ? '#c084fc' : '#00ff88' }} />
            )}
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: hasProAudio ? '#c084fc' : '#00ff88' }}
            >
              {hasProAudio ? 'Pro' : 'Voice'}
            </span>
          </button>
        </>
      )}

      {/* Generate Voice button (default — uses GenerateSpeech) — shown when no audio yet */}
      {!hasAudio && (
        <button
          onClick={handleGenerateVoice}
          disabled={generating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all"
          style={{
            background: 'rgba(0,255,136,0.08)',
            borderColor: 'rgba(0,255,136,0.25)',
          }}
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            {generating ? 'Gen...' : 'Voice'}
          </span>
        </button>
      )}

      {/* Regenerate voice button — shown when audio exists */}
      {hasAudio && !hasProAudio && (
        <button
          onClick={handleGenerateVoice}
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

      {/* ElevenLabs Pro Generate Button — separate from default voice */}
      <button
        onClick={handleProGenerate}
        disabled={generatingPro}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all"
        style={{
          background: isPro ? 'rgba(168,85,247,0.10)' : 'rgba(100,100,100,0.08)',
          borderColor: isPro ? 'rgba(168,85,247,0.35)' : 'rgba(100,100,100,0.25)',
        }}
      >
        {generatingPro ? (
          <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
        ) : isPro ? (
          <Crown className="w-3.5 h-3.5 text-purple-400" />
        ) : (
          <Crown className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: isPro ? '#c084fc' : '#f59e0b' }}
        >
          {generatingPro ? '...' : 'Pro'}
        </span>
      </button>

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