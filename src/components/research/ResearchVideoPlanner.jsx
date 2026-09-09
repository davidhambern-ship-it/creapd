import React, { useMemo, useState } from 'react';
import { Film, Loader2, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';

function parsePayload(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function readAudioDuration(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('Generate the Kokoro voiceover before planning video.'));
      return;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.src = '';
    };

    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration);
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('CREAPD could not read the generated voiceover duration.'));
        return;
      }
      resolve(duration);
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error('CREAPD could not load the generated voiceover metadata.'));
    };

    audio.src = url;
  });
}

export default function ResearchVideoPlanner({ pkg, onMediaUpdate }) {
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState(null);
  const [showScenes, setShowScenes] = useState(false);

  const payload = useMemo(() => parsePayload(pkg?.source_payload), [pkg?.source_payload]);
  const plan = payload?.video_plan || null;
  const scenes = Array.isArray(plan?.scenes) ? plan.scenes : [];
  const canPlan = Boolean(pkg?.teleprompter_script && pkg?.generated_audio_url);

  const handlePlan = async () => {
    setPlanning(true);
    setError(null);
    try {
      const audioDurationSeconds = await readAudioDuration(pkg.generated_audio_url);
      const result = await creapdApi.post('/research/video-plan', {
        package_id: pkg.id,
        audio_duration_seconds: audioDurationSeconds,
      });

      if (!result?.package) throw new Error('Video planning returned no production package.');
      onMediaUpdate(result.package);
      setShowScenes(true);
    } catch (err) {
      console.error('[CREAPD VIDEO PLAN]', err);
      const message = err?.data?.diagnostic?.message || err?.data?.message || err?.message || 'Video planning failed.';
      setError(message);
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-berna-orange" />
          <span className="text-xs font-semibold text-white">Video Director</span>
          <span className="text-[9px] text-cyan-400">OWNED · PLAN v1</span>
        </div>
        {plan && (
          <span className="text-[9px] text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Plan Ready
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {plan ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-white/[0.02] border border-white/[0.04] p-2.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Scenes</p>
                <p className="text-lg font-semibold text-white">{plan.scene_count || scenes.length}</p>
              </div>
              <div className="rounded-md bg-white/[0.02] border border-white/[0.04] p-2.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Voice Timeline</p>
                <p className="text-lg font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-berna-orange" />
                  {formatDuration(plan.audio_duration_seconds)}
                </p>
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground/80">
              Timed against the actual saved Kokoro voiceover. This is the scene blueprint the final renderer will consume.
            </p>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowScenes(value => !value)}
              className="w-full h-7 text-[10px] border-white/10 text-white hover:bg-white/[0.04]"
            >
              {showScenes ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {showScenes ? 'Hide Scene Plan' : 'Review Scene Plan'}
            </Button>

            {showScenes && (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {scenes.map((scene, index) => (
                  <div key={scene.scene_id || index} className="rounded-md bg-white/[0.02] border border-white/[0.04] p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[10px] font-semibold text-white">
                        {index + 1}. {scene.title || `Scene ${index + 1}`}
                      </p>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                        {formatDuration(scene.start_time)}–{formatDuration(scene.end_time)}
                      </span>
                    </div>
                    <p className="text-[9px] text-berna-orange mb-1 uppercase tracking-wider">
                      {(scene.beat_type || 'scene').replace(/_/g, ' ')} · {(scene.visual_type || 'visual').replace(/_/g, ' ')}
                    </p>
                    {scene.text_overlay && (
                      <p className="text-[10px] text-white/90 mb-1">On-screen: “{scene.text_overlay}”</p>
                    )}
                    <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3">
                      {scene.background_prompt || scene.broll_suggestion || scene.visual_theme || 'Visual direction pending.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-4 text-center space-y-2">
            <Film className="w-7 h-7 text-muted-foreground mx-auto" />
            <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
              {canPlan
                ? 'Build a timed scene plan from the teleprompter, visual guidance, B-roll suggestions, and the actual Kokoro voiceover duration.'
                : 'Generate the teleprompter script and Kokoro voiceover first. The voice clip becomes the master timeline for video.'}
            </p>
          </div>
        )}

        <Button
          size="sm"
          onClick={handlePlan}
          disabled={planning || !canPlan}
          className="bg-berna-orange/90 hover:bg-berna-orange text-white text-xs h-8 w-full"
        >
          {planning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Film className="w-3 h-3 mr-1" />}
          {planning ? 'Directing Scenes...' : plan ? 'Regenerate Video Plan' : 'Build Video Plan'}
        </Button>

        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>
    </div>
  );
}
