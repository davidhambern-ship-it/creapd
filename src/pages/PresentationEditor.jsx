import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePresentationEditor } from '@/hooks/usePresentationEditor';
import { useAutoBuild } from '@/hooks/useAutoBuild';
import { useCpeAiWorkers } from '@/hooks/useCpeAiWorkers';
import EditorTopBar from '@/components/presentation-editor/EditorTopBar';
import SlideRail from '@/components/presentation-editor/SlideRail';
import EditorCanvas from '@/components/presentation-editor/EditorCanvas';
import PropertiesPanel from '@/components/presentation-editor/PropertiesPanel';
import TransportBar from '@/components/presentation-editor/TransportBar';
import AutoBuildModal from '@/components/presentation-editor/AutoBuildModal';
import CpeAiPanel from '@/components/presentation-editor/CpeAiPanel';
import ReviewPanel from '@/components/presentation-editor/ReviewPanel';
import PresentationPlayer from '@/components/presentation/PresentationPlayer';
import '@/components/presentation-editor/cpe.css';

export default function PresentationEditor() {
  const { id } = useParams();
  const ed = usePresentationEditor(id);
  const autoBuild = useAutoBuild();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const aiWorkers = useCpeAiWorkers(ed);

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

  return (
    <div className="cpe-shell flex flex-col h-screen">
      <EditorTopBar
        saving={ed.saving}
        dirty={ed.dirty}
        canUndo={ed.undoStack.length > 0}
        canRedo={ed.redoStack.length > 0}
        hasSelection={!!ed.selectedElement}
        title={ed.presentation.title}
        mode={ed.mode}
        onSave={ed.saveAll}
        onUndo={ed.undo}
        onRedo={ed.redo}
        onToggleMode={ed.setMode}
        onExport={ed.exportPresentation}
        onRegenerateSlide={ed.regenerateSlide}
        onRegenerateElement={ed.regenerateElement}
        onRunQA={ed.runQA}
        onAddElement={ed.addElement}
        onAutoBuild={autoBuild.open}
        onToggleAiPanel={() => setAiPanelOpen(v => !v)}
        aiPanelOpen={aiPanelOpen}
        onToggleReviewPanel={() => setReviewPanelOpen(v => !v)}
        reviewPanelOpen={reviewPanelOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <SlideRail
          slides={ed.slides}
          activeIndex={ed.activeIndex}
          onSelect={ed.selectSlide}
          onAdd={ed.addSlide}
          onDuplicate={ed.duplicateSlide}
          onDelete={ed.deleteSlide}
          onReorder={ed.reorderSlides}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {ed.mode === 'preview' && ed.slides.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-4">
              <PresentationPlayer
                storySlides={ed.slides}
                aspectRatio={ed.presentation.aspect_ratio || (() => { try { return JSON.parse(ed.presentation.playback_settings || '{}').aspect_ratio; } catch { return '16:9'; } })()}
              />
            </div>
          ) : (
            <>
              <EditorCanvas
                slide={ed.activeSlide}
                elements={ed.elements}
                selectedIds={ed.selectedIds}
                selectedId={ed.selectedId}
                zoom={ed.zoom}
                zoomMode={ed.zoomMode}
                panX={ed.panX}
                panY={ed.panY}
                mode={ed.mode}
                isPlaying={ed.isPlaying}
                currentTime={ed.currentTime}
                showGrid={ed.showGrid}
                showSafeAreas={ed.showSafeAreas}
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
              />

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
              />
            </>
          )}
        </div>

        {ed.mode === 'edit' && (
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
        )}

        {aiPanelOpen && (
          <CpeAiPanel aiWorkers={aiWorkers} onClose={() => setAiPanelOpen(false)} />
        )}

        {reviewPanelOpen && ed.presentation && (
          <ReviewPanel
            presentation={ed.presentation}
            onClose={() => setReviewPanelOpen(false)}
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