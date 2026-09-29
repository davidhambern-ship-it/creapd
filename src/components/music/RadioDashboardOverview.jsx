import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Calendar, Clock, Radio, Mic2, ListMusic, ClipboardList, CheckCircle2,
  Settings, Play, FileText, Check, X, RotateCcw, RefreshCw, Loader2, ArchiveX, LockKeyhole
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRuntime, SEGMENT_TYPE_LABELS, SEGMENT_COLORS } from '@/lib/musicConstants';

function parseSourcePayload(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {}
  }
  return {};
}

function reviewState(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved' || value === 'locked') return 'approved';
  if (value === 'rejected') return 'rejected';
  return 'pending';
}

function ReviewBadge({ status, compact = false }) {
  const state = reviewState(status);
  const styles = state === 'approved'
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
    : state === 'rejected'
      ? 'border-red-400/30 bg-red-500/10 text-red-300'
      : 'border-amber-400/25 bg-amber-500/[0.07] text-amber-200';
  const label = state === 'approved' ? 'APPROVED' : state === 'rejected' ? 'REJECTED' : 'PENDING';

  return (
    <span className={`${compact ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'} rounded-full border font-bold tracking-wider ${styles}`}>
      {label}
    </span>
  );
}

function ReviewButtons({ item, onReview, reviewingId, compact = false }) {
  const busy = reviewingId === item?.id;
  const state = reviewState(item?.status);

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        disabled={busy || state === 'approved'}
        onClick={() => onReview?.(item, 'approved')}
        className={`${compact ? 'h-7 px-2' : 'h-8 px-2.5'} inline-flex items-center gap-1 rounded-lg border text-[9px] font-bold tracking-wider transition-colors disabled:opacity-40 ${
          state === 'approved'
            ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-300'
            : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-emerald-400/35 hover:text-emerald-300'
        }`}
        title="Approve"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        {!compact && 'APPROVE'}
      </button>
      <button
        type="button"
        disabled={busy || state === 'rejected'}
        onClick={() => onReview?.(item, 'rejected')}
        className={`${compact ? 'h-7 px-2' : 'h-8 px-2.5'} inline-flex items-center gap-1 rounded-lg border text-[9px] font-bold tracking-wider transition-colors disabled:opacity-40 ${
          state === 'rejected'
            ? 'border-red-400/35 bg-red-500/10 text-red-300'
            : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-red-400/35 hover:text-red-300'
        }`}
        title="Reject"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        {!compact && 'REJECT'}
      </button>
    </div>
  );
}

function youtubeSourceLabel(track) {
  const payload = parseSourcePayload(track?.source_payload);
  const type = String(payload.youtube_source_type || '');
  if (type === 'lyric_video') return 'LYRIC';
  if (type === 'visualizer') return 'VISUALIZER';
  if (type === 'audio_track') return 'AUDIO';
  if (track?.source === 'youtube_radio_verified' || track?.source === 'youtube_lyric_verified') return 'RADIO SAFE';
  return track?.youtube_video_id ? 'YOUTUBE' : 'UNRESOLVED';
}

function findSong(item, playlist) {
  return playlist.find(track =>
    (item?.associated_song_id && track.id === item.associated_song_id) ||
    String(track.song_title || '').toLowerCase() === String(item?.associated_song_title || item?.title || '').toLowerCase()
  ) || null;
}

function segmentSource(item, config, playlist, topics, assets) {
  const type = item?.segment_type;
  const topic = topics.find(t =>
    String(t.topic_name || '').toLowerCase() === String(item?.associated_topic || '').toLowerCase()
  );
  const song = findSong(item, playlist);

  if (type === 'song') {
    const titleKey = String(song?.song_title || item?.title || '').toLowerCase();
    const intro = assets.find(a => a.asset_type === 'song_intro' && String(a.associated_song_title || '').toLowerCase() === titleKey);
    const outro = assets.find(a => a.asset_type === 'song_outro' && String(a.associated_song_title || '').toLowerCase() === titleKey);
    return {
      label: 'PLAYLIST + SONG ASSETS',
      detail: `${song?.song_title || item?.title || 'Song'} — ${song?.artist || 'Artist'}. The song is audio; host copy comes from its song-intro/song-outro Production assets.`,
      intro: intro?.content || '',
      outro: outro?.content || '',
    };
  }

  if (type === 'topic_segment') {
    return {
      label: 'TOPIC + RESEARCH',
      detail: topic?.sources
        ? `${topic.topic_name || item.title} · source: ${topic.sources}`
        : `${topic?.topic_name || item?.title || 'Selected topic'} · generated topic material, grounded in approved research when available.`,
    };
  }

  if (type === 'intro') {
    return {
      label: 'DISCOVERY ROOM',
      detail: 'Show title, description/premise, host/co-host, station, tone, and editorial focus.',
    };
  }

  if (type === 'outro') {
    return {
      label: 'DISCOVERY + RUNDOWN',
      detail: 'Show identity plus a close/recap based on the completed rundown.',
    };
  }

  if (type === 'station_id') {
    return {
      label: 'STATION IDENTITY',
      detail: `${config?.station_name || 'Station'} · ${config?.production_name || 'Show'} · ${config?.host_name || 'Host'}`,
    };
  }

  if (type === 'sponsor_break') {
    return {
      label: 'COMMERCIAL SETUP',
      detail: 'Commercial/sponsor runtime settings. Placeholder copy unless sponsor information was explicitly supplied.',
    };
  }

  if (type === 'talk_break') {
    return {
      label: 'SHOW CONTEXT',
      detail: 'Show premise/editorial focus plus the surrounding playlist block. No unsupported current facts.',
    };
  }

  return {
    label: 'RUNDOWN CONTEXT',
    detail: 'Show configuration plus the relevant approved production material for this segment.',
  };
}

function SegmentRow({
  item,
  index,
  config,
  playlist,
  topics,
  assets,
  reviewingId,
  onReviewSegment,
}) {
  const color = SEGMENT_COLORS[item.segment_type] || '#8b8b8b';
  const source = segmentSource(item, config, playlist, topics, assets);
  const isSong = item.segment_type === 'song';
  const song = isSong ? findSong(item, playlist) : null;
  const script = String(item.script_content || '').trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.35) }}
      className="rounded-xl border border-white/[0.07] bg-black/35 overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
          style={{ background: `${color}16`, border: `1px solid ${color}40`, color }}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{ color, borderColor: `${color}45`, background: `${color}12` }}
            >
              {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
            </span>
            <h4 className="text-sm font-semibold text-white truncate">{item.title || 'Untitled Segment'}</h4>
            {isSong ? <ReviewBadge status={song?.status} /> : <ReviewBadge status={item.status} />}
            <span className="ml-auto text-[10px] font-mono text-white/35">
              {item.start_time || '--:--'}–{item.end_time || '--:--'} · {formatRuntime(item.duration_seconds)}
            </span>
          </div>

          <div className="mt-2 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.035] px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3 h-3 text-cyan-300" />
              <span className="text-[9px] font-bold tracking-[0.18em] text-cyan-300">{source.label}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/50">{source.detail}</p>
          </div>

          {!isSong && script && (
            <p className="mt-2 text-xs leading-relaxed text-white/55 line-clamp-2">
              <span className="text-white/30 uppercase tracking-wider text-[9px] mr-2">Script</span>
              {script}
            </p>
          )}

          {isSong && (source.intro || source.outro) && (
            <div className="mt-2 grid md:grid-cols-2 gap-2">
              {source.intro && (
                <div className="rounded-lg bg-fuchsia-500/[0.05] border border-fuchsia-400/10 px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-fuchsia-300 mb-1">Song Intro Copy</p>
                  <p className="text-[11px] text-white/50 line-clamp-2">{source.intro}</p>
                </div>
              )}
              {source.outro && (
                <div className="rounded-lg bg-cyan-500/[0.05] border border-cyan-400/10 px-3 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-cyan-300 mb-1">Song Outro / Recap Copy</p>
                  <p className="text-[11px] text-white/50 line-clamp-2">{source.outro}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            {isSong ? (
              <p className="text-[9px] uppercase tracking-wider text-white/25">
                Song approval is controlled from the Playlist
              </p>
            ) : (
              <ReviewButtons item={item} onReview={onReviewSegment} reviewingId={reviewingId} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TrackRow({ track, index, reviewingId, onReviewTrack }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/35 px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-fuchsia-500/10 border border-fuchsia-400/20 text-xs font-bold text-fuchsia-300">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium text-white truncate">{track.song_title}</p>
            <ReviewBadge status={track.status} compact />
          </div>
          <p className="text-[11px] text-white/40 truncate">{track.artist}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-mono text-white/55">{formatRuntime(track.length_seconds)}</p>
          <span className="text-[8px] tracking-wider text-cyan-300">{youtubeSourceLabel(track)}</span>
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <ReviewButtons
          item={track}
          onReview={onReviewTrack}
          reviewingId={reviewingId}
          compact
        />
      </div>
    </div>
  );
}

function RejectedPile({
  rejectedTracks,
  rejectedSegments,
  reviewingId,
  regeneratingRejected,
  onReviewTrack,
  onReviewSegment,
  onRegenerateRejected,
}) {
  const total = rejectedTracks.length + rejectedSegments.length;
  if (!total) return null;

  return (
    <section className="cp-glass overflow-hidden" style={{ borderColor: 'rgba(248,113,113,0.22)' }}>
      <div className="p-4 border-b border-red-400/10 bg-red-500/[0.035] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ArchiveX className="w-4 h-4 text-red-300" />
            <h2 className="font-semibold text-white">Rejected Pile</h2>
            <span className="text-[9px] px-2 py-0.5 rounded-full border border-red-400/25 bg-red-500/10 text-red-300 font-bold">
              {total}
            </span>
          </div>
          <p className="text-[11px] text-white/35 mt-1">
            Rejected material is out of the active show until you restore it or regenerate it.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {rejectedTracks.length > 0 && rejectedSegments.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={regeneratingRejected}
                onClick={() => onRegenerateRejected?.('tracks')}
                className="border-fuchsia-400/25 text-fuchsia-200 hover:bg-fuchsia-500/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${regeneratingRejected ? 'animate-spin' : ''}`} />
                Tracks Only
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={regeneratingRejected}
                onClick={() => onRegenerateRejected?.('segments')}
                className="border-cyan-400/25 text-cyan-200 hover:bg-cyan-500/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${regeneratingRejected ? 'animate-spin' : ''}`} />
                Segments Only
              </Button>
            </>
          )}
          <Button
            size="sm"
            disabled={regeneratingRejected}
            onClick={() => onRegenerateRejected?.('all')}
            className="bg-red-500/15 border border-red-400/30 text-red-200 hover:bg-red-500/25"
          >
            {regeneratingRejected
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            }
            Regenerate Rejected
          </Button>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 p-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListMusic className="w-3.5 h-3.5 text-fuchsia-300" />
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Rejected Tracks ({rejectedTracks.length})</p>
          </div>
          <div className="space-y-2">
            {rejectedTracks.length ? rejectedTracks.map(track => (
              <div key={track.id} className="rounded-xl border border-red-400/15 bg-red-500/[0.035] p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{track.song_title}</p>
                    <p className="text-[11px] text-white/40 truncate">{track.artist} · {formatRuntime(track.length_seconds)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={reviewingId === track.id}
                    onClick={() => onReviewTrack?.(track, 'approved')}
                    className="h-7 px-2 inline-flex items-center gap-1 rounded-lg border border-white/10 text-[9px] font-bold tracking-wider text-white/55 hover:border-emerald-400/35 hover:text-emerald-300 disabled:opacity-40"
                  >
                    {reviewingId === track.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    RESTORE
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-xs text-white/25 py-4">No rejected tracks.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-cyan-300" />
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Rejected Segments ({rejectedSegments.length})</p>
          </div>
          <div className="space-y-2">
            {rejectedSegments.length ? rejectedSegments.map(segment => (
              <div key={segment.id} className="rounded-xl border border-red-400/15 bg-red-500/[0.035] p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-cyan-300">
                        {SEGMENT_TYPE_LABELS[segment.segment_type] || segment.segment_type}
                      </span>
                      <p className="text-sm font-medium text-white truncate">{segment.title}</p>
                    </div>
                    {segment.script_content && (
                      <p className="text-[11px] text-white/35 mt-1 line-clamp-2">{segment.script_content}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={reviewingId === segment.id}
                    onClick={() => onReviewSegment?.(segment, 'approved')}
                    className="h-7 px-2 inline-flex items-center gap-1 rounded-lg border border-white/10 text-[9px] font-bold tracking-wider text-white/55 hover:border-emerald-400/35 hover:text-emerald-300 disabled:opacity-40"
                  >
                    {reviewingId === segment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    RESTORE
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-xs text-white/25 py-4">No rejected segments.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function RadioDashboardOverview({
  config,
  playlist = [],
  rundown = [],
  topics = [],
  assets = [],
  pipeline,
  readinessPercent = 0,
  reviewingId = null,
  regeneratingRejected = false,
  onReviewTrack,
  onReviewSegment,
  onRegenerateRejected,
}) {
  const rejectedTracks = useMemo(
    () => playlist.filter(track => reviewState(track.status) === 'rejected'),
    [playlist]
  );
  const rejectedTrackIds = useMemo(
    () => new Set(rejectedTracks.map(track => track.id)),
    [rejectedTracks]
  );
  const rejectedTrackTitles = useMemo(
    () => new Set(rejectedTracks.map(track => String(track.song_title || '').toLowerCase())),
    [rejectedTracks]
  );

  const activePlaylist = useMemo(
    () => playlist.filter(track => reviewState(track.status) !== 'rejected'),
    [playlist]
  );

  const rejectedSegments = useMemo(
    () => rundown.filter(item => item.segment_type !== 'song' && reviewState(item.status) === 'rejected'),
    [rundown]
  );

  const activeRundown = useMemo(
    () => rundown.filter(item => {
      if (item.segment_type !== 'song') return reviewState(item.status) !== 'rejected';
      if (item.associated_song_id && rejectedTrackIds.has(item.associated_song_id)) return false;
      const title = String(item.associated_song_title || item.title || '').toLowerCase();
      return !rejectedTrackTitles.has(title);
    }),
    [rundown, rejectedTrackIds, rejectedTrackTitles]
  );

  const rundownSeconds = useMemo(
    () => activeRundown.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0),
    [activeRundown]
  );
  const playlistSeconds = useMemo(
    () => activePlaylist.reduce((sum, item) => sum + Number(item.length_seconds || 0), 0),
    [activePlaylist]
  );

  const spokenReviewItems = useMemo(
    () => rundown.filter(item => item.segment_type !== 'song'),
    [rundown]
  );
  const reviewableCount = playlist.length + spokenReviewItems.length;
  const approvedCount =
    playlist.filter(item => reviewState(item.status) === 'approved').length +
    spokenReviewItems.filter(item => reviewState(item.status) === 'approved').length;
  const rejectedCount = rejectedTracks.length + rejectedSegments.length;
  const pendingCount = Math.max(0, reviewableCount - approvedCount - rejectedCount);

  const progress = Number.isFinite(Number(pipeline?.pipeline_progress))
    ? Number(pipeline.pipeline_progress)
    : readinessPercent;

  const studioApproved = config?.status === 'approved';
  const productionLabel = studioApproved
    ? 'APPROVED FOR STUDIO'
    : ['in_review', 'ready'].includes(config?.status)
      ? 'IN REVIEW'
      : String(pipeline?.current_department || config?.status || 'BUILDING').replaceAll('_', ' ').toUpperCase();

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl cp-glass"
        style={{ borderColor: 'rgba(255,0,255,0.22)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF00FF]/14 via-transparent to-[#00FFFF]/10 pointer-events-none" />
        <div className="relative p-5 md:p-7">
          <div className="flex flex-col xl:flex-row xl:items-start gap-5 justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-fuchsia-300" />
                <span className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-300 font-semibold">Radio Production</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white cp-glitch leading-tight truncate">
                {config?.production_name || 'Untitled Radio Show'}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-white/45">
                {config?.host_name && <span className="flex items-center gap-1.5"><Mic2 className="w-3.5 h-3.5 text-cyan-300" />{config.host_name}</span>}
                {config?.station_name && <span className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-cyan-300" />{config.station_name}</span>}
                {config?.show_date && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-cyan-300" />{config.show_date}</span>}
                {config?.show_start_time && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-cyan-300" />{config.show_start_time}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild className="border-white/10 hover:bg-white/5">
                <Link to={`/music/configure?config_id=${config?.id || ''}`}>
                  <Settings className="w-4 h-4 mr-1.5 text-cyan-300" /> Edit Show
                </Link>
              </Button>
              {studioApproved ? (
                <Button size="sm" asChild className="cp-btn-gradient border-0 text-white">
                  <Link to={`/music/live?config_id=${config?.id || ''}`}>
                    <Play className="w-4 h-4 mr-1.5" /> Open Radio Studio
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled
                  title="Approve every track and spoken segment to unlock Radio Studio"
                  className="border border-white/10 bg-white/[0.04] text-white/35"
                >
                  <LockKeyhole className="w-4 h-4 mr-1.5" /> Studio Locked
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
            <div className="rounded-xl border border-white/[0.07] bg-black/30 p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Show Length</p>
              <p className="text-xl font-bold text-white mt-1">{rundownSeconds ? formatRuntime(rundownSeconds) : `${config?.total_show_runtime || 0} min`}</p>
              <p className="text-[10px] text-white/30 mt-1">Configured: {config?.total_show_runtime || 0} min</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-black/30 p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Segments</p>
              <p className="text-xl font-bold text-cyan-300 mt-1">{activeRundown.length}</p>
              <p className="text-[10px] text-white/30 mt-1">{rejectedSegments.length ? `${rejectedSegments.length} rejected` : 'Active Run of Show'}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-black/30 p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Playlist</p>
              <p className="text-xl font-bold text-fuchsia-300 mt-1">{activePlaylist.length} tracks</p>
              <p className="text-[10px] text-white/30 mt-1">{formatRuntime(playlistSeconds)} · {rejectedTracks.length ? `${rejectedTracks.length} rejected` : 'all active'}</p>
            </div>
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Production</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                <p className="text-sm font-bold text-cyan-200">{productionLabel}</p>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
              </div>
              <p className="text-[10px] text-white/30 mt-1">
                Build {progress}% · Review {approvedCount}/{reviewableCount} approved{pendingCount ? ` · ${pendingCount} pending` : ''}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,.75fr)] gap-5 items-start">
        <section className="cp-glass overflow-hidden" style={{ borderColor: 'rgba(0,255,255,0.13)' }}>
          <div className="flex items-center justify-between gap-3 p-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-300" />
                <h2 className="font-semibold text-white">Run of Show</h2>
              </div>
              <p className="text-[11px] text-white/35 mt-1">Approve or reject spoken segments. Song approval follows the Playlist review.</p>
            </div>
            <Link to="/music/rundown" className="text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200">
              Open Rundown
            </Link>
          </div>

          <div className="p-3 space-y-2 max-h-[760px] overflow-y-auto">
            {activeRundown.length ? activeRundown.map((item, index) => (
              <SegmentRow
                key={item.id || index}
                item={item}
                index={index}
                config={config}
                playlist={playlist}
                topics={topics}
                assets={assets}
                reviewingId={reviewingId}
                onReviewSegment={onReviewSegment}
              />
            )) : (
              <div className="py-16 text-center text-sm text-white/35">No active rundown material.</div>
            )}
          </div>
        </section>

        <section className="cp-glass overflow-hidden xl:sticky xl:top-4" style={{ borderColor: 'rgba(255,0,255,0.15)' }}>
          <div className="flex items-center justify-between gap-3 p-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-fuchsia-300" />
                <h2 className="font-semibold text-white">Playlist</h2>
              </div>
              <p className="text-[11px] text-white/35 mt-1">{activePlaylist.length} active tracks · {formatRuntime(playlistSeconds)}</p>
            </div>
            <Link to="/music/playlist" className="text-[10px] uppercase tracking-wider text-fuchsia-300 hover:text-fuchsia-200">
              Edit Playlist
            </Link>
          </div>

          <div className="p-3 space-y-2 max-h-[760px] overflow-y-auto">
            {activePlaylist.length ? activePlaylist.map((track, index) => (
              <TrackRow
                key={track.id || index}
                track={track}
                index={index}
                reviewingId={reviewingId}
                onReviewTrack={onReviewTrack}
              />
            )) : (
              <div className="py-16 text-center text-sm text-white/35">No active playlist tracks.</div>
            )}
          </div>
        </section>
      </div>

      <RejectedPile
        rejectedTracks={rejectedTracks}
        rejectedSegments={rejectedSegments}
        reviewingId={reviewingId}
        regeneratingRejected={regeneratingRejected}
        onReviewTrack={onReviewTrack}
        onReviewSegment={onReviewSegment}
        onRegenerateRejected={onRegenerateRejected}
      />
    </div>
  );
}
