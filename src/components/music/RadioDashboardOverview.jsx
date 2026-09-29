import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Radio, Mic2, ListMusic, ClipboardList, CheckCircle2, Settings, Play, FileText } from 'lucide-react';
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

function youtubeSourceLabel(track) {
  const payload = parseSourcePayload(track?.source_payload);
  const type = String(payload.youtube_source_type || '');
  if (type === 'lyric_video') return 'LYRIC';
  if (type === 'visualizer') return 'VISUALIZER';
  if (type === 'audio_track') return 'AUDIO';
  if (track?.source === 'youtube_radio_verified' || track?.source === 'youtube_lyric_verified') return 'RADIO SAFE';
  return track?.youtube_video_id ? 'YOUTUBE' : 'UNRESOLVED';
}

function segmentSource(item, config, playlist, topics, assets) {
  const type = item?.segment_type;
  const topic = topics.find(t =>
    String(t.topic_name || '').toLowerCase() === String(item?.associated_topic || '').toLowerCase()
  );
  const song = playlist.find(track =>
    (item?.associated_song_id && track.id === item.associated_song_id) ||
    String(track.song_title || '').toLowerCase() === String(item?.associated_song_title || item?.title || '').toLowerCase()
  );

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

function SegmentRow({ item, index, config, playlist, topics, assets }) {
  const color = SEGMENT_COLORS[item.segment_type] || '#8b8b8b';
  const source = segmentSource(item, config, playlist, topics, assets);
  const isSong = item.segment_type === 'song';
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
        </div>
      </div>
    </motion.div>
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
}) {
  const rundownSeconds = useMemo(
    () => rundown.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0),
    [rundown]
  );
  const playlistSeconds = useMemo(
    () => playlist.reduce((sum, item) => sum + Number(item.length_seconds || 0), 0),
    [playlist]
  );

  const progress = Number.isFinite(Number(pipeline?.pipeline_progress))
    ? Number(pipeline.pipeline_progress)
    : readinessPercent;

  const productionLabel = config?.status === 'ready'
    ? 'READY FOR STUDIO'
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
              <Button size="sm" asChild className="cp-btn-gradient border-0 text-white">
                <Link to={`/music/live?config_id=${config?.id || ''}`}>
                  <Play className="w-4 h-4 mr-1.5" /> Open Radio Studio
                </Link>
              </Button>
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
              <p className="text-xl font-bold text-cyan-300 mt-1">{rundown.length}</p>
              <p className="text-[10px] text-white/30 mt-1">Complete Run of Show</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-black/30 p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Playlist</p>
              <p className="text-xl font-bold text-fuchsia-300 mt-1">{playlist.length} tracks</p>
              <p className="text-[10px] text-white/30 mt-1">{formatRuntime(playlistSeconds)} of music</p>
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
              <p className="text-[10px] text-white/30 mt-1">{progress}% production progress</p>
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
              <p className="text-[11px] text-white/35 mt-1">Every segment, its timing, and exactly what the host copy is built from.</p>
            </div>
            <Link to="/music/rundown" className="text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200">
              Open Rundown
            </Link>
          </div>

          <div className="p-3 space-y-2 max-h-[760px] overflow-y-auto">
            {rundown.length ? rundown.map((item, index) => (
              <SegmentRow
                key={item.id || index}
                item={item}
                index={index}
                config={config}
                playlist={playlist}
                topics={topics}
                assets={assets}
              />
            )) : (
              <div className="py-16 text-center text-sm text-white/35">No rundown has been generated yet.</div>
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
              <p className="text-[11px] text-white/35 mt-1">{playlist.length} tracks · {formatRuntime(playlistSeconds)}</p>
            </div>
            <Link to="/music/playlist" className="text-[10px] uppercase tracking-wider text-fuchsia-300 hover:text-fuchsia-200">
              Edit Playlist
            </Link>
          </div>

          <div className="p-3 space-y-2 max-h-[760px] overflow-y-auto">
            {playlist.length ? playlist.map((track, index) => (
              <div key={track.id || index} className="rounded-xl border border-white/[0.07] bg-black/35 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-fuchsia-500/10 border border-fuchsia-400/20 text-xs font-bold text-fuchsia-300">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{track.song_title}</p>
                    <p className="text-[11px] text-white/40 truncate">{track.artist}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-white/55">{formatRuntime(track.length_seconds)}</p>
                    <span className="text-[8px] tracking-wider text-cyan-300">{youtubeSourceLabel(track)}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-16 text-center text-sm text-white/35">No playlist has been generated yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
