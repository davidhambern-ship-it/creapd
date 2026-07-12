import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, EyeOff, Lock, Volume2,
  Type, AlignLeft, Captions, Image as ImageIcon, Shapes, Square,
  BarChart3, Video, Music, ArrowLeftRight, Clock,
  LogIn, Sparkles, LogOut, Plus, Layers,
} from 'lucide-react';

function parseTiming(str) {
  try { return JSON.parse(str || '{}') ?? {}; } catch { return {}; }
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

const HEADER_WIDTH = 200;
const ROW_HEIGHT = 36;
const GROUP_HEADER_HEIGHT = 28;
const ANIM_ROW_HEIGHT = 28;
const RULER_HEIGHT = 28;

const TYPE_ICONS = {
  text: Type, lower_third: AlignLeft, caption: Captions,
  image: ImageIcon, icon: Shapes, shape: Square,
  chart: BarChart3, background: ImageIcon,
  video: Video, audio: Music,
};

const TYPE_LABELS = {
  text: 'Text', lower_third: 'Lower Third', caption: 'Caption',
  image: 'Image', icon: 'Icon', shape: 'Shape',
  chart: 'Chart', background: 'Background',
  video: 'Video', audio: 'Audio',
};

const ANIM_META = {
  entrance: { cls: 'cpe-anim-entrance', Icon: LogIn, label: 'In' },
  emphasis: { cls: 'cpe-anim-emphasis', Icon: Sparkles, label: 'Emph' },
  exit: { cls: 'cpe-anim-exit', Icon: LogOut, label: 'Out' },
};

const SNAP_MS = 100;
const MIN_DURATION = 200;
function snap(ms) { return Math.round(ms / SNAP_MS) * SNAP_MS; }

function getElementName(el) {
  const style = parseTiming(el.style);
  if (style.role === 'title') return 'Title';
  if (style.role === 'body') return 'Body Text';
  if (style.role === 'subtitle') return 'Subtitle';
  const content = (el.content || '').trim();
  const typeLabel = TYPE_LABELS[el.type] || el.type;
  if (content && el.type !== 'audio') {
    return `${typeLabel} — ${content.split('\n')[0].slice(0, 18)}`;
  }
  return typeLabel;
}

function getElementTiming(el, slideDuration) {
  const et = parseTiming(el.timing);
  return { start: et.start_ms ?? 0, end: et.end_ms || slideDuration };
}

function parseAnimations(animStr) {
  if (!animStr) return [];
  let anim;
  try { anim = JSON.parse(animStr); } catch { return []; }
  if (Array.isArray(anim)) {
    return anim.filter(a => a.type && a.type !== 'none').map(a => {
      let category = a.category;
      if (!category) {
        if (a.type.includes('exit') || a.type.includes('out')) category = 'exit';
        else if (a.type.includes('pulse') || a.type.includes('bounce') || a.type.includes('shake')) category = 'emphasis';
        else category = 'entrance';
      }
      return { type: a.type, category, start: a.start_ms ?? a.delay_ms ?? 0, duration: a.duration_ms || 500 };
    });
  }
  if (anim.entrance || anim.emphasis || anim.exit) {
    const result = [];
    if (anim.entrance) result.push({ type: anim.entrance.type || 'fade_in', category: 'entrance', start: anim.entrance.start_ms ?? anim.entrance.delay_ms ?? 0, duration: anim.entrance.duration_ms || 500 });
    if (anim.emphasis) result.push({ type: anim.emphasis.type || 'pulse', category: 'emphasis', start: anim.emphasis.start_ms ?? anim.emphasis.delay_ms ?? 0, duration: anim.emphasis.duration_ms || 500 });
    if (anim.exit) result.push({ type: anim.exit.type || 'fade_out', category: 'exit', start: anim.exit.start_ms ?? anim.exit.delay_ms ?? 0, duration: anim.exit.duration_ms || 500 });
    return result;
  }
  if (anim.type && anim.type !== 'none') {
    const start = anim.delay_ms || 0;
    const dur = anim.duration_ms || 500;
    let category = 'entrance';
    if (anim.type.includes('out') || anim.type.includes('exit')) category = 'exit';
    else if (anim.type.includes('pulse') || anim.type.includes('bounce') || anim.type.includes('shake')) category = 'emphasis';
    return [{ type: anim.type, category, start, duration: dur }];
  }
  return [];
}

// ── Build track groups from slide + elements ──
function buildTrackGroups(elements, slide, duration) {
  const slideTiming = parseTiming(slide?.timing);
  const transitionDur = slideTiming.transition_duration || 500;

  // Slide-level tracks
  const slideTracks = [
    { id: '__slide_dur', label: 'Slide Duration', icon: Clock, start: 0, end: duration, editable: false, cls: 'cpe-clip-slide' },
    { id: '__trans_in', label: `Transition In — ${slide?.transition || 'fade'}`, icon: ArrowLeftRight, start: 0, end: transitionDur, editable: false, cls: 'cpe-clip-transition' },
    { id: '__trans_out', label: 'Transition Out', icon: ArrowLeftRight, start: duration - transitionDur, end: duration, editable: false, cls: 'cpe-clip-transition' },
  ];

  // Voiceover track from slide_timeline
  const slideTimeline = parseTiming(slide?.slide_timeline);
  const voiceAudioUrl = slideTimeline.voice_audio_url || slideTimeline.audio_url;
  const voiceDuration = slideTimeline.duration_ms || slide?.duration_ms || duration;
  const voiceoverTracks = voiceAudioUrl
    ? [{ id: '__voiceover', label: 'Voiceover', icon: Music, start: 0, end: voiceDuration, editable: false, cls: 'cpe-clip-audio', isAudio: true }]
    : [];

  // Element tracks grouped by type
  const textEls = elements.filter(e => ['text', 'lower_third', 'caption'].includes(e.type));
  const visualEls = elements.filter(e => ['image', 'icon', 'shape', 'chart', 'background'].includes(e.type));
  const videoEls = elements.filter(e => e.type === 'video');
  const audioEls = elements.filter(e => e.type === 'audio');

  const buildElementTrack = (el) => {
    const { start, end } = getElementTiming(el, duration);
    const animations = parseAnimations(el.animation);
    const Icon = TYPE_ICONS[el.type] || Square;
    return {
      id: el.id, elementId: el.id, label: getElementName(el),
      icon: Icon, start, end, editable: true,
      cls: `cpe-clip-${el.type === 'lower_third' || el.type === 'caption' ? 'text' : el.type === 'audio' ? 'audio' : el.type === 'image' ? 'image' : el.type === 'video' ? 'video' : 'fx'}`,
      element: el, animations, locked: el.locked, hidden: el.visible === false,
      isAudio: el.type === 'audio' || el.type === 'video',
    };
  };

  const groups = [];
  groups.push({ key: 'slide', label: 'SLIDE', tracks: slideTracks });
  if (textEls.length) groups.push({ key: 'text', label: 'TEXT', tracks: textEls.map(buildElementTrack) });
  if (visualEls.length) groups.push({ key: 'visual', label: 'VISUAL', tracks: visualEls.map(buildElementTrack) });
  if (videoEls.length) groups.push({ key: 'video', label: 'VIDEO', tracks: videoEls.map(buildElementTrack) });
  const audioTracks = [...voiceoverTracks, ...audioEls.map(buildElementTrack)];
  if (audioTracks.length) groups.push({ key: 'audio', label: 'AUDIO', tracks: audioTracks });

  return groups;
}

export default function TimelineTrackList({
  elements, slide, duration, selectedId,
  onSelectElement, onUpdateElement,
  startClipDrag, activeDrag,
  sentencePoints, laneWidth,
  laneRef, onRulerDown, currentTime,
  scrollRef, forcedCompactMode,
}) {
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [expandedTracks, setExpandedTracks] = useState(new Set());
  const [internalCompactMode, setInternalCompactMode] = useState(true);
  const compactMode = forcedCompactMode !== undefined ? forcedCompactMode : internalCompactMode;
  const selectedTrackRef = useRef(null);

  const groups = useMemo(
    () => buildTrackGroups(elements || [], slide, duration),
    [elements, slide, duration]
  );

  const hasTimedElements = groups.some(g => g.key !== 'slide' && g.tracks.length > 0);

  // Auto-expand selected element's track
  useEffect(() => {
    if (selectedId && !selectedId.startsWith('__') && !compactMode) {
      setExpandedTracks(prev => prev.has(selectedId) ? prev : new Set([...prev, selectedId]));
    }
  }, [selectedId, compactMode]);

  // Scroll selected track into view
  useEffect(() => {
    if (selectedId && selectedTrackRef.current) {
      selectedTrackRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedId]);

  const toggleGroup = useCallback((key) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleTrack = useCallback((elementId) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      next.has(elementId) ? next.delete(elementId) : next.add(elementId);
      return next;
    });
  }, []);

  const tickCount = Math.min(Math.ceil(duration / 1000), 12);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * (duration / tickCount));
  const playheadPct = duration > 0 ? ((currentTime || 0) / duration) * 100 : 0;

  return (
    <div className="cpe-tl-container">
      {/* Header bar */}
      <div className="cpe-tl-toolbar">
        <span className="cpe-timeline-label">Timeline</span>
        <span className="cpe-time-display">
          {groups.reduce((n, g) => n + g.tracks.length, 0)} tracks · {fmt(duration)}
        </span>
        <div className="flex-1" />
        <button
          className={`cpe-tl-mode-btn ${compactMode ? '' : 'active'}`}
          onClick={() => setInternalCompactMode(v => !v)}
          title={compactMode ? 'Switch to expanded mode' : 'Switch to compact mode'}
          style={forcedCompactMode !== undefined ? { pointerEvents: 'none', opacity: 0.5 } : {}}
        >
          <Layers className="w-3 h-3" />
          {compactMode ? 'Compact' : 'Expanded'}
        </button>
      </div>

      {/* Scrollable timeline area */}
      <div className="cpe-tl-scroll" ref={scrollRef}>
        {/* Ruler row — sticky top */}
        <div className="cpe-tl-row cpe-tl-ruler-row" style={{ height: RULER_HEIGHT }}>
          <div className="cpe-tl-corner" style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH }} />
          <div className="cpe-tl-ruler" style={{ width: laneWidth }} ref={laneRef} onMouseDown={onRulerDown}>
            {ticks.map((t, i) => (
              <div key={i} className="cpe-ruler-tick" style={{ left: `${(t / duration) * 100}%` }}>
                <span className="cpe-ruler-label">{fmt(t)}</span>
              </div>
            ))}
            {sentencePoints?.map((sp, i) => (
              <div key={`s${i}`} className="cpe-sentence-marker"
                style={{ left: `${(sp / duration) * 100}%` }}
                title={`Sentence ${i + 1} @ ${fmt(sp)}`} />
            ))}
            {/* Playhead — spans from ruler to bottom of all tracks */}
            <div className="cpe-playhead" style={{ left: `${playheadPct}%` }}>
              <div className="cpe-playhead-handle" />
            </div>
          </div>
        </div>

        {/* Track groups */}
        {groups.map(group => {
          if (group.tracks.length === 0) return null;
          const isCollapsed = collapsedGroups.has(group.key);

          return (
            <div key={group.key} className="cpe-tl-group">
              {/* Group header */}
              <div
                className="cpe-tl-row cpe-tl-group-row"
                style={{ height: GROUP_HEADER_HEIGHT }}
                onClick={() => toggleGroup(group.key)}
              >
                <div className="cpe-tl-group-header" style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH }}>
                  {isCollapsed
                    ? <ChevronRight className="w-3 h-3 cpe-tl-chevron" />
                    : <ChevronDown className="w-3 h-3 cpe-tl-chevron" />}
                  <span className="cpe-tl-group-label">{group.label}</span>
                  <span className="cpe-tl-group-count">{group.tracks.length}</span>
                </div>
                <div className="cpe-tl-group-spine" style={{ width: laneWidth }} />
              </div>

              {/* Tracks (hidden when group collapsed) */}
              {!isCollapsed && group.tracks.map(track => {
                const isElement = !!track.elementId;
                const isSelected = isElement && selectedId === track.elementId;
                const isExpanded = isElement && expandedTracks.has(track.elementId);
                const hasAnims = isElement && track.animations.length > 0;
                const showAnims = !compactMode && hasAnims;

                return (
                  <React.Fragment key={track.id}>
                    {/* Element track row */}
                    <div
                      ref={isSelected ? selectedTrackRef : null}
                      className={`cpe-tl-row cpe-tl-track-row ${isSelected ? 'selected' : ''}`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* Track header — sticky left */}
                      <div
                        className={`cpe-tl-track-header ${isSelected ? 'selected' : ''}`}
                        style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH }}
                        onClick={() => isElement && onSelectElement?.(track.elementId)}
                      >
                        {hasAnims && !compactMode ? (
                          <button
                            className="cpe-tl-expand-btn"
                            onClick={(e) => { e.stopPropagation(); toggleTrack(track.elementId); }}
                          >
                            {isExpanded
                              ? <ChevronDown className="w-3 h-3" />
                              : <ChevronRight className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="cpe-tl-indent" />
                        )}
                        <track.icon className="w-3.5 h-3.5 cpe-tl-type-icon" />
                        <span className="cpe-tl-track-name">{track.label}</span>
                        <div className="flex-1" />
                        {isElement && track.hidden && (
                          <EyeOff className="w-3 h-3 cpe-tl-state-icon" />
                        )}
                        {isElement && track.locked && (
                          <Lock className="w-3 h-3 cpe-tl-state-icon" />
                        )}
                        {isElement && track.isAudio && (
                          <Volume2 className="w-3 h-3 cpe-tl-state-icon" />
                        )}
                      </div>

                      {/* Track lane */}
                      <div className="cpe-tl-lane" style={{ width: laneWidth }}>
                        {track.editable && (() => {
                          const left = (track.start / duration) * 100;
                          const width = Math.max(((track.end - track.start) / duration) * 100, 1.5);
                          const isDragging = activeDrag?.id === track.elementId;
                          return (
                            <div
                              className={`cpe-track-clip ${track.cls} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} editable`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                              onMouseDown={(e) => startClipDrag(e, track.element, track, 'move')}
                              title={track.label}
                            >
                              <div className="cpe-clip-handle cpe-clip-handle-l"
                                onMouseDown={(e) => startClipDrag(e, track.element, track, 'resize-l')} />
                              <div className="cpe-clip-handle cpe-clip-handle-r"
                                onMouseDown={(e) => startClipDrag(e, track.element, track, 'resize-r')} />
                              <span className="cpe-clip-label">{track.label}</span>
                              {/* Compact animation indicators */}
                              {compactMode && hasAnims && track.animations.map((anim, ai) => {
                                const meta = ANIM_META[anim.category] || ANIM_META.entrance;
                                const aLeft = (anim.start / duration) * 100;
                                const aWidth = Math.max((anim.duration / duration) * 100, 2);
                                return (
                                  <div
                                    key={ai}
                                    className={`cpe-tl-anim-indicator ${meta.cls}`}
                                    style={{ left: `${aLeft}%`, width: `${aWidth}%` }}
                                    title={`${meta.label}: ${anim.type}`}
                                  />
                                );
                              })}
                            </div>
                          );
                        })()}
                        {!track.editable && (() => {
                          const left = (track.start / duration) * 100;
                          const width = Math.max(((track.end - track.start) / duration) * 100, 1.5);
                          return (
                            <div
                              className={`cpe-track-clip ${track.cls}`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                              title={track.label}
                            >
                              <span className="cpe-clip-label">{track.label}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Nested animation child tracks (expanded mode only) */}
                    {showAnims && isExpanded && track.animations.map((anim, ai) => {
                      const meta = ANIM_META[anim.category] || ANIM_META.entrance;
                      const aLeft = (anim.start / duration) * 100;
                      const aWidth = Math.max((anim.duration / duration) * 100, 2);
                      const AnimIcon = meta.Icon;
                      return (
                        <div
                          key={`anim-${ai}`}
                          className="cpe-tl-row cpe-tl-anim-row"
                          style={{ height: ANIM_ROW_HEIGHT }}
                        >
                          <div
                            className="cpe-tl-anim-header"
                            style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH }}
                          >
                            <span className="cpe-tl-indent" />
                            <span className="cpe-tl-indent" />
                            <AnimIcon className="w-3 h-3 cpe-tl-anim-icon" />
                            <span className="cpe-tl-anim-label">{meta.label} — {anim.type}</span>
                          </div>
                          <div className="cpe-tl-lane" style={{ width: laneWidth }}>
                            <div
                              className={`cpe-track-clip ${meta.cls} cpe-anim-clip`}
                              style={{ left: `${aLeft}%`, width: `${aWidth}%` }}
                              title={`${meta.label}: ${anim.type} @ ${fmt(anim.start)}`}
                            >
                              <AnimIcon className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="cpe-clip-label">{anim.type}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}

        {/* Empty state */}
        {!hasTimedElements && (
          <div className="cpe-tl-empty">
            <p className="cpe-empty-text">No timed elements on this slide.</p>
            <button className="cpe-tool-btn text-xs">
              <Plus className="w-3 h-3" /> Add Animation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}