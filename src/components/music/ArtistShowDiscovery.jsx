import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  ArrowLeft,
  CheckCircle2,
  Disc3,
  Headphones,
  Link2,
  Loader2,
  Music2,
  Play,
  Plus,
  Radio,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
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
  source_links: [],
};

function normalizeSourceLinks(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  return [];
}

function normalizeMetadata(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {}
  }
  return {};
}

function formatTrackDuration(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  if (!seconds) return 'Unknown length';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function apiErrorMessage(err, fallback) {
  const diagnostic = err?.data?.diagnostic;
  const raw =
    diagnostic?.message ||
    err?.data?.message ||
    (typeof err?.data?.error === 'object'
      ? err.data.error?.message || err.data.error?.code
      : err?.data?.error) ||
    err?.message;

  const message = typeof raw === 'string' ? raw.trim() : '';
  if (!message || message === '[object Object]' || /^[A-Z0-9_]+$/.test(message)) {
    return fallback;
  }
  return message;
}

function sourceTypeFromUrl(value) {
  const url = String(value || '').toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('spotify.com')) return 'spotify';
  return url ? 'link' : 'manual';
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
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Music Catalogue</p>
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
  const [youtubeScan, setYoutubeScan] = useState([]);
  const [youtubeSelected, setYoutubeSelected] = useState(new Set());
  const [youtubeScanning, setYoutubeScanning] = useState(false);
  const [youtubeImporting, setYoutubeImporting] = useState(false);
  const [youtubeDiagnostics, setYoutubeDiagnostics] = useState(null);


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
        source_links: normalizeSourceLinks(result.profile.source_links),
      } : EMPTY_PROFILE);
      setCatalog(result?.catalog || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'CREAPD could not open your music catalogue.'));
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    load();
  }, [load]);

  const profileComplete = Boolean(profile?.artist_name?.trim());
  const catalogComplete = catalog.length > 0;

  const saveProfile = async () => {
    if (!profile.artist_name?.trim() || savingProfile) return;
    setSavingProfile(true);
    setError('');
    setNotice('');
    try {
      const submittedLinks = normalizeSourceLinks(profile.source_links);
      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_profile_save',
        profile: {
          ...profile,
          source_links: submittedLinks,
        },
      });

      const savedProfile = {
        ...profile,
        ...(result?.profile || {}),
        source_links: normalizeSourceLinks(result?.profile?.source_links ?? submittedLinks),
      };

      setProfile(savedProfile);
      setStage('catalog');

      const youtubeUrl = savedProfile.source_links.find(item => item?.type === 'youtube')?.url || '';
      if (youtubeUrl) {
        setNotice('Artist Profile saved. CREAPD is scanning the connected YouTube catalogue now…');
        window.setTimeout(() => {
          scanYoutube({
            profileId: savedProfile.id,
            channelUrl: youtubeUrl,
            automatic: true,
          });
        }, 0);
      } else {
        setNotice('Artist Profile saved. Add a YouTube channel URL if you want CREAPD to build the catalogue automatically.');
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'CREAPD could not save the Artist Profile.'));
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
      setError(apiErrorMessage(err, 'CREAPD could not add this track.'));
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
      setError(apiErrorMessage(err, 'CREAPD could not remove this track.'));
    }
  };

  const youtubeChannelUrl = useMemo(
    () => normalizeSourceLinks(profile?.source_links)
      .find(item => item?.type === 'youtube')?.url || '',
    [profile?.source_links],
  );

  const scanYoutube = async (options = {}) => {
    const channelUrl = options.channelUrl || youtubeChannelUrl;
    const profileId = options.profileId || profile?.id;
    if (!channelUrl || !profileId || youtubeScanning) return;
    setYoutubeScanning(true);
    setError('');
    setNotice(options.automatic ? 'Scanning your connected YouTube catalogue…' : '');
    setYoutubeDiagnostics(null);
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_youtube_scan',
        profile_id: profileId,
        channel_url: channelUrl,
        limit: 60,
      });
      const videos = result?.videos || [];
      setYoutubeScan(videos);
      setYoutubeDiagnostics(result?.diagnostics || null);
      setYoutubeSelected(new Set(
        videos.filter(video => video.likely_music).map(video => video.video_id),
      ));
      setNotice(
        videos.length
          ? `CREAPD found ${videos.length} YouTube candidate${videos.length === 1 ? '' : 's'} using ${String(result?.discovery_mode || 'channel').replaceAll('_', ' ')} discovery. Review the list and import only the tracks that belong in the artist catalogue.`
          : 'CREAPD did not find public uploads on that YouTube page.'
      );
    } catch (err) {
      setYoutubeDiagnostics(err?.data?.diagnostic?.details || null);
      setError(apiErrorMessage(err, 'CREAPD could not scan that YouTube channel.'));
    } finally {
      setYoutubeScanning(false);
    }
  };

  const importYoutube = async () => {
    if (!profile?.id || youtubeImporting || !youtubeSelected.size) return;
    setYoutubeImporting(true);
    setError('');
    setNotice('');
    try {
      const selected = youtubeScan.filter(video => youtubeSelected.has(video.video_id));
      const result = await creapdApi.post('/production/core', {
        action: 'music_artist_youtube_import',
        profile_id: profile.id,
        videos: selected,
      });
      const imported = result?.imported || [];
      setCatalog(current => {
        const ids = new Set(current.map(track => track.id));
        return [...current, ...imported.filter(track => !ids.has(track.id))];
      });
      setNotice(
        `Imported ${imported.length} YouTube track${imported.length === 1 ? '' : 's'} with available descriptions, duration, artwork and lyrics/captions.`
      );
      setYoutubeScan([]);
      setYoutubeSelected(new Set());
    } catch (err) {
      setError(apiErrorMessage(err, 'CREAPD could not import the selected YouTube tracks.'));
    } finally {
      setYoutubeImporting(false);
    }
  };

  const toggleYoutubeSelection = videoId => {
    setYoutubeSelected(current => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

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
                <h1 className="truncate font-heading text-lg font-bold">My Music Catalogue</h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 text-[10px] text-white/35 sm:flex">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Catalogue-only Radio source
            </div>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          <StageButton active={stage === 'identity'} complete={profileComplete} icon={UserRound} label="Artist Identity" onClick={() => setStage('identity')} />
          <StageButton active={stage === 'catalog'} complete={catalogComplete} icon={Music2} label="Catalogue" onClick={() => setStage('catalog')} />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-100">{error}</div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] px-4 py-3 text-sm text-cyan-100">{notice}</div>
        )}
        {youtubeDiagnostics && (
          <div className="mb-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">YouTube scan diagnostics</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/45">
              Channel ID: {youtubeDiagnostics.channel_id || 'not resolved'} ·
              Feed: {youtubeDiagnostics.feed_candidates || 0} ·
              Release playlists: {youtubeDiagnostics.release_playlist_candidates || 0} ·
              Release videos: {youtubeDiagnostics.release_playlist_video_candidates || 0} ·
              Search fallback: {youtubeDiagnostics.search_candidates || 0}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid min-h-[440px] place-items-center">
            <div className="text-center text-white/45">
              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-fuchsia-300" />
              Opening your music catalogue…
            </div>
          </div>
        ) : (
          <>
            {stage === 'identity' && (
              <section className="rounded-2xl border border-fuchsia-400/15 bg-white/[0.025] p-5 md:p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Reusable Music Source</p>
                  <h2 className="mt-1 font-heading text-2xl font-bold">Whose catalogue is this?</h2>
                  <p className="mt-2 max-w-3xl text-sm text-white/45">
                    Save the artist identity once, then reuse the same catalogue across regular Radio productions whenever you want a show to use only this music.
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
                      placeholder="How the artist should be identified on-air"
                      className="border-white/10 bg-black/35 text-white"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/55">Artist background</Label>
                    <Textarea
                      value={profile.bio_summary || ''}
                      onChange={event => setProfile(current => ({ ...current, bio_summary: event.target.value }))}
                      placeholder="Optional background CREAPD may use when writing the show."
                      className="min-h-[120px] border-white/10 bg-black/35 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/55">Artist message / creative point of view</Label>
                    <Textarea
                      value={profile.artistic_message || ''}
                      onChange={event => setProfile(current => ({ ...current, artistic_message: event.target.value }))}
                      placeholder="Optional creative point of view CREAPD may use when writing host copy."
                      className="min-h-[120px] border-white/10 bg-black/35 text-white"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.035] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="text-sm font-semibold">Share catalogue locations</p>
                      <p className="text-[10px] text-white/35">Connect the places where your music already lives. YouTube channels can be scanned automatically; other sources can be added as track links.</p>
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
                    <h2 className="mt-1 font-heading text-xl font-bold">Give CREAPD the music it can use.</h2>
                    <p className="mt-2 text-xs leading-relaxed text-white/40">
                      Connect YouTube once and let CREAPD pull what is already there. Manual upload stays available for anything the channel does not contain.
                    </p>
                  </div>

                  {youtubeChannelUrl && (
                    <div className="mb-4 rounded-xl border border-red-400/15 bg-red-500/[0.035] p-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-400/20 bg-red-500/10">
                          <Play className="h-4 w-4 text-red-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">YouTube catalogue source</p>
                          <p className="mt-0.5 truncate text-[10px] text-white/35">{youtubeChannelUrl}</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-white/30">
                            CREAPD will scan the public channel uploads and pull title, description, artwork, duration, publication info, and lyrics/caption text when YouTube exposes it.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={scanYoutube}
                        disabled={youtubeScanning}
                        className="mt-3 w-full border-red-400/20 text-red-100 hover:bg-red-500/10"
                      >
                        {youtubeScanning ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-2 h-3.5 w-3.5" />}
                        {youtubeScanning ? 'Scanning YouTube…' : 'Scan My YouTube Channel'}
                      </Button>
                    </div>
                  )}

                  {youtubeScan.length > 0 && (
                    <div className="mb-4 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.025] p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-cyan-100">Choose what belongs in the Artist Catalogue</p>
                          <p className="text-[10px] text-white/30">{youtubeSelected.size}/{youtubeScan.length} selected · likely music uploads are preselected</p>
                        </div>
                        <Button size="sm" onClick={importYoutube} disabled={!youtubeSelected.size || youtubeImporting} className="bg-cyan-600 hover:bg-cyan-500">
                          {youtubeImporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                          Import Selected
                        </Button>
                      </div>
                      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {youtubeScan.map(video => (
                          <label key={video.video_id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-black/25 p-2.5 hover:bg-white/[0.035]">
                            <input
                              type="checkbox"
                              checked={youtubeSelected.has(video.video_id)}
                              onChange={() => toggleYoutubeSelection(video.video_id)}
                              className="mt-1 accent-cyan-400"
                            />
                            {video.thumbnail_url && <img src={video.thumbnail_url} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-white">{video.title || 'Untitled YouTube track'}</p>
                              <p className="mt-0.5 truncate text-[10px] text-cyan-100/65">
                                {video.channel_name || profile.public_name || profile.artist_name || 'Unknown artist'}
                              </p>
                              <p className="mt-0.5 text-[9px] text-white/30">
                                {formatTrackDuration(video.duration_seconds)}
                                {video.published_at ? ` · ${video.published_at}` : ''}
                                {video.lyrics ? ` · lyrics/captions found` : ''}
                              </p>
                              {video.description && <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-white/35">{video.description}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/[0.07]" />
                    <span className="text-[9px] uppercase tracking-[0.18em] text-white/25">or add one manually</span>
                    <div className="h-px flex-1 bg-white/[0.07]" />
                  </div>

                  <div className="space-y-3">
                    <Input value={trackForm.title} onChange={event => setTrackForm(current => ({ ...current, title: event.target.value }))} placeholder="Track title *" className="border-white/10 bg-black/35 text-white" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={trackForm.album} onChange={event => setTrackForm(current => ({ ...current, album: event.target.value }))} placeholder="Album / project" className="border-white/10 bg-black/35 text-white" />
                      <Input value={trackForm.release_year} onChange={event => setTrackForm(current => ({ ...current, release_year: event.target.value }))} placeholder="Release year" className="border-white/10 bg-black/35 text-white" />
                    </div>
                    <Input value={trackForm.source_url} onChange={event => setTrackForm(current => ({ ...current, source_url: event.target.value }))} placeholder="YouTube / SoundCloud / Spotify / other track link" className="border-white/10 bg-black/35 text-white" />
                    <Textarea value={trackForm.description} onChange={event => setTrackForm(current => ({ ...current, description: event.target.value }))} placeholder="Track note CREAPD may use when writing the show (optional)" className="min-h-[90px] border-white/10 bg-black/35 text-white" />
                    <Textarea value={trackForm.lyrics} onChange={event => setTrackForm(current => ({ ...current, lyrics: event.target.value }))} placeholder="Lyrics (optional; CREAPD can use them as source material for host copy)" className="min-h-[120px] border-white/10 bg-black/35 text-white" />

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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Catalogue Library</p>
                      <h2 className="mt-1 font-heading text-xl font-bold">{catalogSummary}</h2>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUseProfile?.({ profile, catalog })}
                      disabled={!profile?.id || !catalog.length}
                      className="border-cyan-400/25 text-cyan-100 hover:bg-cyan-500/10"
                    >
                      <Radio className="mr-1.5 h-3.5 w-3.5" /> Use This Catalogue
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
                              <p className="truncate text-sm font-semibold">{track.title || 'Untitled track'}</p>
                            </div>
                            {(() => {
                              const metadata = normalizeMetadata(track.metadata);
                              const details = [
                                track.artist || profile.public_name || profile.artist_name || 'Unknown artist',
                                formatTrackDuration(metadata.duration_seconds),
                                track.release_year || null,
                                track.source_type ? String(track.source_type).replaceAll('_', ' ') : null,
                              ].filter(Boolean);
                              return (
                                <p className="mt-0.5 truncate text-[10px] text-white/45">
                                  {details.join(' · ')}
                                </p>
                              );
                            })()}
                            {track.album && (
                              <p className="mt-0.5 truncate text-[9px] text-white/25">{track.album}</p>
                            )}
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
                          <p className="mt-1 text-xs text-white/30">Import from YouTube or upload tracks here. CREAPD will use this library as the exclusive music pool when you select it for a show.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}


          </>
        )}
      </div>
    </div>
  );
}
