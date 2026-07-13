import React, { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePresentationEditor } from '@/hooks/usePresentationEditor';
import { useAutoBuild } from '@/hooks/useAutoBuild';
import { useCpeAiWorkers } from '@/hooks/useCpeAiWorkers';
import { useWorkspaceMode } from '@/hooks/useWorkspaceMode';
import EditorTopBar from '@/components/presentation-editor/EditorTopBar';
import SlideRail from '@/components/presentation-editor/SlideRail';
import EditorCanvas from '@/components/presentation-editor/EditorCanvas';
import PropertiesPanel from '@/components/presentation-editor/PropertiesPanel';
import TransportBar from '@/components/presentation-editor/TransportBar';
import AutoBuildModal from '@/components/presentation-editor/AutoBuildModal';
import CpeAiPanel from '@/components/presentation-editor/CpeAiPanel';
import ReviewPanel from '@/components/presentation-editor/ReviewPanel';
import ScriptPanel from '@/components/presentation-editor/ScriptPanel';
import MediaBrowserPanel from '@/components/presentation-editor/MediaBrowserPanel';
import PresentRehearsalBar from '@/components/presentation-editor/PresentRehearsalBar';
import PresentationPlayer from '@/components/presentation/PresentationPlayer';
import AnimationInspector from '@/components/presentation-editor/AnimationInspector';
import MediaModeLayout from '@/components/presentation-editor/media/MediaModeLayout';
import { useAnimateShortcuts } from '@/hooks/useAnimateShortcuts';
import '@/components/presentation-editor/cpe.css';
import '@/components/presentation-editor/workspace.css';

export default function PresentationEditor() {
  const { id } = useParams();
  const ed = usePresentationEditor(id);
  const autoBuild = useAutoBuild();
  const { workspaceMode, changeMode, config: wsConfig } = useWorkspaceMode();
  const aiWorkers = useCpeAiWorkers(ed);

  const handleWorkspaceChange = useCallback((mode) => {
    changeMode(mode);
  }, [changeMode]);

  // Animate Mode keyboard shortcuts
  useAnimateShortcuts({
    active: workspaceMode === 'animate',
    isPlaying: ed.isPlaying,
    onPlay: ed.play,
    onPause: ed.pause,
    onScrub: ed.scrub,
    currentTime: ed.currentTime,
    totalTime: ed.totalTime,
    onFrameStepForward: ed.frameStepForward,
    onFrameStepBackward: ed.frameStepBackward,
    onSplit: () => {},
    onDuplicate: () => ed.selectedId && ed.duplicateElement(ed.selectedId),
    onUndo: ed.undo,
    onRedo: ed.redo,
  });

  const aiPanelOpen = workspaceMode === 'ai';
  const reviewPanelOpen = workspaceMode === 'review';

  const renderSidePanel = () => {
    switch (wsConfig.sidePanel) {
      case 'inspector':
        return (
          <PropertiesPanel
            presentation={ed.presentation}
            slide={ed.activeSlide}
            selectedId={ed.selectedId}
            selectedElement={ed.selectedElement}
            selectedElements={ed.selectedElements}
            zoom={ed.zoom}
            onUpdatePresentation={ed.updatePresentation}
            onUpdateSlide={ed.updateSlide}
            onUpdateElement={ed.updateElement}
            onDeleteElement={ed.deleteElement}
            onRegenerateElement={ed.regenerateElement}
            onDuplicateElement={ed.duplicateElement}
            onBringForward={ed.bringForward}
            onSendBackward={ed.sendBackward}
            onDuplicateSlide={ed.duplicateSlide}
            onDeleteSlide={ed.deleteSlide}
            onMoveSlideForward={() => ed.selectSlide(Math.min(ed.activeIndex + 1, ed.slides.length - 1))}
            onMoveSlideBackward={() => ed.selectSlide(Math.max(ed.activeIndex - 1, 0))}
            onCopy={ed.copyElement}
            onCut={ed.cutElement}
            onPaste={ed.pasteElement}
            onAlign={ed.alignElements}
            onDistribute={ed.distributeElements}
            onZoom={ed.setZoom}
          />
        );
      case 'media':
        return (
          <MediaBrowserPanel
            elements={ed.elements}
            slide={ed.activeSlide}
            onAddElement={ed.addElement}
            onSelectElement={ed.setSelectedId}
            selectedId={ed.selectedId}
          />
        );
      case 'script':
        return (
          <ScriptPanel
            slide={ed.activeSlide}
            presentation={ed.presentation}
            onUpdateSlide={ed.updateSlide}
          />
        );
      case 'animation':
        return ed.activeSlide ? (
          <AnimationInspector
            element={ed.selectedElement}
            slideDuration={ed.slideDuration}
            onUpdate={ed.updateElement}
            onDuplicate={ed.duplicateElement}
            onDelete={ed.deleteElement}
          />
        ) : null;
      case 'review':
        return ed.presentation ? (
          <ReviewPanel
            presentation={ed.presentation}
            onClose={() => handleWorkspaceChange('design')}
            onApprove={ed.approvePresentation}
            onReject={ed.rejectPresentation}
            onShare={ed.shareToCreapd}
            onExportMP4={ed.exportMP4}
            onRegenerate={ed.regeneratePresentation}
            approving={ed.approving}
            sharing={ed.sharing}
            exporting={ed.exportingMP4}
            regenerating={ed.regeneratingPres}
            exportJob={ed.exportJob}
            shareResult={ed.shareResult}
          />
        ) : null;
      case 'ai':
        return (
          <CpeAiPanel aiWorkers={aiWorkers} onClose={() => handleWorkspaceChange('design')} />
        );
      default:
        return null;
    }
  };

  // Present mode overlay
  if (ed.presenting && ed.activeSlide) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center cpe-shell"
        onClick={() => ed.setPresenting(false)}>
        <button className="absolute top-4 right-4 text-white/60 hover:text-white text-sm z-10">Exit</button>
        <div className="w-[80vw] aspect-video rounded-lg overflow-hidden cpe-slide-frame"
          style={{ background: (() => { try { return JSON.parse(ed.activeSlide.background || '{}').color || '#0a0a0a'; } catch { return '#0a0a0a'; } })() }}>
          <div className="p-12">
            <h1 className="text-4xl font-bold text-white mb-4">{ed.activeSlide.title}</h1>
            <p className="text-xl text-white/80 whitespace-pre-wrap">{ed.activeSlide.body_text}</p>
          </div>
        </div>
      </div>
    );
  }

  if (ed.loading) {
    return (
      <div className="cpe-loading-overlay">
        <div className="cpe-loading-spinner" />
        <p className="cpe-loading-text">Loading presentation studio…</p>
      </div>
    );
  }

  if (!ed.presentation) {
    return (
      <div className="cpe-loading-overlay">
        <div className="cpe-empty">
          <p className="cpe-empty-text">Presentation not found</p>
          {ed.loadError && (
            <p className="text-xs text-muted-foreground mt-2 max-w-md">{ed.loadError}</p>
          )}
          {id && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          )}
          <Link
            to="/news/presentations"
            className="mt-2 text-sm text-primary hover:underline"
          >
            Browse Presentations →
          </Link>
        </div>
      </div>
    );
  }

  // Media Mode renders a full DAM workspace, replacing the standard editor layout
  if (workspaceMode === 'media') {
    return (
      <div className="cpe-shell flex flex-col h-screen">
        <EditorTopBar
          saving={ed.saving}
          dirty={ed.dirty}
          canUndo={ed.undoStack.length > 0}
          canRedo={ed.redoStack.length > 0}
          hasSelection={!!ed.selectedElement}
          title={ed.presentation.title}
          onSave={ed.saveAll}
          onUndo={ed.undo}
          onRedo={ed.redo}
          onExport={ed.exportPresentation}
          onRegenerateSlide={ed.regenerateSlide}
          onRegenerateElement={ed.regenerateElement}
          onRunQA={ed.runQA}
          onAddElement={ed.addElement}
          onAutoBuild={autoBuild.open}
          onToggleAiPanel={() => handleWorkspaceChange(aiPanelOpen ? 'design' : 'ai')}
          aiPanelOpen={aiPanelOpen}
          onToggleReviewPanel={() => handleWorkspaceChange(reviewPanelOpen ? 'design' : 'review')}
          reviewPanelOpen={reviewPanelOpen}
          workspaceMode={workspaceMode}
          onWorkspaceModeChange={handleWorkspaceChange}
          _debugElements={ed.elements?.length}
          _debugWorkspaceMode={workspaceMode}
          _debugFirstEl={ed.elements?.[0]}
        />
        <MediaModeLayout ed={ed} />
        <AutoBuildModal
          isOpen={autoBuild.isOpen}
          onClose={autoBuild.close}
          prompt={autoBuild.prompt}
          onPromptChange={autoBuild.setPrompt}
          stages={autoBuild.stages}
          stageStatuses={autoBuild.stageStatuses}
          detail={autoBuild.detail}
          error={autoBuild.error}
          failedStage={autoBuild.failedStage}
          onRetry={autoBuild.retry}
          running={autoBuild.running}
          needsConfirmation={autoBuild.needsConfirmation}
          clarificationQuestion={autoBuild.clarificationQuestion}
          inferredParams={autoBuild.inferredParams}
          onStart={autoBuild.start}
          onConfirmProceed={autoBuild.confirmAndProceed}
        />
      </div>
    );
  }

  return (
    <div className="cpe-shell flex flex-col h-screen">
      <EditorTopBar
        saving={ed.saving}
        dirty={ed.dirty}
        canUndo={ed.undoStack.length > 0}
        canRedo={ed.redoStack.length > 0}
        hasSelection={!!ed.selectedElement}
        title={ed.presentation.title}
        onSave={ed.saveAll}
        onUndo={ed.undo}
        onRedo={ed.redo}
        onExport={ed.exportPresentation}
        onRegenerateSlide={ed.regenerateSlide}
        onRegenerateElement={ed.regenerateElement}
        onRunQA={ed.runQA}
        onAddElement={ed.addElement}
        onAutoBuild={autoBuild.open}
        onToggleAiPanel={() => handleWorkspaceChange(aiPanelOpen ? 'design' : 'ai')}
        aiPanelOpen={aiPanelOpen}
        onToggleReviewPanel={() => handleWorkspaceChange(reviewPanelOpen ? 'design' : 'review')}
        reviewPanelOpen={reviewPanelOpen}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={handleWorkspaceChange}
        _debugElements={ed.elements?.length}
        _debugWorkspaceMode={workspaceMode}
        _debugFirstEl={ed.elements?.[0]}
      />

      <div className="flex flex-1 overflow-hidden">
        {wsConfig.showSlideRail && (
          <SlideRail
            slides={ed.slides}
            activeIndex={ed.activeIndex}
            onSelect={ed.selectSlide}
            onAdd={ed.addSlide}
            onDuplicate={ed.duplicateSlide}
            onDelete={ed.deleteSlide}
            onReorder={ed.reorderSlides}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div style={{ flex: wsConfig.canvasFlex }} className="overflow-hidden min-h-0 relative">
            {/* TEMP DEBUG: canvas container probe */}
            <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-mono z-[9999] pointer-events-none">
              CANVAS CONTAINER | zoom={ed.zoom} panX={ed.panX} panY={ed.panY} zoomMode={ed.zoomMode}
            </div>
            {/* END TEMP DEBUG */}
            <EditorCanvas
              slide={ed.activeSlide}
              elements={ed.elements}
              selectedIds={ed.selectedIds}
              selectedId={ed.selectedId}
              zoom={ed.zoom}
              zoomMode={ed.zoomMode}
              panX={ed.panX}
              panY={ed.panY}
              mode={workspaceMode === 'present' ? 'preview' : ed.mode}
              isPlaying={ed.isPlaying}
              currentTime={ed.currentTime}
              showGrid={ed.showGrid}
              showSafeAreas={ed.showSafeAreas}
              showGuides={ed.showGuides}
              snapEnabled={ed.snapEnabled}
              onSelect={ed.setSelectedIds}
              onToggleSelect={ed.toggleSelection}
              onUpdate={ed.updateElement}
              onDelete={ed.deleteElement}
              onViewportChange={ed.setViewport}
              onZoomModeChange={ed.setZoomMode}
              onZoomIn={ed.zoomIn}
              onZoomOut={ed.zoomOut}
              onZoomFit={ed.zoomFit}
              onZoom100={ed.zoom100}
              onToggleGrid={() => ed.setShowGrid(v => !v)}
              onToggleSafeAreas={() => ed.setShowSafeAreas(v => !v)}
              onToggleGuides={() => ed.setShowGuides(v => !v)}
              onToggleSnap={() => ed.setSnapEnabled(v => !v)}
            />
          </div>

          {workspaceMode === 'present' ? (
            <PresentRehearsalBar
              isPlaying={ed.isPlaying}
              currentTime={ed.currentTime}
              totalTime={ed.totalTime}
              onPlay={ed.play}
              onPause={ed.pause}
              onPrev={() => { if (ed.activeIndex > 0) ed.selectSlide(ed.activeIndex - 1); }}
              onNext={() => { if (ed.activeIndex < ed.slides.length - 1) ed.selectSlide(ed.activeIndex + 1); }}
              slide={ed.activeSlide}
              slides={ed.slides}
              activeIndex={ed.activeIndex}
            />
          ) : wsConfig.timelineMode !== 'hidden' ? (
            <div style={{ flex: wsConfig.timelineFlex, minHeight: 0 }} className="overflow-hidden">
              <TransportBar
                isPlaying={ed.isPlaying}
                currentTime={ed.currentTime}
                totalTime={ed.totalTime}
                scope={ed.scope}
                onPlay={ed.play}
                onPause={ed.pause}
                onStop={ed.stop}
                onRestart={ed.restart}
                onPrev={() => { if (ed.activeIndex > 0) ed.selectSlide(ed.activeIndex - 1); }}
                onNext={() => { if (ed.activeIndex < ed.slides.length - 1) ed.selectSlide(ed.activeIndex + 1); }}
                onScrub={ed.scrub}
                onScopeChange={ed.setScope}
                slide={ed.activeSlide}
                elements={ed.elements}
                onUpdateElement={ed.updateElement}
                onSelectElement={ed.setSelectedId}
                selectedId={ed.selectedId}
                timelineMode={wsConfig.timelineMode}
                playbackSpeed={ed.playbackSpeed}
                setPlaybackSpeed={ed.setPlaybackSpeed}
                loop={ed.loop}
                setLoop={ed.setLoop}
                onFrameStepForward={ed.frameStepForward}
                onFrameStepBackward={ed.frameStepBackward}
              />
            </div>
          ) : null}
        </div>

        {wsConfig.sidePanel !== 'none' && wsConfig.sidePanelWidth > 0 && (
          <div style={{ width: wsConfig.sidePanelWidth }} className="overflow-hidden flex-shrink-0 cpe-ws-side-panel">
            {renderSidePanel()}
          </div>
        )}
      </div>

      <AutoBuildModal
        isOpen={autoBuild.isOpen}
        onClose={autoBuild.close}
        prompt={autoBuild.prompt}
        onPromptChange={autoBuild.setPrompt}
        stages={autoBuild.stages}
        stageStatuses={autoBuild.stageStatuses}
        detail={autoBuild.detail}
        error={autoBuild.error}
        failedStage={autoBuild.failedStage}
        onRetry={autoBuild.retry}
        running={autoBuild.running}
        needsConfirmation={autoBuild.needsConfirmation}
        clarificationQuestion={autoBuild.clarificationQuestion}
        inferredParams={autoBuild.inferredParams}
        onStart={autoBuild.start}
        onConfirmProceed={autoBuild.confirmAndProceed}
      />
    </div>
  );
}