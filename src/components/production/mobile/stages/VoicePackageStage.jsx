import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Volume2, Loader2, Clock, FileText, AlignLeft, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VoicePackageStage({ pkg, handleGenerateVoice, generatingVoice }) {
  const [vp, setVp] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pkg?.voice_package_id) { setVp(null); return; }
    setLoading(true);
    base44.entities.VoicePackage.get(pkg.voice_package_id)
      .then(setVp)
      .catch(() => setVp(null))
      .finally(() => setLoading(false));
  }, [pkg?.voice_package_id]);

  const duration = vp?.total_duration_seconds || 0;
  let sentenceTimeline = null;
  let wordTimeline = null;
  try { sentenceTimeline = vp?.sentence_timeline ? JSON.parse(vp.sentence_timeline) : null; } catch { /* */ }
  try { wordTimeline = vp?.word_timeline ? JSON.parse(vp.word_timeline) : null; } catch { /* */ }

  return (
    <div className="space-y-3">
      <Button className="w-full bg-berna-purple/80 hover:bg-berna-purple text-white h-9" onClick={handleGenerateVoice} disabled={generatingVoice || !pkg}>
        {generatingVoice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Volume2 className="w-4 h-4 mr-2" />}
        {pkg?.voice_package_id || pkg?.generated_audio_url ? 'Regenerate Voice Package' : 'Generate Voice Package'}
      </Button>

      {pkg?.generated_audio_url && (
        <div className="glass-panel p-3">
          <audio src={pkg.generated_audio_url} controls className="w-full h-9" />
          {duration > 0 && (
            <div className="flex items-center gap-1 text-xs text-berna-emerald mt-1.5">
              <Clock className="w-3 h-3" />{fmtDuration(duration)}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-berna-purple animate-spin" /></div>
      )}

      {vp?.transcript && (
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-xs font-semibold text-white">Transcript</span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{vp.transcript}</p>
        </div>
      )}

      {vp?.timestamped_transcript && (
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-xs font-semibold text-white">Timestamped Transcript</span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">{vp.timestamped_transcript}</p>
        </div>
      )}

      {sentenceTimeline && (
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-xs font-semibold text-white">Sentence Timeline ({sentenceTimeline.length})</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {sentenceTimeline.slice(0, 10).map((s, i) => (
              <div key={i} className="text-[10px] flex gap-2">
                <span className="text-berna-emerald font-mono flex-shrink-0">{fmtDuration(s.start_time || 0)}</span>
                <span className="text-muted-foreground">{s.sentence_text}</span>
              </div>
            ))}
            {sentenceTimeline.length > 10 && <p className="text-[10px] text-muted-foreground">+{sentenceTimeline.length - 10} more...</p>}
          </div>
        </div>
      )}

      {wordTimeline && (
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-berna-purple" />
            <span className="text-xs font-semibold text-white">Word Timeline ({wordTimeline.length} words)</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Word-level timing available for caption sync and highlighting.</p>
        </div>
      )}

      {!pkg?.voice_package_id && !pkg?.generated_audio_url && !generatingVoice && (
        <div className="glass-panel p-6 text-center">
          <Volume2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No voice package generated yet.</p>
        </div>
      )}
    </div>
  );
}