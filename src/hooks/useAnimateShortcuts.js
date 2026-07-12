import { useEffect } from 'react';

/**
 * WMS-002 Animate Mode — Keyboard Shortcuts
 *
 * Registers capture-phase keydown listeners so animate-mode shortcuts
 * intercept before the editor's default element-movement handler.
 *
 * Shortcuts:
 *   Space        → Play / Pause
 *   J            → Previous Keyframe (skip back 500ms)
 *   K            → Pause
 *   L            → Next Keyframe (skip forward 500ms)
 *   Arrow Keys   → Move Playhead (1 frame)
 *   Shift+Arrow  → Jump 5 seconds
 *   Ctrl/Cmd+K   → Split Animation
 *   Ctrl/Cmd+D   → Duplicate Animation
 *   Ctrl/Cmd+Z   → Undo
 *   Ctrl/Cmd+Shift+Z → Redo
 */
export function useAnimateShortcuts({
  active,
  isPlaying,
  onPlay,
  onPause,
  onScrub,
  currentTime,
  totalTime,
  onFrameStepForward,
  onFrameStepBackward,
  onSplit,
  onDuplicate,
  onUndo,
  onRedo,
}) {
  useEffect(() => {
    if (!active) return;

    const FRAME_MS = 1000 / 30;

    const handler = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput && e.key !== 'Escape') return;

      // Ctrl/Cmd combinations
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          e.stopPropagation();
          onSplit?.();
          return;
        }
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          e.stopPropagation();
          onDuplicate?.();
          return;
        }
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          onUndo?.();
          return;
        }
        if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          onRedo?.();
          return;
        }
        return; // let other Ctrl combos pass through
      }

      // Space → Play / Pause
      if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (isPlaying) onPause?.();
        else onPlay?.();
        return;
      }

      // J → Previous keyframe (skip back 500ms)
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        onScrub?.(Math.max(0, currentTime - 500));
        return;
      }

      // K → Pause
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        e.stopPropagation();
        onPause?.();
        return;
      }

      // L → Next keyframe (skip forward 500ms)
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        e.stopPropagation();
        onScrub?.(Math.min(totalTime, currentTime + 500));
        return;
      }

      // Arrow Keys → Move Playhead
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          onScrub?.(Math.max(0, currentTime - 5000));
        } else {
          onFrameStepBackward?.();
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          onScrub?.(Math.min(totalTime, currentTime + 5000));
        } else {
          onFrameStepForward?.();
        }
        return;
      }
      // Arrow Up/Down → Jump to start/end
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        onScrub?.(0);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        onScrub?.(totalTime);
        return;
      }
    };

    // Capture phase — intercepts before bubble-phase element movement handler
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [
    active, isPlaying, currentTime, totalTime,
    onPlay, onPause, onScrub, onFrameStepForward, onFrameStepBackward,
    onSplit, onDuplicate, onUndo, onRedo,
  ]);
}