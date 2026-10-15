import React, { useState } from 'react';
import { Loader2, Volume2, Square } from 'lucide-react';
import { useHumanVoice } from '@/hooks/useHumanVoice';

export default function RundownVoiceoverControls({
  item,
  script: scriptOverride,
}) {
  const [error, setError] = useState(null);
  const humanVoice = useHumanVoice();
  const script = scriptOverride || item?.script_content || item?.notes || item?.title || '';
  const itemId = item?.id || 'rundown-preview';
  const speaking = humanVoice.speakingId === itemId;
  const busy = humanVoice.status === 'loading' || humanVoice.status === 'generating';

  const handleVoice = async () => {
    if (!script) return;
    setError(null);

    if (speaking) {
      humanVoice.stop();
      return;
    }

    try {
      await humanVoice.speak(String(script).slice(0, 5000), itemId);
    } catch (err) {
      setError(err?.message || 'Human voice preview failed');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        type="button"
        onClick={handleVoice}
        disabled={busy && !speaking}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50"
        style={{
          background: speaking ? 'rgba(0,255,136,0.14)' : 'rgba(0,255,136,0.08)',
          borderColor: speaking ? 'rgba(0,255,136,0.45)' : 'rgba(0,255,136,0.25)',
        }}
        title="Free local neural voice preview. No paid TTS service is used."
      >
        {busy && !speaking ? (
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
        ) : speaking ? (
          <Square className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
          {busy && !speaking
            ? humanVoice.status === 'loading'
              ? `Human Voice ${humanVoice.progress || 0}%`
              : 'Generating…'
            : speaking
              ? 'Stop Voice'
              : 'Human Voice'}
        </span>
      </button>

      {(error || humanVoice.error) && (
        <span className="text-[10px] text-red-400 max-w-[180px] truncate" title={error || humanVoice.error}>
          {error || humanVoice.error}
        </span>
      )}
    </div>
  );
}
