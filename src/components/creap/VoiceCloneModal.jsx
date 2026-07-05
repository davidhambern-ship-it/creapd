import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getClonedVoiceId, setClonedVoiceId, clearClonedVoice, hasClonedVoice } from '@/lib/clonedVoice';

const RECORDING_TIME_LIMIT = 120; // seconds

export default function VoiceCloneModal({ open, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | recorded | uploading | done | error
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasVoice, setHasVoice] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPhase('idle');
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setErrorMsg('');
      setHasVoice(hasClonedVoice());
    }
    return () => stopStream();
  }, [open]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Prefer mp4 (m4a) — ElevenLabs supports it natively; fall back to webm
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/mpeg')
          ? 'audio/mpeg'
          : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('recorded');
        stopStream();
      };

      recorder.start();
      setPhase('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= RECORDING_TIME_LIMIT) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setErrorMsg('Could not access microphone. Please allow microphone permissions and try again.');
      setPhase('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setPhase('idle');
    setRecordingTime(0);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    setPhase('uploading');
    setErrorMsg('');

    try {
      // Upload the recording
      const fileExt = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('mpeg') ? 'mp3' : 'webm';
      const file = new File([audioBlob], `voice-sample.${fileExt}`, { type: audioBlob.type });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      // Clone the voice via backend function
      const response = await base44.functions.invoke('cloneVoice', {
        audio_url: uploadResult.file_url,
      });

      if (response.data?.voice_id) {
        setClonedVoiceId(response.data.voice_id);
        setHasVoice(true);
        setPhase('done');
      } else {
        setErrorMsg(response.data?.error || 'Voice cloning failed. Please try again.');
        setPhase('error');
      }
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || 'Something went wrong during voice cloning.';
      setErrorMsg(detail);
      setPhase('error');
    }
  };

  const handleRemoveVoice = () => {
    clearClonedVoice();
    setHasVoice(false);
    setPhase('idle');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Mic className="w-4 h-4 text-primary" />
            Clone Your Voice
          </DialogTitle>
          <DialogDescription>
            Record a sample of your voice. CREAPD will use it for all narration throughout the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasVoice && phase !== 'done' && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-berna-emerald/10 border border-berna-emerald/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-berna-emerald" />
                <span className="text-xs text-berna-emerald font-medium">Custom voice is active</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleRemoveVoice}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove
              </Button>
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-berna-emerald/20 border-2 border-berna-emerald/40 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-berna-emerald" />
              </div>
              <p className="text-sm font-heading font-semibold text-white text-center">Voice cloned successfully!</p>
              <p className="text-xs text-muted-foreground text-center max-w-[300px]">
                CREAPD will now narrate using your voice. The guided tours and intro sequence will use it automatically.
              </p>
              <Button size="sm" className="mt-2" onClick={onClose}>Done</Button>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{errorMsg}</p>
            </div>
          )}

          {phase !== 'done' && phase !== 'error' && (
            <>
              {/* Recording UI */}
              {phase === 'idle' && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <button
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-purple hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Mic className="w-8 h-8 text-primary-foreground" />
                  </button>
                  <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                    Tap to start recording. Speak naturally for at least 30 seconds for best results.
                  </p>
                </div>
              )}

              {phase === 'recording' && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-destructive pulse-glow" />
                    </div>
                  </div>
                  <p className="text-2xl font-mono font-bold text-white">{formatTime(recordingTime)}</p>
                  <Button variant="outline" size="sm" onClick={stopRecording}>
                    <Square className="w-3 h-3 mr-1.5" /> Stop Recording
                  </Button>
                </div>
              )}

              {phase === 'recorded' && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <audio src={audioUrl} controls className="w-full" />
                  <p className="text-xs text-muted-foreground text-center">
                    Recording: {formatTime(recordingTime)}. Preview above, then clone your voice.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetRecording}>Re-record</Button>
                    <Button size="sm" onClick={handleUpload}>Clone Voice</Button>
                  </div>
                </div>
              )}

              {phase === 'uploading' && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cloning your voice…</p>
                  <p className="text-[10px] text-muted-foreground/60">This may take a few seconds.</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}