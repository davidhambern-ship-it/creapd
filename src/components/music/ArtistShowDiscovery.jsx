import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  ArrowLeft,
  CheckCircle2,
  CircleStop,
  Disc3,
  Headphones,
  Link2,
  Loader2,
  Mic2,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Volume2,
  X,
} from 'lucide-react';
import { creapdApi } from '@/api/creapdClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_PROFILE = {
  artist_name: '',
  public_name: '',
  bio_summary: '',
  artistic_message: '',
  interview_style: 'conversational',
  source_links: [],
};

function sourceTypeFromUrl(value) {
  const url = String(value || '').toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('spotify.com')) return 'spotify';
  return url ? 'link' : 'manual';
}

function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
}

function uploadContentType(blob) {
  const raw = String(blob?.type || '').split(';')[0].trim();
  if (raw) return raw;
  const name = String(blob?.name || '').toLowerCase();
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.m4a') || name.endsWith('.mp4')) return 'audio/mp4';
  if (name.endsWith('.ogg')) return 'audio/ogg';
  if (name.endsWith('.flac')) return 'audio/flac';
  return 'audio/webm';
}

function audioDuration(file) {
  if (!file) return Promise.resolve(null);
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const finish = value => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : null);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(Number(audio.duration));
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

async function uploadAudioBlob(blob, action, filename) {
  const contentType = uploadContentType(blob);
  const authorization = await creapdApi.post('/production/core', {
    action,
    filename,
    content_type: contentType,
    byte_size: blob.size,
  });

  if (!authorization?.upload_ticket || !authorization?.pathname) {
    throw new Error('CREAPD could not authorize this audio upload.');
  }

  const result = await upload(authorization.pathname, blob, {
    access: 'public',
    handleUploadUrl: '/api/creapd/production/core',
    clientPayload: JSON.stringify({ ticket: authorization.upload_ticket }),
    contentType,
    multipart: blob.size > 8 * 1024 * 1024,
  });

  if (!result?.url) throw new Error('CREAPD uploaded the audio but received no file URL.');
  return result.url;
}

function StageButton({ active, complete, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[130px] rounded-xl border px-3 py-3 text-left transition ${
        active
          ? 'border-fuchsia-400/40 bg-fuchsia-500/[0.10]'
          : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.045]'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-lg border ${
          active ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200' : 'border-white/10 bg-black/30 text-white/45'
        }`}>
          {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Icon className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Artist Show</p>
          <p className="text-xs font-semibold text-white">{label}</p>
        </div>
      </div>
    </button>
  );
}

function SourceLinksEditor({ links, onChange }) {
  const byType = Object.fromEntries((Array.isArray(links) ? links : []).map(item => [item.type, item.url]));
  const set = (type, url) => {
    const next = (Array.isArray(links) ? links : []).filter(item => item.type !== type);
    if (String(url || '').trim()) next.push({ type, url: String(url).trim() });
    onChange(next);
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        ['youtube', 'YouTube channel', 'https://youtube.com/@...'],
        ['soundcloud', 'SoundCloud', 'https://soundcloud.com/...'],
        ['spotify', 'Spotify artist', 'https://open.spotify.com/artist/...'],
      ].map(([type, label, placeholder]) => (
        <div key={type} className="space-y-1.5">
          <Label className="text-[10px] text-white/45">{label}</Label>
          <Input
            value={byType[type] || ''}
            onChange={event => set(type, event.target.value)}
            placeholder={placeholder}
            className="h-9 border-white/10 bg-black/35 text-xs text-white"
          />
        </div>
      ))}
    </div>
  );
}

export default function ArtistShowDiscovery({ open, onClose, onUseProfile }) {
  const [stage, setStage] = useState('identity');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [catalog, setCatalog] = useState([]);
  const [interview, setInterview] = useState(null);
  const [turns, setTurns] = useState([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [trackForm, setTrackForm] = useState({
    title: '',
    album: '',
    release_year: '',
    description: '',
    lyrics: '',
    source_url: '',
  });
  const [trackAudio, setTrackAudio] = useState(null);
  const [addingTrack, setAddingTrack] = useState(false);

  const [recording, setRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const finalTranscriptRef = useRef('');

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError('');
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_show_get',
      });
      setProfile(result?.profile ? {
        ...EMPTY_PROFILE,
        ...result.profile,
        source_links: Array.isArray(result.profile.source_links) ? result.profile.source_links : [],
      } : EMPTY_PROFILE);
      setCatalog(result?.catalog || []);
      setInterview(result?.interview || null);
      setTurns(result?.turns || []);
      setQuestion(result?.interview?.current_question || '');
      if (result?.interview?.status === 'active') setStage('interview');
    } catch (err) {
      setError(err?.message || 'CREAPD could not open Artist Show Discovery.');
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    if (recorderRef.current?.state === 'recording') {
      try { recorderRef.current.stop(); } catch {}
    }
    streamRef.current?.getTracks?.().forEach(track => track.stop());
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  }, [recordedUrl]);

  const profileComplete = Boolean(profile?.artist_name?.trim());
  const catalogComplete = catalog.length > 0;
  const interviewStarted = Boolean(interview?.id);

  const saveProfile = async () => {
    if (!profile.artist_name?.trim() || savingProfile) return;
    setSavingProfile(true);
    setError('');
    setNotice('');
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_profile_save',
        profile,
      });
      setProfile(current => ({ ...current, ...(result?.profile || {}) }));
      setNotice('Artist Profile saved. CREAPr can reuse this information for future Artist Shows.');
      setStage('catalog');
    } catch (err) {
      setError(err?.message || 'CREAPD could not save the Artist Profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const addTrack = async () => {
    if (!trackForm.title.trim() || addingTrack) return;
    setAddingTrack(true);
    setError('');
    setNotice('');
    try {
      let audioUrl = '';
      let durationSeconds = null;
      if (trackAudio) {
        durationSeconds = await audioDuration(trackAudio);
        audioUrl = await uploadAudioBlob(
          trackAudio,
          'artist_catalog_audio_upload_authorize',
          trackAudio.name || `artist-track-${Date.now()}.webm`,
        );
      }

      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_catalog_add',
        track: {
          profile_id: profile.id,
          ...trackForm,
          artist: profile.public_name || profile.artist_name,
          source_type: audioUrl ? 'upload' : sourceTypeFromUrl(trackForm.source_url),
          audio_url: audioUrl || null,
          metadata: durationSeconds ? { duration_seconds: durationSeconds } : {},
        },
      });

      setCatalog(current => [...current, result.track]);
      setTrackForm({ title: '', album: '', release_year: '', description: '', lyrics: '', source_url: '' });
      setTrackAudio(null);
      setNotice('Track added to the Artist Catalogue.');
    } catch (err) {
      setError(err?.message || 'CREAPD could not add this track.');
    } finally {
      setAddingTrack(false);
    }
  };

  const removeTrack = async track => {
    if (!track?.id) return;
    setError('');
    try {
      await creapdApi.post('/production/core', {
        action: 'music_artist_catalog_delete',
        track_id: track.id,
      });
      setCatalog(current => current.filter(item => item.id !== track.id));
    } catch (err) {
      setError(err?.message || 'CREAPD could not remove this track.');
    }
  };

  const speakQuestion = useCallback((textValue = question) => {
    const text = String(textValue || '').trim();
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [question]);

  const startInterview = async () => {
    if (!profile?.id) {
      setError('Save your Artist Profile first.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_interview_start',
        profile_id: profile.id,
        resume: true,
      });
      setInterview(result.interview);
      setTurns(result.turns || []);
      setQuestion(result.question || result.interview?.current_question || '');
      setStage('interview');
      window.setTimeout(() => speakQuestion(result.question || result.interview?.current_question || ''), 120);
    } catch (err) {
      setError(err?.message || 'CREAPr could not start the interview.');
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = useCallback(() => {
    setRecording(false);
    try { recognitionRef.current?.stop?.(); } catch {}
    recognitionRef.current = null;
    if (recorderRef.current?.state === 'recording') {
      try { recorderRef.current.stop(); } catch {}
    } else {
      streamRef.current?.getTracks?.().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const beginRecording = async () => {
    if (recording || recordingBusy) return;
    setRecordingBusy(true);
    setError('');
    setNotice('');
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl('');
    setAnswerText('');
    setInterimText('');
    finalTranscriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = event => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setAnswerText(current => current.trim() || finalTranscriptRef.current.trim());
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setRecordingBusy(false);
      };

      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = event => {
          let finalChunk = '';
          let interimChunk = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) finalChunk += transcript + ' ';
            else interimChunk += transcript;
          }
          if (finalChunk) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalChunk}`.trim();
            setAnswerText(finalTranscriptRef.current);
          }
          setInterimText(interimChunk.trim());
        };
        recognition.onerror = () => {
          // Recording continues even when browser speech recognition is unavailable.
        };
        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }

      recorder.start(500);
      setRecording(true);
      setRecordingBusy(false);
    } catch (err) {
      streamRef.current?.getTracks?.().forEach(track => track.stop());
      streamRef.current = null;
      setRecordingBusy(false);
      setError(err?.name === 'NotAllowedError'
        ? 'Microphone permission is required for the CREAPr interview.'
        : err?.message || 'CREAPD could not start your microphone.');
    }
  };

  const submitAnswer = async () => {
    if (!interview?.id || (!recordedBlob && !answerText.trim()) || submittingAnswer) return;
    setSubmittingAnswer(true);
    setError('');
    setNotice('');
    try {
      let audioUrl = '';
      if (recordedBlob) {
        const ext = uploadContentType(recordedBlob).includes('mp4') ? 'm4a' : uploadContentType(recordedBlob).includes('ogg') ? 'ogg' : 'webm';
        audioUrl = await uploadAudioBlob(
          recordedBlob,
          'artist_interview_audio_upload_authorize',
          `artist-interview-${Date.now()}.${ext}`,
        );
      }

      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_interview_answer',
        session_id: interview.id,
        question,
        answer_text: answerText.trim(),
        audio_url: audioUrl || null,
      });

      setTurns(current => [...current, result.turn]);
      setInterview(result.interview);
      setQuestion(result.question || '');
      setAnswerText('');
      setInterimText('');
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl('');
      setNotice('Answer saved. CREAPr used your interview and catalogue to choose the next question.');
      window.setTimeout(() => speakQuestion(result.question || ''), 120);
    } catch (err) {
      setError(err?.message || 'CREAPD could not save this interview answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const finishInterview = async () => {
    if (!interview?.id) return;
    setError('');
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_interview_finish',
        session_id: interview.id,
      });
      setInterview(result.interview);
      setQuestion('');
      setNotice('Interview saved. The recording and transcript are now part of your Artist Show source material.');
    } catch (err) {
      setError(err?.message || 'CREAPD could not finish the interview.');
    }
  };

  const speechRecognitionAvailable = typeof window !== 'undefined'
    && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const catalogSummary = useMemo(() => {
    const uploads = catalog.filter(track => track.audio_url).length;
    const links = catalog.filter(track => track.source_url).length;
    return `${catalog.length} track${catalog.length === 1 ? '' : 's'} · ${uploads} uploaded · ${links} linked`;
  }, [catalog]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#050609]/96 text-white backdrop-blur-xl">
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 md:px-6">
        <header className="sticky top-0 z-20 -mx-4 mb-5 border-b border-fuchsia-400/15 bg-[#050609]/94 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-white/60 hover:text-white"
                aria-label="Back to Radio Discovery Room"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10">
                <Disc3 className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300">Radio Discovery Room</p>
                <h1 className="truncate font-heading text-lg font-bold">Artist Show</h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 text-[10px] text-white/35 sm:flex">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Catalogue-aware CREAPr interview
            </div>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          <StageButton active={stage === 'identity'} complete={profileComplete} icon={UserRound} label="Artist Identity" onClick={() => setStage('identity')} />
          <StageButton active={stage === 'catalog'} complete={catalogComplete} icon={Music2} label="Catalogue" onClick={() => setStage('catalog')} />
          <StageButton active={stage === 'interview'} complete={interview?.status === 'complete'} icon={Mic2} label="CREAPr Interview" onClick={() => setStage('interview')} />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-100">{error}</div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] px-4 py-3 text-sm text-cyan-100">{notice}</div>
        )}

        {loading ? (
          <div className="grid min-h-[440px] place-items-center">
            <div className="text-center text-white/45">
              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-fuchsia-300" />
              Opening Artist Show Discovery…
            </div>
          </div>
        ) : (
          <>
            {stage === 'identity' && (
              <section className="rounded-2xl border border-fuchsia-400/15 bg-white/[0.025] p-5 md:p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Reusable Artist Profile</p>
                  <h2 className="mt-1 font-heading text-2xl font-bold">Who is CREAPr interviewing?</h2>
                  <p className="mt-2 max-w-3xl text-sm text-white/45">
                    This profile belongs to the artist, not one episode. CREAPD will reuse artist-approved information and catalogue knowledge across future Artist Shows.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/55">Artist / Stage Name *</Label>
                    <Input
                      value={profile.artist_name || ''}
                      onChange={event => setProfile(current => ({ ...current, artist_name: event.target.value }))}
                      placeholder="BERNA"
                      className="border-white/10 bg-black/35 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/55">Public Name</Label>
                    <Input
                      value={profile.public_name || ''}
                      onChange={event => setProfile(current => ({ ...current, public_name: event.target.value }))}
                      placeholder="How CREAPr should refer to you on-air"
                      className="border-white/10 bg-black/35 text-white"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/55">What should CREAPr already know about the artist?</Label>
                    <Textarea
                      value={profile.bio_summary || ''}
                      onChange={event => setProfile(current => ({ ...current, bio_summary: event.target.value }))}
                      placeholder="Short background. CREAPr will learn the rest through the interview."
                      className="min-h-[120px] border-white/10 bg-black/35 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/55">Artist message / creative point of view</Label>
                    <Textarea
                      value={profile.artistic_message || ''}
                      onChange={event => setProfile(current => ({ ...current, artistic_message: event.target.value }))}
                      placeholder="Optional. This gives CREAPr a starting claim it can explore or challenge against the catalogue."
                      className="min-h-[120px] border-white/10 bg-black/35 text-white"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.035] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="text-sm font-semibold">Share catalogue locations</p>
                      <p className="text-[10px] text-white/35">These give CREAPr context now and establish the sources we can expand into full catalogue connections.</p>
                    </div>
                  </div>
                  <SourceLinksEditor
                    links={profile.source_links}
                    onChange={source_links => setProfile(current => ({ ...current, source_links }))}
                  />
                </div>

                <div className="mt-5 flex justify-end">
                  <Button onClick={saveProfile} disabled={!profile.artist_name?.trim() || savingProfile} className="bg-fuchsia-600 hover:bg-fuchsia-500">
                    {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Artist Profile
                  </Button>
                </div>
              </section>
            )}

            {stage === 'catalog' && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
                <section className="rounded-2xl border border-fuchsia-400/15 bg-white/[0.025] p-5">
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Artist Catalogue</p>
                    <h2 className="mt-1 font-heading text-xl font-bold">Give CREAPr music to investigate.</h2>
                    <p className="mt-2 text-xs leading-relaxed text-white/40">
                      Add a track by upload or source link. Notes and lyrics help CREAPr recognize themes, contrasts and outliers without inventing what a song means.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Input value={trackForm.title} onChange={event => setTrackForm(current => ({ ...current, title: event.target.value }))} placeholder="Track title *" className="border-white/10 bg-black/35 text-white" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={trackForm.album} onChange={event => setTrackForm(current => ({ ...current, album: event.target.value }))} placeholder="Album / project" className="border-white/10 bg-black/35 text-white" />
                      <Input value={trackForm.release_year} onChange={event => setTrackForm(current => ({ ...current, release_year: event.target.value }))} placeholder="Release year" className="border-white/10 bg-black/35 text-white" />
                    </div>
                    <Input value={trackForm.source_url} onChange={event => setTrackForm(current => ({ ...current, source_url: event.target.value }))} placeholder="YouTube / SoundCloud / Spotify / other track link" className="border-white/10 bg-black/35 text-white" />
                    <Textarea value={trackForm.description} onChange={event => setTrackForm(current => ({ ...current, description: event.target.value }))} placeholder="Artist note: what CREAPr is allowed to know about this track (optional)" className="min-h-[90px] border-white/10 bg-black/35 text-white" />
                    <Textarea value={trackForm.lyrics} onChange={event => setTrackForm(current => ({ ...current, lyrics: event.target.value }))} placeholder="Lyrics (optional, but this lets CREAPr notice themes, contrasts and lyrical outliers)" className="min-h-[120px] border-white/10 bg-black/35 text-white" />

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-cyan-400/20 bg-cyan-500/[0.035] p-3 hover:bg-cyan-500/[0.06]">
                      <Upload className="h-4 w-4 text-cyan-300" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white">{trackAudio ? trackAudio.name : 'Upload the actual track'}</p>
                        <p className="text-[10px] text-white/30">MP3, WAV, M4A, FLAC, OGG or browser-supported audio</p>
                      </div>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={event => setTrackAudio(event.target.files?.[0] || null)}
                      />
                    </label>

                    <Button onClick={addTrack} disabled={!profile?.id || !trackForm.title.trim() || addingTrack} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500">
                      {addingTrack ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Add to Artist Catalogue
                    </Button>

                    {!profile?.id && <p className="text-[10px] text-amber-200/70">Save Artist Identity before adding tracks.</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-cyan-400/15 bg-white/[0.025] p-5">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">CREAPr Evidence Shelf</p>
                      <h2 className="mt-1 font-heading text-xl font-bold">{catalogSummary}</h2>
                    </div>
                    <Button variant="outline" size="sm" onClick={startInterview} disabled={!profile?.id || !catalog.length}>
                      <Mic2 className="mr-1.5 h-3.5 w-3.5" /> Interview Me
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {catalog.length ? catalog.map((track, index) => (
                      <div key={track.id} className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/[0.07]">
                            <Music2 className="h-4 w-4 text-fuchsia-300" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-white/25">{String(index + 1).padStart(2, '0')}</span>
                              <p className="truncate text-sm font-semibold">{track.title}</p>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-white/35">
                              {[track.album, track.release_year, track.source_type].filter(Boolean).join(' · ') || 'Artist supplied'}
                            </p>
                            {track.description && <p className="mt-2 line-clamp-2 text-[11px] text-white/45">{track.description}</p>}
                            <div className="mt-2 flex gap-2">
                              {track.audio_url && <audio src={track.audio_url} controls preload="none" className="h-8 max-w-[280px]" />}
                              {track.source_url && (
                                <a href={track.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] text-cyan-300 hover:text-cyan-200">
                                  <Link2 className="h-3 w-3" /> Source
                                </a>
                              )}
                            </div>
                          </div>
                          <button type="button" onClick={() => removeTrack(track)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 text-white/25 hover:border-red-400/30 hover:text-red-300">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-white/10 text-center">
                        <div className="max-w-xs px-6">
                          <Headphones className="mx-auto mb-3 h-8 w-8 text-white/15" />
                          <p className="text-sm font-semibold text-white/60">No tracks yet</p>
                          <p className="mt-1 text-xs text-white/30">The interview gets much smarter when CREAPr has actual catalogue evidence to work from.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {stage === 'interview' && (
              <section className="overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-[#080910]">
                <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1.25fr)_minmax(330px,.75fr)]">
                  <div className="relative flex flex-col border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(217,70,239,.12),transparent_40%),radial-gradient(circle_at_70%_70%,rgba(34,211,238,.08),transparent_45%)]" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">CREAPr Interview Room</p>
                        <p className="mt-1 text-xs text-white/35">{profile.public_name || profile.artist_name || 'Artist'} · {catalog.length} catalogue tracks available</p>
                      </div>
                      {interview?.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={finishInterview}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Finish Interview
                        </Button>
                      )}
                    </div>

                    {!interviewStarted ? (
                      <div className="relative z-10 flex flex-1 items-center justify-center">
                        <div className="max-w-lg text-center">
                          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 shadow-[0_0_40px_rgba(217,70,239,.12)]">
                            <Mic2 className="h-9 w-9 text-fuchsia-200" />
                          </div>
                          <h2 className="font-heading text-2xl font-bold">This is an actual interview.</h2>
                          <p className="mt-3 text-sm leading-relaxed text-white/45">
                            CREAPr asks aloud. You answer through your microphone. CREAPD records your original audio, keeps an editable transcript, and uses your answers plus your catalogue to decide what to ask next.
                          </p>
                          <Button onClick={startInterview} disabled={!profile?.id} className="mt-5 bg-fuchsia-600 hover:bg-fuchsia-500">
                            <Mic2 className="mr-2 h-4 w-4" /> Start CREAPr Interview
                          </Button>
                        </div>
                      </div>
                    ) : interview?.status === 'complete' ? (
                      <div className="relative z-10 flex flex-1 items-center justify-center">
                        <div className="max-w-lg text-center">
                          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-300" />
                          <h2 className="font-heading text-2xl font-bold">Interview saved.</h2>
                          <p className="mt-2 text-sm text-white/45">
                            {turns.length} recorded answer{turns.length === 1 ? '' : 's'} are now reusable Artist Show source material.
                          </p>
                          <Button
                            variant="outline"
                            className="mt-5"
                            onClick={() => onUseProfile?.({ profile, catalog, interview, turns })}
                          >
                            <Radio className="mr-2 h-4 w-4" /> Use for an Artist Show
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative z-10 mt-8 rounded-2xl border border-white/10 bg-black/35 p-5 md:p-7">
                          <div className="flex items-start gap-4">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-cyan-400/25 bg-cyan-500/10">
                              <Sparkles className="h-5 w-5 text-cyan-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">CREAPr asks</p>
                              <p className="mt-2 font-heading text-xl font-semibold leading-relaxed md:text-2xl">{question || 'Preparing the next question…'}</p>
                              <button type="button" onClick={() => speakQuestion()} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/40 hover:text-white">
                                <Volume2 className="h-3.5 w-3.5" /> Replay question aloud
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10 mt-5 flex-1 rounded-2xl border border-white/[0.07] bg-black/25 p-5">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Your answer</p>
                              <p className="mt-1 text-[10px] text-white/30">Your original recording is preserved. The transcript can be corrected before you send it.</p>
                            </div>
                            {recording && (
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-red-300">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> RECORDING
                              </div>
                            )}
                          </div>

                          {!speechRecognitionAvailable && (
                            <div className="mb-3 rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2 text-[10px] leading-relaxed text-amber-100/75">
                              Your browser can record the interview, but it is not exposing live speech transcription. After you speak, type or paste a quick transcript below so CREAPr can understand the answer and choose the next question.
                            </div>
                          )}

                          <Textarea
                            value={answerText + (interimText ? `${answerText ? ' ' : ''}${interimText}` : '')}
                            onChange={event => {
                              setAnswerText(event.target.value);
                              finalTranscriptRef.current = event.target.value;
                              setInterimText('');
                            }}
                            placeholder={recording ? 'Speak naturally. CREAPD will capture what your browser can transcribe here…' : 'Record your answer or type/correct the transcript here.'}
                            className="min-h-[150px] border-white/10 bg-black/45 text-base leading-relaxed text-white"
                          />

                          {recordedUrl && (
                            <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.035] p-3">
                              <p className="mb-2 text-[10px] font-semibold text-emerald-200">Recorded answer</p>
                              <audio src={recordedUrl} controls className="h-9 w-full" />
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex gap-2">
                              {!recording ? (
                                <Button onClick={beginRecording} disabled={recordingBusy || submittingAnswer} className="bg-red-600 hover:bg-red-500">
                                  {recordingBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic2 className="mr-2 h-4 w-4" />}
                                  Record Answer
                                </Button>
                              ) : (
                                <Button onClick={stopRecording} variant="outline" className="border-red-400/30 text-red-200 hover:bg-red-500/10">
                                  <CircleStop className="mr-2 h-4 w-4" /> Stop Recording
                                </Button>
                              )}
                            </div>

                            <Button
                              onClick={submitAnswer}
                              disabled={recording || submittingAnswer || !answerText.trim()}
                              className="bg-fuchsia-600 hover:bg-fuchsia-500"
                            >
                              {submittingAnswer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                              Save Answer & Ask Next
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <aside className="bg-black/20 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Headphones className="h-4 w-4 text-cyan-300" />
                      <div>
                        <p className="text-xs font-semibold">Interview Tape</p>
                        <p className="text-[9px] text-white/30">{turns.length} answer{turns.length === 1 ? '' : 's'} recorded</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[...turns].reverse().map(turn => (
                        <div key={turn.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-cyan-300">CREAPr</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/65">{turn.question}</p>
                          <p className="mt-3 text-[9px] font-semibold uppercase tracking-wider text-fuchsia-300">{profile.public_name || profile.artist_name || 'Artist'}</p>
                          <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-white/45">{turn.answer_text || 'Recorded audio answer'}</p>
                          {turn.audio_url && <audio src={turn.audio_url} controls preload="none" className="mt-2 h-8 w-full" />}
                        </div>
                      ))}

                      {!turns.length && interviewStarted && (
                        <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/25">
                          Your recorded answers will collect here.
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
