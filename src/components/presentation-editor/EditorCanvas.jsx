import React, { useRef, useCallback, useState } from 'react';
import CanvasViewport from './CanvasViewport';
import BackgroundLayer from './BackgroundLayer';
import CanvasItem from './CanvasItem';
import SmartGuideLayer from './SmartGuideLayer';
import MarqueeSelection from './MarqueeSelection';
import CanvasToolbar from './CanvasToolbar';
import SafeAreaLayer from './SafeAreaLayer';
import { CANVAS_W, CANVAS_H, calculateSnapGuides } from '@/lib/canvasUtils';

export default function EditorCanvas({
  slide, elements, selectedIds, selectedId,
  zoom, zoomMode, panX, panY,
  mode, isPlaying, currentTime,
  showGrid, showSafeAreas, showGuides, snapEnabled,
  onSelect, onToggleSelect, onUpdate, onDelete,
  onViewportChange, onZoomModeChange,
  onZoomIn, onZoomOut, onZoomFit, onZoom100,
  onToggleGrid, onToggleSafeAreas, onToggleGuides, onToggleSnap,
}) {
  const previewMode = mode === 'preview';
  const sorted = [...(elements || [])].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  const slideStageRef = useRef(null);
  const [activeGuides, setActiveGuides] = useState([]);

  const handleDragGuides = useCallback((dragRect, excludeId) => {
    if (!dragRect) { setActiveGuides([]); return { snapX: 0, snapY: 0 }; }
    if (previewMode) return { snapX: 0, snapY: 0 };
    const { guides, snapX, snapY } = calculateSnapGuides(dragRect, elements || [], excludeId, snapEnabled);
    if (showGuides) {
      setActiveGuides(guides);
    } else {
      setActiveGuides([]);
    }
    return { snapX, snapY };
  }, [elements, previewMode, snapEnabled, showGuides]);

  return (
    <div className="cpe-canvas-area flex-1 flex flex-col overflow-hidden">
      <CanvasToolbar
        slide={slide}
        zoom={zoom}
        mode={mode}
        showGrid={showGrid}
        showSafeAreas={showSafeAreas}
        showGuides={showGuides}
        snapEnabled={snapEnabled}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomFit={onZoomFit}
        onZoom100={onZoom100}
        onToggleGrid={onToggleGrid}
        onToggleSafeAreas={onToggleSafeAreas}
        onToggleGuides={onToggleGuides}
        onToggleSnap={onToggleSnap}
      />

      <CanvasViewport
        zoom={zoom}
        panX={panX}
        panY={panY}
        zoomMode={zoomMode}
        onViewportChange={onViewportChange}
        onZoomModeChange={onZoomModeChange}
        previewMode={previewMode}
      >
        <div
          ref={slideStageRef}
          className="cpe-slide-frame relative overflow-hidden"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          <BackgroundLayer slide={slide} />

          {!previewMode && (
            <MarqueeSelection
              elements={elements}
              onSelect={onSelect}
              zoom={zoom}
              slideStageRef={slideStageRef}
              previewMode={previewMode}
            />
          )}

          {sorted.map(el => (
            <CanvasItem
              key={el.id}
              element={el}
              isSelected={selectedIds?.includes(el.id)}
              zoom={zoom}
              previewMode={previewMode}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onSelect={onSelect}
              onToggleSelect={onToggleSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onDragGuides={handleDragGuides}
              snapEnabled={!previewMode}
            />
          ))}

          {!previewMode && showGuides && <SmartGuideLayer guides={activeGuides} />}
          {!previewMode && (showGrid || showSafeAreas) && (
            <SafeAreaLayer showGrid={showGrid} showSafeAreas={showSafeAreas} />
          )}

          {sorted.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
              {previewMode ? 'No content' : 'Use "Add" in the toolbar to insert elements'}
            </div>
          )}


        </div>
      </CanvasViewport>
    </div>
  );
}