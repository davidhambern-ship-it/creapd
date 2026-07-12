import React, { useState } from 'react';
import {
  MousePointer2, Scissors, Copy, Trash2, Waves, Grid3x3, Magnet,
  Maximize2, Minimize2, ChevronsDownUp, ChevronsUpDown,
  ZoomIn, ZoomOut, SkipBack, SkipForward, Repeat,
  ChevronLeft, ChevronRight, Filter, Search, Flag, SquareDashed,
  ChevronDown,
} from 'lucide-react';
import { TRACK_FILTERS, MARKER_TYPES } from '@/lib/animationPresets';

export default function TimelineToolbar({
  rippleEnabled, onToggleRipple,
  snapEnabled, onToggleSnap,
  magnetEnabled, onToggleMagnet,
  trackHeight, onTrackHeightChange,
  onExpandAll, onCollapseAll,
  timelineZoom, onTimelineZoomChange,
  onJumpToStart, onJumpToEnd,
  loopEnabled, onToggleLoop,
  onFrameStepForward, onFrameStepBackward,
  searchQuery, onSearchChange,
  trackFilter, onTrackFilterChange,
  onAddMarker,
}) {
  const [markerOpen, setMarkerOpen] = useState(false);

  const heightIcon = trackHeight === 'tall' ? Maximize2 : trackHeight === 'compact' ? Minimize2 : Maximize2;
  const HeightIcon = heightIcon;

  return (
    <div className="cpe-tl-toolbar-bar">
      {/* ── Edit Tools ── */}
      <div className="cpe-tl-tool-group">
        <button className="cpe-tl-tool-btn active" title="Selection Tool">
          <MousePointer2 className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" title="Split" onClick={() => {}}>
          <Scissors className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" title="Duplicate" onClick={() => {}}>
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" title="Delete" onClick={() => {}}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="cpe-tl-tool-sep" />

      {/* ── Toggle Tools ── */}
      <div className="cpe-tl-tool-group">
        <button
          className={`cpe-tl-tool-btn ${rippleEnabled ? 'active' : ''}`}
          onClick={onToggleRipple}
          title="Ripple Toggle"
        >
          <Waves className="w-3.5 h-3.5" />
        </button>
        <button
          className={`cpe-tl-tool-btn ${snapEnabled ? 'active' : ''}`}
          onClick={onToggleSnap}
          title="Snap Toggle"
        >
          <Grid3x3 className="w-3.5 h-3.5" />
        </button>
        <button
          className={`cpe-tl-tool-btn ${magnetEnabled ? 'active' : ''}`}
          onClick={onToggleMagnet}
          title="Magnet Toggle"
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="cpe-tl-tool-sep" />

      {/* ── Track Tools ── */}
      <div className="cpe-tl-tool-group">
        <button
          className="cpe-tl-tool-btn"
          onClick={onTrackHeightChange}
          title="Track Height"
        >
          <HeightIcon className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" onClick={onExpandAll} title="Expand All">
          <ChevronsDownUp className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" onClick={onCollapseAll} title="Collapse All">
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="cpe-tl-tool-sep" />

      {/* ── Timeline Zoom ── */}
      <div className="cpe-tl-tool-group">
        <button className="cpe-tl-tool-btn" onClick={() => onTimelineZoomChange(Math.max(0.25, timelineZoom - 0.25))} title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="cpe-tl-zoom-display">{Math.round(timelineZoom * 100)}%</span>
        <button className="cpe-tl-tool-btn" onClick={() => onTimelineZoomChange(Math.min(4, timelineZoom + 0.25))} title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="cpe-tl-tool-sep" />

      {/* ── Navigation ── */}
      <div className="cpe-tl-tool-group">
        <button className="cpe-tl-tool-btn" onClick={onJumpToStart} title="Jump to Start">
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" onClick={onFrameStepBackward} title="Frame Step Backward">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" onClick={onFrameStepForward} title="Frame Step Forward">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-tl-tool-btn" onClick={onJumpToEnd} title="Jump to End">
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        <button
          className={`cpe-tl-tool-btn ${loopEnabled ? 'active' : ''}`}
          onClick={onToggleLoop}
          title="Loop Playback"
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="cpe-tl-tool-sep" />

      {/* ── Markers ── */}
      <div className="cpe-tl-tool-group relative">
        <button className="cpe-tl-tool-btn" onClick={() => setMarkerOpen(!markerOpen)} title="Add Marker">
          <Flag className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
        {markerOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMarkerOpen(false)} />
            <div className="cpe-tl-marker-dropdown">
              {MARKER_TYPES.map(m => (
                <button
                  key={m.type}
                  className="cpe-tl-marker-item"
                  onClick={() => { onAddMarker?.(m); setMarkerOpen(false); }}
                >
                  <span className="cpe-tl-marker-dot" style={{ background: m.color }} />
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}
        <button className="cpe-tl-tool-btn" title="Add Region" onClick={() => {}}>
          <SquareDashed className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1" />

      {/* ── Track Filter + Search ── */}
      <div className="cpe-tl-tool-group">
        <div className="cpe-tl-filter-select">
          <Filter className="w-3 h-3" />
          <select value={trackFilter} onChange={(e) => onTrackFilterChange(e.target.value)}>
            {TRACK_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="cpe-tl-search">
          <Search className="w-3 h-3" />
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}